import { useCallback, useEffect, useState } from 'react';
import { db } from '../firebase';
import { thisDeviceId } from '../firebaseMessaging';
import { setDeviceNotificationsEnabled, subscribeDevice } from '../services/data/devices';
import logger from '../utils/logger';

/**
 * This browser as a device of the signed-in user (spec 3.3): its live document in
 * users/{uid}/devices and the "get reminders on this device" switch. device is null until the
 * registration after sign-in has written the document.
 */
export function useThisDevice(uid) {
    const [deviceId, setDeviceId] = useState(null);
    const [device, setDevice] = useState(null);

    useEffect(() => {
        let cancelled = false;
        thisDeviceId()
            .then((id) => { if (!cancelled) setDeviceId(id); })
            .catch((e) => logger.error('[FCM] installation id error:', e));
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        if (!uid || !deviceId) return undefined;
        return subscribeDevice(db, uid, deviceId, setDevice, (e) => logger.error('Device listener error:', e));
    }, [uid, deviceId]);

    const setNotificationsEnabled = useCallback((enabled) => {
        setDeviceNotificationsEnabled(db, uid, deviceId, enabled)
            .catch((e) => logger.error('Error switching reminders on this device:', e));
    }, [uid, deviceId]);

    return { device, setNotificationsEnabled };
}
