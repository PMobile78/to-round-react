// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { connectFirestoreEmulator, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { config, validateConfig } from './utils/config';

// Validate Firebase configuration
if (!validateConfig()) {
    throw new Error('Invalid Firebase configuration. Please check your environment variables.');
}

// Your web app's Firebase configuration
// Configuration from environment variables
const firebaseConfig = {
    apiKey: config.firebase.apiKey,
    authDomain: config.firebase.authDomain,
    projectId: config.firebase.projectId,
    storageBucket: config.firebase.storageBucket,
    messagingSenderId: config.firebase.messagingSenderId,
    appId: config.firebase.appId,
    measurementId: config.firebase.measurementId
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore with a persistent IndexedDB cache so the installed
// PWA works offline (reads from cache, writes buffered until back online).
// Multi-tab manager is required because the app is opened in several tabs.
export const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// `npm run start:emulator` (.env.emulator): the local Auth and Firestore emulators
// from firebase.json instead of the real project.
if (import.meta.env.REACT_APP_FIREBASE_EMULATORS === 'true') {
    connectFirestoreEmulator(db, '127.0.0.1', 8180);
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
}

export default app; 