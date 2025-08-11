import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import app from './firebase';

// Store FCM token in Firestore under the current user document
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

const VAPID_KEY = import.meta?.env?.VITE_FIREBASE_VAPID_KEY || process.env.REACT_APP_FIREBASE_VAPID_KEY || 'BGuf9B4yPtX9L7RSGD9SnorV_6VlAZ4BWiQgSjD33XhfnGq75x3ev_pTxVj-0UUlc58qyv6_Xxt9hJDWOczgYQw'; // ✅ Your real VAPID key. ToDo Move to .env.    

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
        console.log('[FCM] Token acquired:', token);

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

    const ref = doc(db, 'user-fcm-tokens', currentUser.uid);
    await setDoc(ref, {
        token,
        updatedAt: serverTimestamp(),
        userId: currentUser.uid
    }, { merge: true });
}


