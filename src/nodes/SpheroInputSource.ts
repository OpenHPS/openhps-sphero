import {
    SourceNode,
    Quaternion,
    AngleUnit,
    LinearVelocity,
    TimeUnit,
    LinearVelocityUnit,
    Absolute2DPosition,
    TimeService,
    LengthUnit,
} from '@openhps/core';
import { SpheroDataObject, SpheroDataFrame } from '../data';
import { RollableToy } from '../../lib/server/lib/dist';
import { DriveFlag } from '../../lib/web/dist';

export class SpheroInputSource<
    Out extends SpheroDataFrame,
    T extends RollableToy = RollableToy
> extends SourceNode<Out> {
    constructor(source: SpheroDataObject<T>) {
        super(source);
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
            const position = spheroObject.getPosition() || new Absolute2DPosition(0, 0);
            position.unit = LengthUnit.CENTIMETER;
            position.timestamp = TimeService.now();
            position.orientation = Quaternion.fromEuler({ yaw: heading, pitch: 0, roll: 0, unit: AngleUnit.DEGREE });
            position.velocity.linear = new LinearVelocity(
                // Sphero Mini top speed is 1m/s
                // https://support.sphero.com/article/6drb2qggx4-sphero-mini-faq#:~:text=How%20fast%20is%20Sphero%20Mini,of%201%20meter%20per%20second.
                (1.0 / 255) * speed,
                0,
                0,
                LinearVelocityUnit.METER_PER_SECOND,
            );
            spheroObject.setPosition(position);

            const frame = new SpheroDataFrame(spheroObject);
            spheroObject.toy
                .roll(speed, heading, flags)
                .then(() => {
                    return this.push(frame as Out);
                })
                .then(() => {
                    setTimeout(() => {
                        resolve();
                    }, 10);
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
        // eslint-disable-next-line
        return new Promise(async (resolve, reject) => {
            let driving = true;
            setTimeout(() => (driving = false), timeUnit.convert(time, TimeUnit.MILLISECOND));

            while (driving) {
                await this.roll(speed, heading, flags);
            }

            this.roll(0, heading, flags)
                .then(() => {
                    resolve();
                })
                .catch((ex) => {
                    reject(ex);
                });
        });
    }
}
