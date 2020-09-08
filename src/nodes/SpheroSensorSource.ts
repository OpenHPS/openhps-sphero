import {
    SourceNode,
    LinearVelocity,
    Absolute3DPosition,
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
} from '@openhps/core';
import { SpheroDataObject, SpheroDataFrame } from '../data';
import { RollableToy, Event } from 'spherov2.js-server';
import { ISensorResponse } from 'spherov2.js-web';

export class SpheroSensorSource<Out extends SpheroDataFrame, T extends RollableToy = RollableToy> extends SourceNode<
    Out
> {
    public referenceSpace: ReferenceSpace;
    private _calibrated = false;
    protected options: SpheroSensorOptions;

    constructor(source?: SpheroDataObject<T>, options?: SpheroSensorOptions) {
        super(source, options);
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
            spheroObject.toy
                .configureSensorStream()
                .then(() => {
                    spheroObject.toy.on(Event.onSensor, this._onSensorEvent.bind(this));
                    resolve();
                })
                .catch((ex) => {
                    reject(ex);
                });
        });
    }

    private _onSensorEvent(event: ISensorResponse): void {
        if (!this._calibrated) {
            // Start orientation
            this.referenceSpace.rotation(
                Quaternion.fromEuler({
                    yaw: event.angles.yaw,
                    pitch: event.angles.pitch,
                    roll: event.angles.roll,
                    unit: AngleUnit.DEGREE,
                }),
            );
            // Start origin should be (0, 0)
            this.referenceSpace.translation(-event.locator.position.x, -event.locator.position.y);
            // Apply axis rotation to match OpenHPS
            this._calibrated = true;
        }

        const spheroObject = this.source as SpheroDataObject<T>;
        const position = spheroObject.getPosition() as Absolute3DPosition | Absolute2DPosition;
        position.velocity.linear = new LinearVelocity(
            event.locator.velocity.x,
            event.locator.velocity.y,
            0,
            LinearVelocityUnit.CENTIMETER_PER_SECOND,
        );
        position.unit = LengthUnit.CENTIMETER;
        position.x = event.locator.position.x;
        position.y = event.locator.position.y;
        position.orientation = Quaternion.fromEuler({
            yaw: event.angles.yaw,
            pitch: event.angles.pitch,
            roll: event.angles.roll,
            unit: AngleUnit.DEGREE,
        });
        spheroObject.setPosition(position, this.referenceSpace);
        const frame = new SpheroDataFrame(spheroObject);
        frame.angularVelocity = new AngularVelocity(
            event.gyro.filtered.x,
            event.gyro.filtered.y,
            event.gyro.filtered.z,
            AngularVelocityUnit.DEGREE_PER_SECOND,
        );
        const pushPromises: Array<Promise<void>> = [];
        this.outputNodes.forEach((node) => {
            pushPromises.push(node.push(frame));
        });
        Promise.all(pushPromises);
    }

    public onPull(): Promise<Out> {
        return new Promise((resolve) => {
            resolve(new SpheroDataFrame(this.source as SpheroDataObject<T>) as Out);
        });
    }
}

export interface SpheroSensorOptions extends SourceNodeOptions {
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
}

export enum SpheroSensor {
    LOCATION,
    GYROSCOPE,
    ACCELEROMETER,
    VELOCITY,
}
