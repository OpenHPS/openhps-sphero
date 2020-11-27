import { IMUDataFrame, SerializableMember, SerializableObject } from '@openhps/core';
import { SpheroDataObject } from './object';

@SerializableObject()
export class SpheroDataFrame extends IMUDataFrame {
    constructor(spheroObject: SpheroDataObject<any>) {
        super(spheroObject);
    }

    @SerializableMember()
    public x: number;

    @SerializableMember()
    public y: number;
}
