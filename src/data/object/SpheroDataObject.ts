import { DataObject, SerializableObject, Absolute3DPosition } from '@openhps/core';
import { Core, SpheroMini, Scanner } from '../../../lib/server/lib/dist';

@SerializableObject()
export class SpheroDataObject<T extends Core> extends DataObject {
    toy: T;

    constructor(toy: T, uid?: string, displayName?: string) {
        super(uid, displayName);
        this.toy = toy;
    }

    public static findSpheroMini(): Promise<SpheroDataObject<SpheroMini>> {
        return new Promise((resolve, reject) => {
            Scanner.findSpheroMini()
                .then((toy) => {
                    const object = new SpheroDataObject(toy);
                    object.setPosition(new Absolute3DPosition(0, 0, 0));
                    resolve(object);
                })
                .catch((ex) => {
                    reject(ex);
                });
        });
    }
}
