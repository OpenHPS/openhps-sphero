import { IMUDataFrame, SerializableObject } from '@openhps/core';
import { SpheroDataObject } from './object';

@SerializableObject()
export class SpheroDataFrame extends IMUDataFrame {
    constructor(spheroObject: SpheroDataObject<any>) {
        super(spheroObject);
    }
}
