// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    deleteDoc: vi.fn(),
    deleteToken: vi.fn(),
    doc: vi.fn(() => 'token-ref'),
    getAuth: vi.fn(),
    getDoc: vi.fn(),
    getMessaging: vi.fn(() => 'messaging'),
    getToken: vi.fn(),
    isSupported: vi.fn(),
    onAuthStateChanged: vi.fn(),
    onMessage: vi.fn(),
    serverTimestamp: vi.fn(() => 'server-timestamp'),
    setDoc: vi.fn(),
    updateDoc: vi.fn(),
}));

vi.mock('firebase/messaging', () => ({
    deleteToken: mocks.deleteToken,
    getMessaging: mocks.getMessaging,
    getToken: mocks.getToken,
    isSupported: mocks.isSupported,
    onMessage: mocks.onMessage,
}));
vi.mock('firebase/firestore', () => ({
    deleteDoc: mocks.deleteDoc,
    doc: mocks.doc,
    getDoc: mocks.getDoc,
    serverTimestamp: mocks.serverTimestamp,
    setDoc: mocks.setDoc,
    updateDoc: mocks.updateDoc,
}));
vi.mock('firebase/auth', () => ({
    getAuth: mocks.getAuth,
    onAuthStateChanged: mocks.onAuthStateChanged,
}));
vi.mock('./firebase', () => ({ default: 'app', db: 'db' }));
vi.mock('./i18n', () => ({ default: { language: 'en' } }));
vi.mock('./utils/config', () => ({ config: { firebase: { vapidKey: 'vapid-key' } } }));
vi.mock('./utils/logger', () => ({ default: { error: vi.fn() } }));

import { initMessagingAndSaveToken, teardownForegroundMessageListener } from './firebaseMessaging';

describe('firebaseMessaging foreground listener', () => {
    let activeHandlers;
    let unsubscribeCalls;
    let registration;

    beforeEach(() => {
        activeHandlers = new Set();
        unsubscribeCalls = [];
        registration = { showNotification: vi.fn().mockResolvedValue() };

        Object.defineProperty(navigator, 'serviceWorker', {
            configurable: true,
            value: { ready: Promise.resolve(registration) },
        });
        vi.stubGlobal('Notification', { requestPermission: vi.fn().mockResolvedValue('granted') });

        mocks.isSupported.mockResolvedValue(true);
        mocks.getToken.mockResolvedValue('token-1');
        mocks.getAuth.mockReturnValue({ currentUser: { uid: 'user-1' } });
        mocks.getDoc.mockResolvedValue({ exists: () => true });
        mocks.onMessage.mockImplementation((_messaging, handler) => {
            activeHandlers.add(handler);
            const unsubscribe = vi.fn(() => activeHandlers.delete(handler));
            unsubscribeCalls.push(unsubscribe);
            return unsubscribe;
        });
    });

    afterEach(() => {
        teardownForegroundMessageListener();
        vi.unstubAllGlobals();
        vi.clearAllMocks();
    });

    it('keeps one listener while repeated init calls still sync the token', async () => {
        await initMessagingAndSaveToken();
        await initMessagingAndSaveToken();
        await initMessagingAndSaveToken();

        expect(mocks.onMessage).toHaveBeenCalledOnce();
        expect(activeHandlers.size).toBe(1);
        expect(mocks.getToken).toHaveBeenCalledTimes(3);
        expect(mocks.updateDoc).toHaveBeenCalledTimes(3);
        expect(mocks.updateDoc).toHaveBeenLastCalledWith('token-ref', expect.objectContaining({
            token: 'token-1',
            language: 'en',
        }));

        const payload = {
            notification: { title: 'Reminder', body: 'One message' },
            data: { bubbleId: 'bubble-1', url: '/?bubbleId=bubble-1' },
        };
        await Promise.all([...activeHandlers].map((handler) => handler(payload)));

        expect(registration.showNotification).toHaveBeenCalledOnce();
        expect(registration.showNotification).toHaveBeenCalledWith('Reminder', expect.objectContaining({
            body: 'One message',
            data: payload.data,
        }));
    });

    it('unsubscribes on teardown and creates one listener on re-init', async () => {
        await initMessagingAndSaveToken();
        teardownForegroundMessageListener();

        expect(unsubscribeCalls[0]).toHaveBeenCalledOnce();
        expect(activeHandlers.size).toBe(0);

        await initMessagingAndSaveToken();
        await initMessagingAndSaveToken();

        expect(mocks.onMessage).toHaveBeenCalledTimes(2);
        expect(activeHandlers.size).toBe(1);
    });
});
