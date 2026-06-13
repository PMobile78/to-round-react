import '@fontsource-variable/inter';
import '@fontsource-variable/sora';
import '@fontsource-variable/space-grotesk';
import '@fontsource-variable/archivo';
import '@fontsource-variable/nunito';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './i18n';
import './styles/design-backdrops.css';
import { initMessagingAndSaveToken, updateMessagingTokenLanguage } from './firebaseMessaging';
import i18n from './i18n';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import logger from './utils/logger';

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
        const swPath = `${import.meta.env.BASE_URL}sw.js`;
        navigator.serviceWorker.register(swPath).then(function (registration) {
            // Initialize FCM after SW is ready and process deep links
            initMessagingAndSaveToken();
            try { updateMessagingTokenLanguage(i18n.language); } catch (e) { }
            handleDeepLink();
        }, function (err) {
            logger.error('[SW] Registration failed:', err);
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

// Update/save token after login to apply the current app language chosen on auth screen
try {
    const auth = getAuth();
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                await initMessagingAndSaveToken();
            } catch (e) { }
            try {
                await updateMessagingTokenLanguage(i18n.language);
            } catch (e) { }
        }
    });
} catch (e) {
    // ignore
}