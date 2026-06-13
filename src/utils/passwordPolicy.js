// Advisory password-strength score (does not block submit).
export const evaluatePasswordStrength = (password) => {
    if (!password) return { score: 0, level: null };
    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-zA-Z]/.test(password) && /\d/.test(password)) score++;
    if (/[A-Z]/.test(password) || /[^a-zA-Z0-9]/.test(password)) score++;
    const level = score <= 1 ? 'weak' : score === 2 ? 'medium' : 'strong';
    return { score, level };
};

// Client-side form validation. Returns a map of field -> error key.
// Empty object means valid. Empty fields produce no error here (handled by
// the submit button's disabled state).
export const validatePasswordForm = ({ currentPassword, newPassword, confirmPassword }) => {
    const errors = {};
    if (newPassword) {
        if (newPassword.length < 6) {
            errors.newPassword = 'tooShort';
        } else if (currentPassword && newPassword === currentPassword) {
            errors.newPassword = 'sameAsCurrent';
        }
    }
    if (confirmPassword && confirmPassword !== newPassword) {
        errors.confirmPassword = 'mismatch';
    }
    return errors;
};
