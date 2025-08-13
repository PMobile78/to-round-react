import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import app from './firebase';

// Store FCM token in Firestore under the current user document
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import i18n from './i18n';

// Используем только process.env, чтобы избежать предупреждения webpack об import.meta
const VAPID_KEY = process.env.REACT_APP_FIREBASE_VAPID_KEY || 'BGuf9B4yPtX9L7RSGD9SnorV_6VlAZ4BWiQgSjD33XhfnGq75x3ev_pTxVj-0UUlc58qyv6_Xxt9hJDWOczgYQw'; // ToDo Move to .env

export async function initMessagingAndSaveToken() {
    try {
        const supported = await isSupported();
        if (!supported) {
            console.log('[FCM] Messaging not supported in this browser');
            return null;
        }

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.log('[FCM] Notification permission not granted');
            return null;
        }

        const messaging = getMessaging(app);
        const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: await navigator.serviceWorker.ready });

        await saveToken(token);

        // Foreground message handler — показываем через Service Worker, чтобы клик открывал URL
        onMessage(messaging, async (payload) => {
            console.log('[FCM] Message in foreground:', payload);
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
        console.error('[FCM] init error:', e);
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
    await setDoc(tokenRef, {
        userId: currentUser.uid,
        token,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        language: (typeof i18n?.language === 'string' && i18n.language) || (typeof navigator !== 'undefined' ? navigator.language : 'unknown'),
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp()
    }, { merge: true });
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


