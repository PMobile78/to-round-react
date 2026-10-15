import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({ name: 'app' })) }));
vi.mock('firebase/firestore', () => ({
    initializeFirestore: vi.fn(() => ({ name: 'db' })),
    persistentLocalCache: vi.fn(() => ({})),
    persistentMultipleTabManager: vi.fn(() => ({})),
    connectFirestoreEmulator: vi.fn(),
}));
vi.mock('firebase/auth', () => ({
    getAuth: vi.fn(() => ({ name: 'auth' })),
    connectAuthEmulator: vi.fn(),
}));

const CONFIG = {
    REACT_APP_FIREBASE_API_KEY: 'key',
    REACT_APP_FIREBASE_AUTH_DOMAIN: 'domain',
    REACT_APP_FIREBASE_PROJECT_ID: 'project',
    REACT_APP_FIREBASE_STORAGE_BUCKET: 'bucket',
    REACT_APP_FIREBASE_MESSAGING_SENDER_ID: 'sender',
    REACT_APP_FIREBASE_APP_ID: 'app-id',
};

// src/firebase.js does its work at import time: import it afresh with the given env.
const importFirebase = async (env) => {
    vi.resetModules();
    Object.entries({ ...CONFIG, ...env }).forEach(([key, value]) => vi.stubEnv(key, value));
    await import('./firebase');
    const { connectFirestoreEmulator } = await import('firebase/firestore');
    const { connectAuthEmulator } = await import('firebase/auth');
    return { connectFirestoreEmulator, connectAuthEmulator };
};

afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
});

describe('src/firebase', () => {
    it('talks to the real Firebase project unless emulator mode is on', async () => {
        const { connectFirestoreEmulator, connectAuthEmulator } = await importFirebase({ REACT_APP_FIREBASE_EMULATORS: 'false' });
        expect(connectFirestoreEmulator).not.toHaveBeenCalled();
        expect(connectAuthEmulator).not.toHaveBeenCalled();
    });

    it('connects Firestore and Auth to the local emulators in emulator mode', async () => {
        const { connectFirestoreEmulator, connectAuthEmulator } = await importFirebase({ REACT_APP_FIREBASE_EMULATORS: 'true' });
        expect(connectFirestoreEmulator).toHaveBeenCalledWith({ name: 'db' }, '127.0.0.1', 8180);
        expect(connectAuthEmulator).toHaveBeenCalledWith({ name: 'auth' }, 'http://127.0.0.1:9099', { disableWarnings: true });
    });
});
