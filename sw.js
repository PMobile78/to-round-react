// Firebase Messaging (background notifications)
// Note: using compat libs inside SW for simplicity
// These scripts are hosted by Google and safe to import here
importScripts('https://www.gstatic.com/firebasejs/9.6.11/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.6.11/firebase-messaging-compat.js');

// Keep this config in sync with src/firebase.js
// Public keys are OK to be here (apiKey etc. are not secrets)
firebase.initializeApp({
    apiKey: 'AIzaSyAat5vcOBIOeJXoGFfqkNybC9J-v0G8yA4',
    authDomain: 'todo-flutter-fb8bf.firebaseapp.com',
    projectId: 'todo-flutter-fb8bf',
    storageBucket: 'todo-flutter-fb8bf.appspot.com',
    messagingSenderId: '699564548059',
    appId: '1:699564548059:web:0e45b2291da108955fd1fe',
    measurementId: 'G-94PRVB1G5L'
});

try {
    const messaging = firebase.messaging();

    // Handle background messages
    messaging.onBackgroundMessage((payload) => {
        const title = (payload.notification && payload.notification.title) || (payload.data && payload.data.title) || 'Уведомление';
        const body = (payload.notification && payload.notification.body) || (payload.data && payload.data.body) || '';
        const icon = (payload.notification && payload.notification.icon) || '/icons/icon-192x192.png';
        const url = (payload.fcmOptions && payload.fcmOptions.link) || (payload.data && payload.data.url) || null;

        self.registration.showNotification(title, {
            body,
            icon,
            data: Object.assign({}, payload.data || {}, url ? { url } : {})
        });
    });
} catch (e) {
    // No-op if messaging is not available
}

self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    // Optionally navigate to a URL from payload
    const targetUrl = (event.notification && event.notification.data && event.notification.data.url) || null;
    if (targetUrl) {
        event.waitUntil((async () => {
            const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
            for (const client of allClients) {
                if (client.url === targetUrl && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })());
    }
});