import { BB9E } from './toys/bb9e';
import { Core } from './toys/core';
import { LightningMcQueen } from './toys/lightning-mcqueen';
import { R2D2 } from './toys/r2d2';
import { R2Q5 } from './toys/r2q5';
import { SpheroMini } from './toys/sphero-mini';
import { IToyAdvertisement, ServicesUUID } from './toys/types';

export interface IToyDiscovered extends IToyAdvertisement {
  peripheral: BluetoothDevice;
}

/**
 * Searches (but does not start) toys that matcht the passed criteria
 */
export function findToy(type: IToyAdvertisement): Promise<BluetoothDevice> {
  return new Promise((resolve, reject) => {
    navigator.bluetooth.requestDevice({
        filters: [{ 
          services: [ServicesUUID.apiV2ControlService]
        }],
        optionalServices: [ServicesUUID.nordicDfuService]
    }).then((device: BluetoothDevice) => {
        resolve(device);
    }).catch(ex => {
        reject(ex);
    });
  });
}

const startToy = async (toy: Core) => {
  await toy.start();
};

/**
 * Searches toys that match the passed criteria, starts the first found toy and
 * returns it
 */
export const find = async <T extends Core>(
  toyType: IToyAdvertisement,
  name?: string
) => {
  const device: BluetoothDevice = await findToy(toyType);
  const toy: Core = new toyType.class(device);
  await startToy(toy);
  return toy as T;
};

/**
 * Searches BB9E toys, starts the first one that was found and returns it
 */
export const findBB9E = async () => {
  return (await find(BB9E.advertisement)) as BB9E;
};

/**
 * Searches R2D2 toys, starts the first one that was found and returns it
 */
export const findR2D2 = async () => {
  return (await find(R2D2.advertisement)) as R2D2;
};

/**
 * Searches R2Q5 toys, starts the first one that was found and returns it
 */
export const findR2Q5 = async () => {
  return (await find(R2Q5.advertisement)) as R2Q5;
};

/**
 * Searches Sphero Mini toys, starts the first one that was found and returns it
 */
export const findSpheroMini = async () => {
  return (await find(SpheroMini.advertisement)) as SpheroMini;
};

/**
 * Searches a Sphero Mini toy with the passed name, starts and returns it
 */
export const findSpheroMiniByName = async (name: string) => {
  return (await find(SpheroMini.advertisement, name)) as SpheroMini;
};

/**
 * Searches Lightning McQueen toys, starts the first one that was found and
 * returns it
 */
export const findLightningMcQueen = async () => {
  return (await find(LightningMcQueen.advertisement)) as LightningMcQueen;
};
