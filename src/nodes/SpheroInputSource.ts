import { SourceNode, Quaternion, AngleUnit, LinearVelocity, TimeUnit, LinearVelocityUnit } from '@openhps/core';
import { SpheroDataObject, SpheroDataFrame } from '../data';
import { RollableToy } from 'spherov2.js-server';
import { DriveFlag } from 'spherov2.js-web';

export class SpheroInputSource<Out extends SpheroDataFrame, T extends RollableToy = RollableToy> extends SourceNode<
    Out
> {
    constructor(source?: SpheroDataObject<T>) {
        super(source);
        if (!source) {
            this.once('build', this._connect.bind(this));
        }
    }

    private _connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            SpheroDataObject.findSpheroMini()
                .then((object) => {
                    this.source = object;
                    resolve();
                })
                .catch(reject);
        });
    }

    public get toy(): RollableToy {
        const spheroObject = this.source as SpheroDataObject<T>;
        return spheroObject.toy;
    }

    public onPull(): Promise<Out> {
        return new Promise((resolve) => {
            resolve(new SpheroDataFrame(this.source as SpheroDataObject<T>) as Out);
        });
    }

    public roll(speed: number, heading: number, flags: DriveFlag[] = []): Promise<void> {
        return new Promise((resolve, reject) => {
            const spheroObject = this.source as SpheroDataObject<T>;
            const position = spheroObject.getPosition();
            position.orientation = Quaternion.fromEuler({ yaw: heading, pitch: 0, roll: 0, unit: AngleUnit.DEGREE });
            position.velocity.linear = new LinearVelocity(
                (1.0 / 255) * speed,
                0,
                0,
                LinearVelocityUnit.METER_PER_SECOND,
            );
            const frame = new SpheroDataFrame(spheroObject);

            const pushPromises: Array<Promise<void>> = [];
            this.outputNodes.forEach((node) => {
                pushPromises.push(node.push(frame));
            });

            spheroObject.toy
                .roll(speed, heading, flags)
                .then(() => {
                    return Promise.all(pushPromises);
                })
                .then(() => {
                    resolve();
                })
                .catch(reject);
        });
    }

    public rollTime(
        speed: number,
        heading: number,
        time: number,
        timeUnit: TimeUnit,
        flags: DriveFlag[] = [],
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                clearInterval(timer);
                this.roll(0, heading, flags)
                    .then(() => {
                        resolve();
                    })
                    .catch((ex) => {
                        reject(ex);
                    });
            }, timeUnit.convert(time, TimeUnit.MILLISECOND));

            const timer = setInterval(() => {
                Promise.resolve(this.roll(speed, heading, flags));
            }, 50);
        });
    }
}
