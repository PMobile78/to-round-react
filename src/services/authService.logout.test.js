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

const mockRemoveCurrentToken = vi.fn();
vi.mock('../firebaseMessaging', () => ({
    removeCurrentToken: (...args) => mockRemoveCurrentToken(...args),
}));

import { logoutUser } from './authService';

describe('logoutUser', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        mockSignOut.mockReset();
        mockRemoveCurrentToken.mockReset();
    });
    afterEach(() => { vi.useRealTimers(); });

    it('removes the token then signs out on the happy path', async () => {
        mockRemoveCurrentToken.mockResolvedValue();
        mockSignOut.mockResolvedValue();

        const result = await logoutUser();

        expect(mockRemoveCurrentToken).toHaveBeenCalledOnce();
        expect(mockSignOut).toHaveBeenCalledOnce();
        expect(result).toEqual({ success: true });
    });

    it('does not let a hanging token cleanup block sign-out beyond the timeout', async () => {
        mockRemoveCurrentToken.mockReturnValue(new Promise(() => {})); // never resolves
        mockSignOut.mockResolvedValue();

        const resultPromise = logoutUser();

        // While the cleanup is pending and before the 2s timeout, sign-out must wait.
        await vi.advanceTimersByTimeAsync(1999);
        expect(mockSignOut).not.toHaveBeenCalled();

        // Once the timeout elapses, logout proceeds regardless of the stuck cleanup.
        await vi.advanceTimersByTimeAsync(1);
        const result = await resultPromise;

        expect(mockSignOut).toHaveBeenCalledOnce();
        expect(result).toEqual({ success: true });
    });

    it('still signs out when token cleanup rejects', async () => {
        mockRemoveCurrentToken.mockRejectedValue(new Error('FCM down'));
        mockSignOut.mockResolvedValue();

        const result = await logoutUser();

        expect(mockSignOut).toHaveBeenCalledOnce();
        expect(result).toEqual({ success: true });
    });
});
