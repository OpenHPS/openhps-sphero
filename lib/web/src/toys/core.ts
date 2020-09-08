import { factory } from '../commands';
import { factory as decodeFactory, number } from '../commands/decoder';
import {
  DeviceId,
  DriveFlag,
  ICommandWithRaw,
  SensorCommandIds
} from '../commands/types';

import { Queue } from './queue';
import {
  CharacteristicUUID,
  Stance,
  SensorMaskValues,
  SensorControlDefaults,
  APIVersion,
  ISensorMaskRaw,
  ServicesUUID
} from './types';
import { sensorValuesToRaw, flatSensorMask, parseSensorEvent } from './utils';

// WORKAROUND for https://github.com/Microsoft/TypeScript/issues/5711
export interface IReExport {
  a: Stance;
  b: DriveFlag;
}

// TS workaround until 2.8 (not released), then ReturnType<factory>
export const commandsType = (false as true) && factory();
export const decodeType = (false as true) && decodeFactory(_ => null);

export interface IQueuePayload {
  command: ICommandWithRaw;
  characteristic?: BluetoothRemoteGATTCharacteristic;
}

export enum Event {
  onCollision = 'onCollision',
  onSensor = 'onSensor'
}

type EventMap = { [key in Event]?: (args: any) => void };

export class Core {
  // Override in child class to get right percent
  protected maxVoltage: number = 0;
  protected minVoltage: number = 1;
  protected apiVersion: APIVersion = APIVersion.V2;

  protected commands: typeof commandsType;
  private peripheral: BluetoothDevice;
  private server: BluetoothRemoteGATTServer;
  private apiV2Characteristic?: BluetoothRemoteGATTCharacteristic;
  private dfuControlCharacteristic?: BluetoothRemoteGATTCharacteristic;
  private subsCharacteristic?: BluetoothRemoteGATTCharacteristic;
  private antiDoSCharacteristic?: BluetoothRemoteGATTCharacteristic;
  private decoder: typeof decodeType;
  private started: boolean;
  private queue: Queue<IQueuePayload>;
  private eventsListeners: EventMap;
  private sensorMask: ISensorMaskRaw = {
    v2: [],
    v21: []
  };

  constructor(p: BluetoothDevice) {
    this.peripheral = p;
  }

  /**
   * Determines and returns the current battery charging state
   */
  public async batteryVoltage() {
    const response = await this.queueCommand(
      this.commands.power.batteryVoltage()
    );
    return number(response.command.payload, 1) / 100;
  }

  /**
   * returns battery level from [0, 1] range.
   * Child class must implement max voltage and min voltage to get
   * correct %
   */
  public async batteryLevel(): Promise<number> {
    const voltage = await this.batteryVoltage();
    const percent =
      (voltage - this.minVoltage) / (this.maxVoltage - this.minVoltage);
    return percent > 1 ? 1 : percent;
  }

  /**
   * Wakes up the toy from sleep mode
   */
  public wake() {
    return this.queueCommand(this.commands.power.wake());
  }

  /**
   * Sets the to into sleep mode
   */
  public sleep() {
    return this.queueCommand(this.commands.power.sleep());
  }

  /**
   * Starts the toy
   */
  public async start() {
    // start
    await this.init();
    await this.write(this.antiDoSCharacteristic, 'usetheforce...band');
    this.started = true;
    try {
      await this.wake();
    } catch (e) {
      // tslint:disable-next-line:no-console
      console.error('error', e);
    }
  }

  /**
   * Determines and returns the system app version of the toy
   */
  public async appVersion() {
    const response = await this.queueCommand(
      this.commands.systemInfo.appVersion()
    );
    return {
      major: number(response.command.payload, 1),
      minor: number(response.command.payload, 3)
    };
  }

  public on(eventName: Event, handler: (command: ICommandWithRaw) => void) {
    this.eventsListeners[eventName] = handler;
  }

  public destroy(): void {
    this.eventsListeners = {}; // remove references
    this.peripheral.gatt.disconnect();
  }

  public async configureSensorStream(interval?: number): Promise<void> {
    const sensorMask = [
      SensorMaskValues.accelerometer,
      SensorMaskValues.orientation,
      SensorMaskValues.locator,
      SensorMaskValues.gyro
    ];
    // save it so on response we can parse it
    this.sensorMask = sensorValuesToRaw(sensorMask, this.apiVersion);

    await this.queueCommand(
      this.commands.sensor.sensorMask(
        flatSensorMask(this.sensorMask.v2),
        interval ? interval : SensorControlDefaults.interval
      )
    );
    if (this.sensorMask.v21.length > 0) {
      await this.queueCommand(
        this.commands.sensor.sensorMaskExtended(
          flatSensorMask(this.sensorMask.v21)
        )
      );
    }
  }

  public enableCollisionDetection(): Promise<IQueuePayload> {
    return this.queueCommand(this.commands.sensor.enableCollisionAsync());
  }

  public configureCollisionDetection(
    xThreshold: number = 100,
    yThreshold: number = 100,
    xSpeed: number = 100,
    ySpeed: number = 100,
    deadTime: number = 10,
    method: number = 0x01
  ): Promise<IQueuePayload> {
    return this.queueCommand(
      this.commands.sensor.configureCollision(
        xThreshold,
        yThreshold,
        xSpeed,
        ySpeed,
        deadTime,
        method
      )
    );
  }

  protected queueCommand(command: ICommandWithRaw) {
    return this.queue.queue({
      characteristic: this.apiV2Characteristic,
      command
    });
  }

  private async init() {
    return new Promise(async (resolve, reject) => {
      this.queue = new Queue<IQueuePayload>({
        match: (cA, cB) => this.match(cA, cB),
        onExecute: item => this.onExecute(item)
      });
      this.eventsListeners = {};
      this.commands = factory();
      this.decoder = decodeFactory((error, packet) =>
        this.onPacketRead(error, packet)
      );
      this.started = false;
  
      this.server = await this.peripheral.gatt.connect();
      await this.bindServices();
      this.bindListeners();
      resolve();
    });
  }

  private async onExecute(item: IQueuePayload) {
    if (!this.started) {
      return;
    }
    await this.write(item.characteristic, item.command.raw);
  }

  private match(commandA: IQueuePayload, commandB: IQueuePayload) {
    return (
      commandA.command.deviceId === commandB.command.deviceId &&
      commandA.command.commandId === commandB.command.commandId &&
      commandA.command.sequenceNumber === commandB.command.sequenceNumber
    );
  }

  private bindServices(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.getPrimaryService(ServicesUUID.apiV2ControlService).then(async service => {
        this.apiV2Characteristic = await service.getCharacteristic(CharacteristicUUID.apiV2Characteristic);
        this.server.getPrimaryService(ServicesUUID.nordicDfuService).then(async service => {
          this.antiDoSCharacteristic = await service.getCharacteristic(CharacteristicUUID.antiDoSCharacteristic);
          this.dfuControlCharacteristic = await service.getCharacteristic(CharacteristicUUID.dfuControlCharacteristic);
          this.subsCharacteristic = await service.getCharacteristic(CharacteristicUUID.subsCharacteristic);
          resolve();
        });
      });
    });
  }

  private bindListeners() {
    this.apiV2Characteristic.startNotifications().then(() => {
      this.apiV2Characteristic.addEventListener('characteristicvaluechanged',
      (event: any) => {
        this.onApiRead(new Uint8Array(event.target.value.buffer));
      });
    });
    this.dfuControlCharacteristic.startNotifications().then(() => {
      this.dfuControlCharacteristic.addEventListener('characteristicvaluechanged',
      (_: any) => {
        this.onDFUControlNotify();
      });
    });
  }

  private onPacketRead(error: string, command: ICommandWithRaw) {
    if (error) {
    } else if (command.sequenceNumber === 255) {
      this.eventHandler(command);
    } else {
      this.queue.onCommandProcessed({ command });
    }
  }

  private eventHandler(command: ICommandWithRaw) {
    if (
      command.deviceId === DeviceId.sensor &&
      command.commandId === SensorCommandIds.collisionDetectedAsync
    ) {
      this.handleCollision(command);
    } else if (
      command.deviceId === DeviceId.sensor &&
      command.commandId === SensorCommandIds.sensorResponse
    ) {
      this.handleSensorUpdate(command);
    }
  }

  private handleCollision(command: ICommandWithRaw) {
    // TODO parse collision
    const handler = this.eventsListeners.onCollision;
    if (handler) {
      handler(command);
    }
  }

  private handleSensorUpdate(command: ICommandWithRaw) {
    const handler = this.eventsListeners.onSensor;
    if (handler) {
      const parsedEvent = parseSensorEvent(command.payload, this.sensorMask);
      handler(parsedEvent);
    }
  }

  private onApiRead(data: Uint8Array) {
    data.forEach(byte => this.decoder.add(byte));
  }

  private onDFUControlNotify() {
    return this.write(this.dfuControlCharacteristic, new Uint8Array([0x30]));
  }

  private write(c: BluetoothRemoteGATTCharacteristic, data: Uint8Array | string): Promise<void> {
    let buff = Buffer.from(data);
    return c.writeValue(buff);
  }
}
