import {
    SourceNode,
    LinearVelocity,
    Absolute2DPosition,
    AngularVelocity,
    Quaternion,
    AngleUnit,
    ReferenceSpace,
    Model,
    AngularVelocityUnit,
    LengthUnit,
    SourceNodeOptions,
    LinearVelocityUnit,
    Acceleration,
    TimeService,
    Orientation,
} from '@openhps/core';
import { SpheroDataObject, SpheroDataFrame } from '../data';
import { RollableToy, Event } from '../../lib/server/lib/dist';
import { ISensorResponse } from '../../lib/web/dist';

export class SpheroSensorSource<
    Out extends SpheroDataFrame,
    T extends RollableToy = RollableToy,
> extends SourceNode<Out> {
    public referenceSpace: ReferenceSpace;
    private _calibrated = false;
    protected options: SpheroSensorOptions;

    constructor(options?: SpheroSensorOptions<T>) {
        super(options);
        this._calibrated = this.options.skipCalibration;

        this.once('build', this._initSensors.bind(this));
    }

    public get toy(): RollableToy {
        const spheroObject = this.source as SpheroDataObject<T>;
        return spheroObject.toy;
    }

    private _initSensors(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.referenceSpace = new ReferenceSpace((this.graph as Model).referenceSpace);
            const spheroObject = this.source as SpheroDataObject<T>;
            spheroObject.toy.on(Event.onSensor, this._onSensorEvent.bind(this));
            if (!this.options.skipSensorConfiguration) {
                spheroObject.toy
                    .configureSensorStream(this.options.interval)
                    .then(() => {
                        resolve();
                    })
                    .catch(reject);
            } else {
                resolve();
            }
        });
    }

    private _onSensorEvent(event: ISensorResponse): void {
        if (!this._calibrated) {
            // Start orientation
            this.referenceSpace.rotation(
                Quaternion.fromEuler({
                    yaw: -event.angles.yaw,
                    pitch: -event.angles.pitch,
                    roll: -event.angles.roll,
                    unit: AngleUnit.DEGREE,
                }),
            );
            // Start origin should be (0, 0)
            this.referenceSpace.translation(-event.locator.position.x, -event.locator.position.y);
            // Apply axis rotation to match OpenHPS
            this._calibrated = true;
        }

        const spheroObject = this.source as SpheroDataObject<T>;
        const position = (spheroObject.getPosition() as Absolute2DPosition) || new Absolute2DPosition(0, 0);
        position.timestamp = TimeService.now();
        position.unit = LengthUnit.CENTIMETER;
        if (this.options.sensors.includes(SpheroSensor.VELOCITY)) {
            position.velocity.linear = new LinearVelocity(
                event.locator.velocity.x,
                event.locator.velocity.y,
                0,
                LinearVelocityUnit.CENTIMETER_PER_SECOND,
            );
        }
        if (this.options.sensors.includes(SpheroSensor.GYROSCOPE)) {
            position.velocity.angular = new AngularVelocity(
                event.gyro.filtered.x,
                event.gyro.filtered.y,
                event.gyro.filtered.z,
                AngularVelocityUnit.DEGREE_PER_SECOND,
            );
        }
        if (this.options.sensors.includes(SpheroSensor.LOCATION)) {
            position.unit = LengthUnit.CENTIMETER;
            position.x = event.locator.position.x;
            position.y = event.locator.position.y;
            position.orientation = Orientation.fromEuler({
                yaw: event.angles.yaw,
                pitch: event.angles.pitch,
                roll: event.angles.roll,
                unit: AngleUnit.DEGREE,
            });
        }
        spheroObject.setPosition(position, this.referenceSpace);

        // Clone the information to the sphero data frame
        const frame = new SpheroDataFrame(spheroObject);
        frame.angularVelocity = position.velocity.angular.clone();
        frame.linearVelocity = position.velocity.linear.clone();
        frame.relativeOrientation = position.orientation.clone();
        frame.linearAcceleration = new Acceleration(
            event.accelerometer.filtered.x,
            event.accelerometer.filtered.y,
            event.accelerometer.filtered.z,
        );
        frame.x = position.x;
        frame.y = position.y;
        this.push(frame as Out);
    }

    public onPull(): Promise<Out> {
        return new Promise((resolve) => {
            resolve(new SpheroDataFrame(this.source as SpheroDataObject<T>) as Out);
        });
    }
}

export interface SpheroSensorOptions<T extends RollableToy = RollableToy> extends SourceNodeOptions {
    source?: SpheroDataObject<T>;
    /**
     * Sensor refresh interval in miliseconds
     */
    interval?: number;
    /**
     * Sensors to get information for
     */
    sensors?: SpheroSensor[];
    /**
     * Specify if the calibration should be skipped
     */
    skipCalibration?: boolean;
    /**
     * Specify if the sensor interval configuration should be skipped
     */
    skipSensorConfiguration?: boolean;
}

export enum SpheroSensor {
    LOCATION,
    GYROSCOPE,
    ACCELEROMETER,
    VELOCITY,
}
