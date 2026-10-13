// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../firebase', () => ({ auth: { languageCode: null } }));

const mockSendPasswordResetEmail = vi.fn();
vi.mock('firebase/auth', () => ({
    createUserWithEmailAndPassword: vi.fn(),
    signInWithEmailAndPassword: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChanged: vi.fn(),
    sendPasswordResetEmail: (...args) => mockSendPasswordResetEmail(...args),
    updateProfile: vi.fn(),
    EmailAuthProvider: { credential: vi.fn() },
    reauthenticateWithCredential: vi.fn(),
    updatePassword: vi.fn(),
}));
vi.mock('../firebaseMessaging', () => ({ removeCurrentToken: vi.fn() }));

import { auth } from '../firebase';
import { resetPassword } from './authService';

describe('resetPassword', () => {
    beforeEach(() => { mockSendPasswordResetEmail.mockReset(); auth.languageCode = null; });
    afterEach(() => { vi.unstubAllEnvs(); });

    it('sends the email in the requested language', async () => {
        let languageAtSend;
        mockSendPasswordResetEmail.mockImplementation(async (authArg) => { languageAtSend = authArg.languageCode; });

        const result = await resetPassword('user@example.com', 'uk');

        expect(languageAtSend).toBe('uk');
        expect(result).toEqual({ success: true });
    });

    it('links the email back to the app root', async () => {
        // Vitest serves from '/'; use the production base (vite.config.js) to check it is kept.
        vi.stubEnv('BASE_URL', '/to-round-react/');
        mockSendPasswordResetEmail.mockResolvedValue();

        await resetPassword('user@example.com', 'en');

        expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(
            auth,
            'user@example.com',
            { url: 'http://localhost:3000/to-round-react/' },
        );
    });
});
