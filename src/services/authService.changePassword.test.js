import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../firebase', () => ({ auth: { currentUser: { email: 'user@example.com' } } }));

const mockReauth = vi.fn();
const mockUpdate = vi.fn();
vi.mock('firebase/auth', () => ({
    createUserWithEmailAndPassword: vi.fn(),
    signInWithEmailAndPassword: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChanged: vi.fn(),
    sendPasswordResetEmail: vi.fn(),
    updateProfile: vi.fn(),
    EmailAuthProvider: { credential: vi.fn(() => ({ fake: 'credential' })) },
    reauthenticateWithCredential: (...args) => mockReauth(...args),
    updatePassword: (...args) => mockUpdate(...args),
}));

import { changePassword } from './authService';

describe('changePassword', () => {
    beforeEach(() => { mockReauth.mockReset(); mockUpdate.mockReset(); });

    it('reauthenticates then updates the password on success', async () => {
        mockReauth.mockResolvedValue();
        mockUpdate.mockResolvedValue();
        const result = await changePassword('oldPass', 'newPass1');
        expect(mockReauth).toHaveBeenCalledOnce();
        expect(mockUpdate).toHaveBeenCalledWith({ email: 'user@example.com' }, 'newPass1');
        expect(result).toEqual({ success: true });
    });

    it('returns the firebase error code on wrong current password', async () => {
        mockReauth.mockRejectedValue({ code: 'auth/wrong-password' });
        const result = await changePassword('badPass', 'newPass1');
        expect(mockUpdate).not.toHaveBeenCalled();
        expect(result.success).toBe(false);
        expect(result.code).toBe('auth/wrong-password');
    });
});
