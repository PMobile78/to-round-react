import { getMessaging, getToken, onMessage, isSupported, deleteToken } from 'firebase/messaging';
import { getId, getInstallations } from 'firebase/installations';
import app, { auth, db } from './firebase';
import { registerDevice, unregisterDevice } from './services/data/devices';
import { config } from './utils/config';
import logger from './utils/logger';

// VAPID Key from configuration
const VAPID_KEY = config.firebase.vapidKey;
let foregroundMessageUnsubscribe = null;

// Right after a sign-in another open tab of the app can still answer for this one with the
// previous account (the Firestore cache shared by the tabs) until it wakes up, which a tab in the
// background does about once a minute, and the rules refuse until then: a refused registration
// tries again every 3 seconds for a minute and a half.
const REGISTER_AGAIN_MS = 3000;
const REGISTER_AGAIN_TIMES = 30;
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function setupForegroundMessageListener(messaging) {
    if (foregroundMessageUnsubscribe) return;

    // Foreground message handler — показываем через Service Worker, чтобы клик открывал URL
    foregroundMessageUnsubscribe = onMessage(messaging, async (payload) => {
        try {
            const registration = await navigator.serviceWorker.ready;
            const title = payload?.notification?.title || payload?.data?.title || 'Уведомление';
            const body = payload?.notification?.body || payload?.data?.body || '';
            const icon = payload?.notification?.icon || '/icons/icon-192x192.png';
            await registration.showNotification(title, {
                body,
                icon,
                data: payload?.data || {}
            });
        } catch (e) {
            // ignore
        }
    });
}

export function teardownForegroundMessageListener() {
    if (!foregroundMessageUnsubscribe) return;
    foregroundMessageUnsubscribe();
    foregroundMessageUnsubscribe = null;
}

/** This browser's Firebase installation id: its device id in users/{uid}/devices (spec 3.3). */
export const thisDeviceId = () => getId(getInstallations(app));

// FCM token of this browser after asking for the permission; null without permission or push support.
async function messagingToken() {
    if (!(await isSupported())) return null;
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const messaging = getMessaging(app);
    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: await navigator.serviceWorker.ready });
    setupForegroundMessageListener(messaging);
    return token || null;
}

/**
 * Registration after sign-in (spec 3.3): the permission is asked for, then this device is
 * written with its FCM token, or with null without permission or push support. When FCM fails
 * to give a token, a registered device keeps the one it has. A registration refused right after
 * the sign-in is tried again while the account stays signed in. Errors are only logged.
 */
export async function registerThisDevice(uid) {
    // Stays undefined when FCM fails: that says nothing about the token the device already has.
    let fcmToken;
    try {
        fcmToken = await messagingToken();
    } catch (e) {
        logger.error('[FCM] token error:', e);
    }
    try {
        const deviceId = await thisDeviceId();
        for (let again = 0; ; again += 1) {
            try {
                await registerDevice(db, uid, deviceId, fcmToken);
                return;
            } catch (e) {
                if (!e || e.code !== 'permission-denied' || again === REGISTER_AGAIN_TIMES) throw e;
            }
            await pause(REGISTER_AGAIN_MS);
            // Signed out, or another account signed in: this registration stops.
            if (auth.currentUser?.uid !== uid) return;
        }
    } catch (e) {
        logger.error('[FCM] device registration error:', e);
    }
}

/** Sign-out, before signOut: removes this device's document and invalidates its FCM token. */
export async function unregisterThisDevice(uid) {
    teardownForegroundMessageListener();
    await unregisterDevice(db, uid, await thisDeviceId());
    try {
        if (await isSupported() && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            await deleteToken(getMessaging(app));
        }
    } catch (e) {
        logger.error('[FCM] remove token on logout error:', e);
    }
}
