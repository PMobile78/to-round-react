// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../firebase', () => ({ auth: { currentUser: { uid: 'u1' } } }));

const mockSignOut = vi.fn();
vi.mock('firebase/auth', () => ({
    createUserWithEmailAndPassword: vi.fn(),
    signInWithEmailAndPassword: vi.fn(),
    signOut: (...args) => mockSignOut(...args),
    onAuthStateChanged: vi.fn(),
    sendPasswordResetEmail: vi.fn(),
    updateProfile: vi.fn(),
    EmailAuthProvider: { credential: vi.fn() },
    reauthenticateWithCredential: vi.fn(),
    updatePassword: vi.fn(),
}));

const mockUnregisterThisDevice = vi.fn();
vi.mock('../firebaseMessaging', () => ({
    unregisterThisDevice: (...args) => mockUnregisterThisDevice(...args),
}));

import { logoutUser } from './authService';

describe('logoutUser', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        mockSignOut.mockReset();
        mockUnregisterThisDevice.mockReset();
    });
    afterEach(() => { vi.useRealTimers(); });

    it('removes this device first, then signs out (spec 3.3)', async () => {
        const order = [];
        mockUnregisterThisDevice.mockImplementation(async () => { order.push('unregister'); });
        mockSignOut.mockImplementation(async () => { order.push('signOut'); });

        const result = await logoutUser();

        expect(mockUnregisterThisDevice).toHaveBeenCalledWith('u1');
        expect(order).toEqual(['unregister', 'signOut']);
        expect(result).toEqual({ success: true });
    });

    it('does not let a hanging device removal block sign-out beyond the timeout', async () => {
        mockUnregisterThisDevice.mockReturnValue(new Promise(() => {})); // never resolves
        mockSignOut.mockResolvedValue();

        const resultPromise = logoutUser();

        // While the removal is pending and before the 2s timeout, sign-out must wait.
        await vi.advanceTimersByTimeAsync(1999);
        expect(mockSignOut).not.toHaveBeenCalled();

        // Once the timeout elapses, logout proceeds regardless of the stuck removal.
        await vi.advanceTimersByTimeAsync(1);
        const result = await resultPromise;

        expect(mockSignOut).toHaveBeenCalledOnce();
        expect(result).toEqual({ success: true });
    });

    it('still signs out when the device removal fails', async () => {
        mockUnregisterThisDevice.mockRejectedValue(new Error('offline'));
        mockSignOut.mockResolvedValue();

        const result = await logoutUser();

        expect(mockSignOut).toHaveBeenCalledOnce();
        expect(result).toEqual({ success: true });
    });
});
