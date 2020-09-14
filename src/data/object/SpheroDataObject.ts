import { DataObject, SerializableObject, Absolute3DPosition } from '@openhps/core';
import { Core, SpheroMini, Scanner } from '../../../lib/server/lib/dist';

@SerializableObject()
export class SpheroDataObject<T extends Core> extends DataObject {
    public toy: T;

    constructor(toy: T) {
        super();
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
