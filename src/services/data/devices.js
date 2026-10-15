/**
 * Devices of one user, users/{uid}/devices/{deviceId} (data contract v2, spec section 3.3).
 * deviceId is the Firebase installation id; the server sends reminders to devices with
 * notificationsEnabled and a token.
 */
import { deleteDoc, doc, getDoc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { deviceFromDoc, deviceUpdateData, newDeviceData } from './convert';

const READ_OPTIONS = { serverTimestamps: 'estimate' };

const deviceRef = (db, uid, deviceId) => doc(db, 'users', uid, 'devices', deviceId);

/**
 * Registration on sign-in: a known device gets only its new token (the switch is kept),
 * a new one is created with notifications on. fcmToken is null without permission, and
 * undefined when this browser could not get it (an FCM error): a known device then keeps the
 * token it has (spec 3.3: null only without permission or for a token FCM rejected). True if created.
 */
export const registerDevice = async (db, uid, deviceId, fcmToken) => {
    const ref = deviceRef(db, uid, deviceId);
    if ((await getDoc(ref)).exists()) {
        if (fcmToken !== undefined) await updateDoc(ref, deviceUpdateData({ fcmToken }));
        return false;
    }
    await setDoc(ref, newDeviceData({ platform: 'web', fcmToken: fcmToken ?? null }));
    return true;
};

/** The "get reminders on this device" switch. */
export const setDeviceNotificationsEnabled = (db, uid, deviceId, enabled) => updateDoc(
    deviceRef(db, uid, deviceId),
    deviceUpdateData({ notificationsEnabled: enabled }),
);

/** Sign-out removes the device before signOut (the rules need the signed-in owner). */
export const unregisterDevice = (db, uid, deviceId) => deleteDoc(deviceRef(db, uid, deviceId));

/** Live device: onDevice(device) or onDevice(null) when it is not registered. */
export const subscribeDevice = (db, uid, deviceId, onDevice, onError) => onSnapshot(deviceRef(db, uid, deviceId), (snapshot) => {
    onDevice(snapshot.exists() ? deviceFromDoc(snapshot.id, snapshot.data(READ_OPTIONS)) : null);
}, onError);
