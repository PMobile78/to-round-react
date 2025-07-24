import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './i18n';

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
        }, function (err) {
            console.error('[SW] Registration failed:', err);
        });
    });
}