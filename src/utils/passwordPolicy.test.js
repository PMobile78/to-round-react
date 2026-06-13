import { describe, it, expect } from 'vitest';
import { evaluatePasswordStrength, validatePasswordForm } from './passwordPolicy';

describe('evaluatePasswordStrength', () => {
    it('returns null level for empty string', () => {
        expect(evaluatePasswordStrength('')).toEqual({ score: 0, level: null });
    });

    it('rates short letters-only as weak', () => {
        expect(evaluatePasswordStrength('abc')).toEqual({ score: 0, level: 'weak' });
    });

    it('rates 8+ chars with letters and digits as medium', () => {
        expect(evaluatePasswordStrength('abcdefg1')).toEqual({ score: 2, level: 'medium' });
    });

    it('rates long mixed-case with digits as strong', () => {
        expect(evaluatePasswordStrength('Abcdefg1')).toEqual({ score: 3, level: 'strong' });
    });
});

describe('validatePasswordForm', () => {
    it('returns no errors for a valid form', () => {
        expect(validatePasswordForm({
            currentPassword: 'old123', newPassword: 'newpass1', confirmPassword: 'newpass1'
        })).toEqual({});
    });

    it('flags new password shorter than 6', () => {
        expect(validatePasswordForm({
            currentPassword: 'old123', newPassword: 'abc', confirmPassword: 'abc'
        })).toEqual({ newPassword: 'tooShort' });
    });

    it('flags new password equal to current', () => {
        expect(validatePasswordForm({
            currentPassword: 'samepass', newPassword: 'samepass', confirmPassword: 'samepass'
        })).toEqual({ newPassword: 'sameAsCurrent' });
    });

    it('flags confirm mismatch', () => {
        expect(validatePasswordForm({
            currentPassword: 'old123', newPassword: 'newpass1', confirmPassword: 'newpass2'
        })).toEqual({ confirmPassword: 'mismatch' });
    });
});
