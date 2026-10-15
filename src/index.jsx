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
import { registerThisDevice } from './firebaseMessaging';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import logger from './utils/logger';
import { deepLinkTaskId } from './utils/deepLink';

// Handle notification deep links like /?taskId=... (and the old /?bubbleId=...)
function handleDeepLink() {
    try {
        const bubbleId = deepLinkTaskId(window.location.search);
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
        navigator.serviceWorker.register(swPath).then(function () {
            // FCM uses this SW (registerThisDevice waits for it); process deep links
            handleDeepLink();
        }, function (err) {
            logger.error('[SW] Registration failed:', err);
        });
    });
} else {
    handleDeepLink();
}

// Register this device for reminders after sign-in (spec 3.3). The language of the
// reminders is the user's settings.language, so the device carries none.
try {
    const auth = getAuth();
    onAuthStateChanged(auth, (user) => {
        if (user) registerThisDevice(user.uid);
    });
} catch (e) {
    // ignore
}
