import { SerializableMember, SerializableObject } from '@openhps/core';
import { SpheroDataObject } from './object';
import { IMUDataFrame } from '@openhps/imu';

@SerializableObject()
export class SpheroDataFrame extends IMUDataFrame {
    constructor(spheroObject: SpheroDataObject<any>) {
        super(spheroObject);
    }

    @SerializableMember()
    x: number;

    @SerializableMember()
    y: number;
}
