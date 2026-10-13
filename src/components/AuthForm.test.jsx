// @vitest-environment happy-dom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetPassword } from '../services/authService';
import AuthForm from './AuthForm';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../services/authService', () => ({
    createUser: vi.fn(),
    loginUser: vi.fn(),
    resetPassword: vi.fn(),
}));
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key) => key,
        i18n: { language: 'uk', resolvedLanguage: 'uk', changeLanguage: vi.fn() },
    }),
}));

describe('AuthForm forgot password', () => {
    let container;
    let root;

    const typeEmail = (value) => {
        const input = container.querySelector('input[type="email"]');
        const setNativeValue = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        act(() => {
            setNativeValue.call(input, value);
            input.dispatchEvent(new window.Event('input', { bubbles: true }));
        });
    };

    const clickForgotPassword = async () => {
        const button = Array.from(container.querySelectorAll('button'))
            .find((el) => el.textContent === 'auth.forgotPassword');
        expect(button, 'forgot password button').toBeDefined();
        await act(async () => button.click());
    };

    // MUI Alert exposes its severity as a `MuiAlert-color<Severity>` class.
    const alertTexts = (severity) =>
        Array.from(container.querySelectorAll(`.MuiAlert-color${severity}`), (el) => el.textContent);

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        act(() => root.render(<AuthForm onLoginSuccess={vi.fn()} toggleTheme={vi.fn()} />));
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
        vi.clearAllMocks();
    });

    it('sends the reset email to the entered address in the UI language and confirms it', async () => {
        resetPassword.mockResolvedValue({ success: true });
        typeEmail('user@example.com');

        await clickForgotPassword();

        expect(resetPassword).toHaveBeenCalledExactlyOnceWith('user@example.com', 'uk');
        expect(alertTexts('Success')).toEqual(['auth.resetEmailSent']);
        expect(alertTexts('Error')).toEqual([]);
    });

    it('asks for an email instead of sending when the field is empty', async () => {
        await clickForgotPassword();

        expect(resetPassword).not.toHaveBeenCalled();
        expect(alertTexts('Error')).toEqual(['auth.enterEmail']);
    });

    it('shows the service error when the reset email cannot be sent', async () => {
        resetPassword.mockResolvedValue({ success: false, error: 'User not found.' });
        typeEmail('missing@example.com');

        await clickForgotPassword();

        expect(alertTexts('Error')).toEqual(['User not found.']);
        expect(alertTexts('Success')).toEqual([]);
    });

    it('replaces the previous message on each new attempt', async () => {
        await clickForgotPassword();
        expect(alertTexts('Error')).toEqual(['auth.enterEmail']);

        resetPassword.mockResolvedValueOnce({ success: true });
        typeEmail('user@example.com');
        await clickForgotPassword();
        expect(alertTexts('Error')).toEqual([]);
        expect(alertTexts('Success')).toEqual(['auth.resetEmailSent']);

        resetPassword.mockResolvedValueOnce({ success: false, error: 'Too many attempts. Please try again later.' });
        await clickForgotPassword();
        expect(alertTexts('Success')).toEqual([]);
        expect(alertTexts('Error')).toEqual(['Too many attempts. Please try again later.']);
    });

    it('sends one reset request at a time', async () => {
        let finishFirstRequest;
        resetPassword
            .mockReturnValueOnce(new Promise((resolve) => { finishFirstRequest = resolve; }))
            .mockResolvedValue({ success: true });
        typeEmail('user@example.com');

        await clickForgotPassword();
        await clickForgotPassword();
        expect(resetPassword).toHaveBeenCalledTimes(1);

        await act(async () => finishFirstRequest({ success: true }));
        await clickForgotPassword();
        expect(resetPassword).toHaveBeenCalledTimes(2);
    });
});
