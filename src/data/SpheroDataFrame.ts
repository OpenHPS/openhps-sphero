import { DataFrame, SerializableMember, SerializableObject } from '@openhps/core';
import { SpheroDataObject } from './object';

@SerializableObject()
export class SpheroDataFrame extends DataFrame {
    constructor(spheroObject: SpheroDataObject<any>) {
        super(spheroObject);
    }

    @SerializableMember()
    x: number;

    @SerializableMember()
    y: number;
}
