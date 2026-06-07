import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import app from './firebase';

// Store FCM token in Firestore under the current user document
import { doc, setDoc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import i18n from './i18n';
import { config } from './utils/config';
import logger from './utils/logger';

// VAPID Key from configuration
const VAPID_KEY = config.firebase.vapidKey;

export async function initMessagingAndSaveToken() {
    try {
        const supported = await isSupported();
        if (!supported) {
            return null;
        }

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            return null;
        }

        const messaging = getMessaging(app);
        const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: await navigator.serviceWorker.ready });

        await saveToken(token);

        // Foreground message handler — показываем через Service Worker, чтобы клик открывал URL
        onMessage(messaging, async (payload) => {
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

        return token;
    } catch (e) {
        logger.error('[FCM] init error:', e);
        return null;
    }
}

async function saveToken(token) {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
        // wait for auth change if needed
        await new Promise((resolve) => {
            const unsub = onAuthStateChanged(auth, (u) => {
                if (u) {
                    unsub();
                    resolve(null);
                }
            });
            setTimeout(() => { unsub(); resolve(null); }, 5000);
        });
    }

    const currentUser = getAuth().currentUser;
    if (!currentUser) return;

    // Сохраняем токен как документ в подколлекции: user-fcm-tokens/{uid}/tokens/{token}
    const tokenRef = doc(db, 'user-fcm-tokens', currentUser.uid, 'tokens', token);
    const tokenData = {
        userId: currentUser.uid,
        token,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        language: (typeof i18n?.language === 'string' && i18n.language) || (typeof navigator !== 'undefined' ? navigator.language : 'unknown'),
        updatedAt: serverTimestamp(),
    };
    const snap = await getDoc(tokenRef);
    if (!snap.exists()) {
        await setDoc(tokenRef, { ...tokenData, createdAt: serverTimestamp() });
    } else {
        await updateDoc(tokenRef, tokenData);
    }
}

export async function updateMessagingTokenLanguage(language) {
    try {
        const supported = await isSupported();
        if (!supported) return;

        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        const messaging = getMessaging(app);
        const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: await navigator.serviceWorker.ready });

        const tokenRef = doc(db, 'user-fcm-tokens', currentUser.uid, 'tokens', token);
        await setDoc(tokenRef, {
            language: (typeof language === 'string' && language) || (typeof i18n?.language === 'string' && i18n.language) || (typeof navigator !== 'undefined' ? navigator.language : 'unknown'),
            updatedAt: serverTimestamp()
        }, { merge: true });
    } catch (e) {
        // ignore
    }
}


