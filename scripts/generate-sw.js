const fs = require('fs');
const path = require('path');

// Загружаем переменные окружения
require('dotenv').config();

// Читаем шаблон Service Worker
const swTemplate = `// Firebase Messaging (background notifications)
// Note: using compat libs inside SW for simplicity
// These scripts are hosted by Google and safe to import here
importScripts('https://www.gstatic.com/firebasejs/9.6.11/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.6.11/firebase-messaging-compat.js');

// Firebase configuration from environment variables
firebase.initializeApp({
    apiKey: '${process.env.REACT_APP_FIREBASE_API_KEY}',
    authDomain: '${process.env.REACT_APP_FIREBASE_AUTH_DOMAIN}',
    projectId: '${process.env.REACT_APP_FIREBASE_PROJECT_ID}',
    storageBucket: '${process.env.REACT_APP_FIREBASE_STORAGE_BUCKET}',
    messagingSenderId: '${process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID}',
    appId: '${process.env.REACT_APP_FIREBASE_APP_ID}',
    measurementId: '${process.env.REACT_APP_FIREBASE_MEASUREMENT_ID}'
});

try {
    const messaging = firebase.messaging();

    // Handle background messages (show data-only notifications to avoid duplicates)
    messaging.onBackgroundMessage((payload) => {
        const title = (payload.data && payload.data.title) || 'Уведомление';
        const body = (payload.data && payload.data.body) || '';
        const icon = '/icons/icon-192x192.png';
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

// Removed generic Web Push fallback to prevent duplicate notifications.
// Firebase onBackgroundMessage handles data-only messages; when payload has
// a notification field, the browser displays it automatically.

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
`;

// Создаем директорию scripts если её нет
const scriptsDir = path.join(__dirname);
if (!fs.existsSync(scriptsDir)) {
    fs.mkdirSync(scriptsDir, { recursive: true });
}

// Записываем сгенерированный Service Worker
const swPath = path.join(__dirname, '..', 'public', 'sw.js');
fs.writeFileSync(swPath, swTemplate);

console.log('Service Worker generated successfully with environment variables');
