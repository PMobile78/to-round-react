import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './i18n';
import { initMessagingAndSaveToken, updateMessagingTokenLanguage } from './firebaseMessaging';
import i18n from './i18n';

// Handle notification deep links like /?bubbleId=...
function handleDeepLink() {
    try {
        const params = new URLSearchParams(window.location.search);
        const bubbleId = params.get('bubbleId');
        if (bubbleId) {
            window.dispatchEvent(new CustomEvent('open-bubble', { detail: { bubbleId } }));
        }
    } catch (e) {
        // ignore
    }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);

if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
        const swPath = '/to-round-react/sw.js';
        console.log('[SW] Attempting to register Service Worker at', swPath);
        navigator.serviceWorker.register(swPath).then(function (registration) {
            console.log('[SW] Service Worker registered:', registration);
            if (registration.installing) {
                console.log('[SW] Service worker installing');
            } else if (registration.waiting) {
                console.log('[SW] Service worker installed');
            } else if (registration.active) {
                console.log('[SW] Service worker active');
            }

            // Initialize FCM after SW is ready and process deep links
            initMessagingAndSaveToken();
            try { updateMessagingTokenLanguage(i18n.language); } catch (e) { }
            handleDeepLink();
        }, function (err) {
            console.error('[SW] Registration failed:', err);
        });
    });
} else {
    handleDeepLink();
}

// Keep token language in sync with app language
try {
    i18n.on('languageChanged', (lng) => {
        updateMessagingTokenLanguage(lng);
    });
} catch (e) {
    // ignore
}