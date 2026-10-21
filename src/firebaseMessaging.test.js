// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    auth: { currentUser: null },
    deleteToken: vi.fn(),
    getId: vi.fn(),
    getInstallations: vi.fn(() => 'installations'),
    getMessaging: vi.fn(() => 'messaging'),
    getToken: vi.fn(),
    isSupported: vi.fn(),
    onMessage: vi.fn(),
    registerDevice: vi.fn(),
    unregisterDevice: vi.fn(),
}));

vi.mock('firebase/messaging', () => ({
    deleteToken: mocks.deleteToken,
    getMessaging: mocks.getMessaging,
    getToken: mocks.getToken,
    isSupported: mocks.isSupported,
    onMessage: mocks.onMessage,
}));
vi.mock('firebase/installations', () => ({
    getId: mocks.getId,
    getInstallations: mocks.getInstallations,
}));
vi.mock('./services/data/devices', () => ({
    registerDevice: mocks.registerDevice,
    unregisterDevice: mocks.unregisterDevice,
}));
vi.mock('./firebase', () => ({ default: 'app', db: 'db', auth: mocks.auth }));
vi.mock('./utils/config', () => ({ config: { firebase: { vapidKey: 'vapid-key' } } }));
vi.mock('./utils/logger', () => ({ default: { error: vi.fn() } }));

import { registerThisDevice, teardownForegroundMessageListener, unregisterThisDevice } from './firebaseMessaging';
import logger from './utils/logger';

describe('firebaseMessaging: this device in users/{uid}/devices (spec 3.3)', () => {
    let activeHandlers;
    let unsubscribeCalls;
    let registration;
    let permission;

    beforeEach(() => {
        activeHandlers = new Set();
        unsubscribeCalls = [];
        registration = { showNotification: vi.fn().mockResolvedValue() };
        permission = 'granted';

        Object.defineProperty(navigator, 'serviceWorker', {
            configurable: true,
            value: { ready: Promise.resolve(registration) },
        });
        vi.stubGlobal('Notification', {
            requestPermission: vi.fn(() => Promise.resolve(permission)),
            get permission() { return permission; },
        });

        mocks.auth.currentUser = { uid: 'user-1' };
        mocks.isSupported.mockResolvedValue(true);
        mocks.getId.mockResolvedValue('fid-1');
        mocks.getToken.mockResolvedValue('token-1');
        mocks.registerDevice.mockResolvedValue(true);
        mocks.unregisterDevice.mockResolvedValue();
        mocks.onMessage.mockImplementation((_messaging, handler) => {
            activeHandlers.add(handler);
            const unsubscribe = vi.fn(() => activeHandlers.delete(handler));
            unsubscribeCalls.push(unsubscribe);
            return unsubscribe;
        });
    });

    afterEach(() => {
        vi.useRealTimers();
        teardownForegroundMessageListener();
        vi.unstubAllGlobals();
        vi.clearAllMocks();
    });

    it('registers this installation with its FCM token and keeps one foreground listener', async () => {
        await registerThisDevice('user-1');
        await registerThisDevice('user-1');
        await registerThisDevice('user-1');

        expect(mocks.registerDevice).toHaveBeenCalledTimes(3);
        expect(mocks.registerDevice).toHaveBeenLastCalledWith('db', 'user-1', 'fid-1', 'token-1');
        expect(mocks.onMessage).toHaveBeenCalledOnce();
        expect(activeHandlers.size).toBe(1);

        // A v2 message has no notification block: the text comes in data (sub-plan 0.3).
        const payload = { data: { type: 'reminder', taskId: 't1', title: 'Pay bills', body: 'In 1 hour', url: '/?taskId=t1' } };
        await Promise.all([...activeHandlers].map((handler) => handler(payload)));

        expect(registration.showNotification).toHaveBeenCalledOnce();
        expect(registration.showNotification).toHaveBeenCalledWith('Pay bills', expect.objectContaining({
            body: 'In 1 hour',
            data: payload.data,
        }));
    });

    it('registers this device without a token when notifications are not allowed', async () => {
        permission = 'denied';
        await registerThisDevice('user-1');
        expect(mocks.getToken).not.toHaveBeenCalled();
        expect(mocks.registerDevice).toHaveBeenCalledWith('db', 'user-1', 'fid-1', null);
    });

    it('leaves the stored token alone where FCM fails for a moment (spec 3.3)', async () => {
        mocks.getToken.mockRejectedValueOnce(new Error('messaging/token-subscribe-failed'));
        await registerThisDevice('user-1');
        // undefined: no token known, so a registered device keeps the one it has.
        expect(mocks.registerDevice.mock.calls).toEqual([['db', 'user-1', 'fid-1', undefined]]);
    });

    it('registers this device without a token where push is unsupported', async () => {
        mocks.isSupported.mockResolvedValueOnce(false);
        await registerThisDevice('user-1');
        expect(mocks.registerDevice.mock.calls).toEqual([['db', 'user-1', 'fid-1', null]]);
    });

    it('removes this device and invalidates its token on sign-out', async () => {
        await registerThisDevice('user-1');
        await unregisterThisDevice('user-1');

        expect(mocks.unregisterDevice).toHaveBeenCalledWith('db', 'user-1', 'fid-1');
        expect(mocks.deleteToken).toHaveBeenCalledWith('messaging');
        expect(unsubscribeCalls[0]).toHaveBeenCalledOnce();
        expect(activeHandlers.size).toBe(0);
    });

    it('creates one foreground listener again on the next sign-in', async () => {
        await registerThisDevice('user-1');
        await unregisterThisDevice('user-1');
        await registerThisDevice('user-1');
        await registerThisDevice('user-1');

        expect(mocks.onMessage).toHaveBeenCalledTimes(2);
        expect(activeHandlers.size).toBe(1);
    });

    // Right after a sign-in another open tab of the app can still answer for this one with the
    // previous account (the Firestore cache shared by the tabs) until it wakes up, about once a
    // minute in the background, and the rules refuse the registration until then.
    const refusal = () => Object.assign(new Error('Missing or insufficient permissions.'), { code: 'permission-denied' });

    it('registers this device once the refusals right after sign-in are over', async () => {
        vi.useFakeTimers();
        mocks.registerDevice.mockRejectedValueOnce(refusal()).mockRejectedValueOnce(refusal());
        registerThisDevice('user-1');
        await vi.advanceTimersByTimeAsync(6000);
        expect(mocks.registerDevice).toHaveBeenCalledTimes(3);
        expect(mocks.registerDevice).toHaveBeenLastCalledWith('db', 'user-1', 'fid-1', 'token-1');
        expect(logger.error).not.toHaveBeenCalled();
    });

    it('says the device could not be registered when it is still refused after a minute and a half', async () => {
        vi.useFakeTimers();
        mocks.registerDevice.mockRejectedValue(refusal());
        registerThisDevice('user-1');
        await vi.advanceTimersByTimeAsync(87000);
        expect(logger.error).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(3000);
        expect(mocks.registerDevice).toHaveBeenCalledTimes(31);
        expect(logger.error).toHaveBeenCalledWith('[FCM] device registration error:', expect.objectContaining({ code: 'permission-denied' }));
        await vi.advanceTimersByTimeAsync(3000);
        expect(mocks.registerDevice).toHaveBeenCalledTimes(31);
    });

    it('stops trying again for an account that signed out', async () => {
        vi.useFakeTimers();
        mocks.registerDevice.mockRejectedValue(refusal());
        registerThisDevice('user-1');
        mocks.auth.currentUser = null;
        await vi.advanceTimersByTimeAsync(90000);
        expect(mocks.registerDevice).toHaveBeenCalledTimes(1);
        expect(logger.error).not.toHaveBeenCalled();
    });

    it('stops trying again for the previous account when another one signs in', async () => {
        vi.useFakeTimers();
        mocks.registerDevice.mockImplementation((db, uid) => (uid === 'user-1' ? Promise.reject(refusal()) : Promise.resolve(true)));
        registerThisDevice('user-1');
        mocks.auth.currentUser = { uid: 'user-2' };
        registerThisDevice('user-2');
        await vi.advanceTimersByTimeAsync(90000);
        expect(mocks.registerDevice.mock.calls.filter(([, uid]) => uid === 'user-1')).toHaveLength(1);
        expect(mocks.registerDevice).toHaveBeenLastCalledWith('db', 'user-2', 'fid-1', 'token-1');
        expect(logger.error).not.toHaveBeenCalled();
    });

    it('logs any other error at once and does not try again', async () => {
        vi.useFakeTimers();
        mocks.registerDevice.mockRejectedValueOnce(Object.assign(new Error('Failed to get document because the client is offline.'), { code: 'unavailable' }));
        registerThisDevice('user-1');
        await vi.advanceTimersByTimeAsync(90000);
        expect(mocks.registerDevice).toHaveBeenCalledTimes(1);
        expect(logger.error).toHaveBeenCalledWith('[FCM] device registration error:', expect.objectContaining({ code: 'unavailable' }));
    });
});
