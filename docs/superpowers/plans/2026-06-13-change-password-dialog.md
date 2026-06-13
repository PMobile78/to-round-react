# Change Password Dialog Implementation Plan

## ✅ STATUS: COMPLETE (2026-06-13)

Все 6 задач выполнены через subagent-driven development (субагенты на sonnet) с двухстадийным ревью каждой (соответствие спеке → качество кода) + финальное ревью всей фичи (READY TO MERGE). Коммиты: `c42a9f9`, `3e2fb9a`, `379c892`, `736a3c6`, `116f7d7`. 33/33 теста зелёные, `npm run build` успешно. GitHub issues #9–#15 закрыты. Живая ручная QA пройдена в **обеих локалях (en + uk)**: happy-path с реальной сменой пароля и откатом + повторным входом, несовпадение повтора, < 6 символов, новый = текущему, неверный текущий пароль, индикатор силы, сброс состояния диалога, тёмная тема. Ветка `feature/change-password-dialog` пока **НЕ смержена** (push в `main` = деплой; решение о merge/PR за владельцем).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить окно «Сменить пароль» для залогиненного пользователя (email/password) с реаутентификацией, живой валидацией, советующим индикатором силы и экраном успеха.

**Architecture:** Чистая логика (оценка силы пароля + валидация формы) выносится в тестируемый util `src/utils/passwordPolicy.js`. Сервисный метод `changePassword` в `authService.js` делает `reauthenticateWithCredential` + `updatePassword`. UI — `ChangePasswordDialog.jsx` по паттерну `FontSettingsDialog` (MUI `Dialog` + `getDialogPaperStyles`), открывается из `MainMenuDrawer`, состояние живёт в `BubblesPage`. i18n — `changePassword` блок в `translation.json` (en/uk).

**Tech Stack:** React, MUI v5, Firebase Auth, i18next, Vitest (node env — только юнит-тесты чистых функций и сервиса с `vi.mock`).

**Спека:** `docs/superpowers/specs/2026-06-13-change-password-dialog-design.md` · GitHub issue #9.

---

## File Structure

- **Create** `src/utils/passwordPolicy.js` — чистые функции `evaluatePasswordStrength`, `validatePasswordForm`.
- **Create** `src/utils/passwordPolicy.test.js` — юнит-тесты util.
- **Create** `src/services/authService.changePassword.test.js` — юнит-тест сервиса (мок Firebase).
- **Modify** `src/services/authService.js` — добавить `changePassword`, error-ключ `auth/requires-recent-login`.
- **Create** `src/components/ChangePasswordDialog.jsx` — окно.
- **Modify** `src/components/MainMenuDrawer.jsx` — пункт «Сменить пароль».
- **Modify** `src/pages/BubblesPage.jsx` — состояние + рендер диалога, проброс в drawer.
- **Modify** `src/locales/en/translation.json`, `src/locales/uk/translation.json` — i18n.

---

## Task 1: passwordPolicy util (чистая логика, TDD)

**Files:**
- Create: `src/utils/passwordPolicy.js`
- Test: `src/utils/passwordPolicy.test.js`

- [x] **Step 1: Write the failing tests**

Создать `src/utils/passwordPolicy.test.js`:

```js
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
```

- [x] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/utils/passwordPolicy.test.js`
Expected: FAIL — «Failed to resolve import "./passwordPolicy"» / функции не определены.

- [x] **Step 3: Write minimal implementation**

Создать `src/utils/passwordPolicy.js`:

```js
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
```

- [x] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/utils/passwordPolicy.test.js`
Expected: PASS — все 8 тестов зелёные.

- [x] **Step 5: Commit**

```bash
git add src/utils/passwordPolicy.js src/utils/passwordPolicy.test.js
git commit -m "feat(auth): password policy util (strength + form validation)"
```

---

## Task 2: authService.changePassword (TDD с моком Firebase)

**Files:**
- Modify: `src/services/authService.js`
- Test: `src/services/authService.changePassword.test.js`

- [x] **Step 1: Write the failing test**

Создать `src/services/authService.changePassword.test.js`:

```js
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
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- src/services/authService.changePassword.test.js`
Expected: FAIL — `changePassword` не экспортируется.

- [x] **Step 3: Add the import and error key, then implement changePassword**

В `src/services/authService.js` дополнить импорт из `firebase/auth` (добавить три имени к существующему списку):

```js
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    updateProfile,
    EmailAuthProvider,
    reauthenticateWithCredential,
    updatePassword
} from 'firebase/auth';
```

В объект `firebaseErrorMessages` добавить строку:

```js
    'auth/requires-recent-login': 'Please sign in again and retry.',
```

Добавить новый экспорт (рядом с `resetPassword`):

```js
// Change password for the currently signed-in email/password user.
// Requires reauthentication because Firebase rejects updatePassword on stale sessions.
export const changePassword = async (currentPassword, newPassword) => {
    try {
        const user = auth.currentUser;
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, newPassword);
        return { success: true };
    } catch (error) {
        logger.error('Error changing password:', error);
        return { success: false, error: mapFirebaseError(error), code: error.code };
    }
};
```

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -- src/services/authService.changePassword.test.js`
Expected: PASS — оба теста зелёные.

- [x] **Step 5: Commit**

```bash
git add src/services/authService.js src/services/authService.changePassword.test.js
git commit -m "feat(auth): changePassword service with reauthentication"
```

---

## Task 3: i18n keys (en + uk)

**Files:**
- Modify: `src/locales/en/translation.json`
- Modify: `src/locales/uk/translation.json`

- [x] **Step 1: Add the `changePassword` block to English**

В `src/locales/en/translation.json` после блока `"design": { ... },` (он закрывается перед `"categories": {`) вставить новый top-level блок:

```json
    "changePassword": {
        "menuLabel": "Change Password",
        "title": "Change Password",
        "currentPassword": "Current password",
        "newPassword": "New password",
        "confirmPassword": "Repeat new password",
        "strength": {
            "weak": "Weak",
            "medium": "Medium",
            "strong": "Strong"
        },
        "errors": {
            "tooShort": "At least 6 characters",
            "sameAsCurrent": "New password matches the current one",
            "mismatch": "Passwords do not match",
            "wrongPassword": "Incorrect current password",
            "requiresRecentLogin": "Please sign in again and retry",
            "generic": "Something went wrong. Please try again."
        },
        "success": {
            "title": "Password changed",
            "message": "Use the new password the next time you sign in."
        },
        "cancel": "Cancel",
        "save": "Save",
        "done": "Done"
    },
```

- [x] **Step 2: Add the `changePassword` block to Ukrainian**

В `src/locales/uk/translation.json` в той же позиции (после блока `"design": { ... },`) вставить:

```json
    "changePassword": {
        "menuLabel": "Змінити пароль",
        "title": "Змінити пароль",
        "currentPassword": "Поточний пароль",
        "newPassword": "Новий пароль",
        "confirmPassword": "Повторіть новий пароль",
        "strength": {
            "weak": "Слабкий",
            "medium": "Середній",
            "strong": "Надійний"
        },
        "errors": {
            "tooShort": "Мінімум 6 символів",
            "sameAsCurrent": "Новий пароль збігається з поточним",
            "mismatch": "Паролі не збігаються",
            "wrongPassword": "Невірний поточний пароль",
            "requiresRecentLogin": "Будь ласка, увійдіть знову та повторіть",
            "generic": "Сталася помилка. Спробуйте ще раз."
        },
        "success": {
            "title": "Пароль змінено",
            "message": "Використовуйте новий пароль під час наступного входу."
        },
        "cancel": "Скасувати",
        "save": "Зберегти",
        "done": "Готово"
    },
```

- [x] **Step 3: Verify JSON is valid**

Run: `node -e "JSON.parse(require('fs').readFileSync('src/locales/en/translation.json','utf8')); JSON.parse(require('fs').readFileSync('src/locales/uk/translation.json','utf8')); console.log('OK')"`
Expected: `OK` (никаких SyntaxError — проверь висячие запятые).

- [x] **Step 4: Commit**

```bash
git add src/locales/en/translation.json src/locales/uk/translation.json
git commit -m "feat(i18n): change password dialog strings (en, uk)"
```

---

## Task 4: ChangePasswordDialog component

**Files:**
- Create: `src/components/ChangePasswordDialog.jsx`

- [x] **Step 1: Create the component**

Создать `src/components/ChangePasswordDialog.jsx`:

```jsx
import React, { useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography,
    Button, IconButton, TextField, InputAdornment, LinearProgress, Alert, CircularProgress
} from '@mui/material';
import { CloseOutlined, Visibility, VisibilityOff, CheckCircleOutline } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { changePassword } from '../services/authService';
import { evaluatePasswordStrength, validatePasswordForm } from '../utils/passwordPolicy';

const STRENGTH_COLOR = { weak: 'error', medium: 'warning', strong: 'success' };
const STRENGTH_VALUE = { weak: 33, medium: 66, strong: 100 };

const ChangePasswordDialog = ({ open, onClose, isSmallScreen, isMobile, getDialogPaperStyles }) => {
    const { t } = useTranslation();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [touched, setTouched] = useState({ current: false, next: false, confirm: false });
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [phase, setPhase] = useState('form'); // 'form' | 'loading' | 'success'
    const [serverError, setServerError] = useState(null); // { field: 'current' | null, key }

    const errors = validatePasswordForm({ currentPassword, newPassword, confirmPassword });
    const strength = evaluatePasswordStrength(newPassword);
    const isValid =
        Object.keys(errors).length === 0 && !!currentPassword && !!newPassword && !!confirmPassword;

    const resetState = () => {
        setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
        setTouched({ current: false, next: false, confirm: false });
        setShowCurrent(false); setShowNew(false);
        setPhase('form'); setServerError(null);
    };

    const handleClose = () => { resetState(); onClose(); };

    const handleSubmit = async () => {
        setPhase('loading');
        setServerError(null);
        const result = await changePassword(currentPassword, newPassword);
        if (result.success) {
            setPhase('success');
            return;
        }
        setPhase('form');
        if (result.code === 'auth/wrong-password') {
            setServerError({ field: 'current', key: 'wrongPassword' });
        } else if (result.code === 'auth/requires-recent-login') {
            setServerError({ field: null, key: 'requiresRecentLogin' });
        } else {
            setServerError({ field: null, key: 'generic' });
        }
    };

    const loading = phase === 'loading';
    const currentError = serverError?.field === 'current'
        ? t(`changePassword.errors.${serverError.key}`)
        : '';
    const newError = touched.next && errors.newPassword
        ? t(`changePassword.errors.${errors.newPassword}`)
        : '';
    const confirmError = touched.confirm && errors.confirmPassword
        ? t(`changePassword.errors.${errors.confirmPassword}`)
        : '';
    const alertError = serverError && serverError.field === null
        ? t(`changePassword.errors.${serverError.key}`)
        : '';

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="sm"
            fullWidth
            fullScreen={isSmallScreen}
            PaperProps={{ sx: { borderRadius: isSmallScreen ? 0 : 3, ...getDialogPaperStyles(), margin: isMobile ? 1 : 3 } }}
        >
            <DialogTitle sx={{ color: 'text.primary', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {t('changePassword.title')}
                <IconButton onClick={handleClose} sx={{ color: 'text.primary' }}>
                    <CloseOutlined />
                </IconButton>
            </DialogTitle>

            {phase === 'success' ? (
                <DialogContent sx={{ padding: isMobile ? 3 : 4, textAlign: 'center' }}>
                    <CheckCircleOutline sx={{ fontSize: 56, color: 'success.main' }} />
                    <Typography variant="h6" sx={{ mt: 1, color: 'text.primary' }}>
                        {t('changePassword.success.title')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {t('changePassword.success.message')}
                    </Typography>
                </DialogContent>
            ) : (
                <DialogContent sx={{ padding: isMobile ? 2 : 3 }}>
                    <TextField
                        fullWidth
                        margin="normal"
                        type={showCurrent ? 'text' : 'password'}
                        label={t('changePassword.currentPassword')}
                        value={currentPassword}
                        disabled={loading}
                        onChange={(e) => { setCurrentPassword(e.target.value); if (serverError?.field === 'current') setServerError(null); }}
                        onBlur={() => setTouched((s) => ({ ...s, current: true }))}
                        error={!!currentError}
                        helperText={currentError}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton onClick={() => setShowCurrent((v) => !v)} edge="end">
                                        {showCurrent ? <VisibilityOff /> : <Visibility />}
                                    </IconButton>
                                </InputAdornment>
                            )
                        }}
                    />

                    <TextField
                        fullWidth
                        margin="normal"
                        type={showNew ? 'text' : 'password'}
                        label={t('changePassword.newPassword')}
                        value={newPassword}
                        disabled={loading}
                        onChange={(e) => setNewPassword(e.target.value)}
                        onBlur={() => setTouched((s) => ({ ...s, next: true }))}
                        error={!!newError}
                        helperText={newError}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton onClick={() => setShowNew((v) => !v)} edge="end">
                                        {showNew ? <VisibilityOff /> : <Visibility />}
                                    </IconButton>
                                </InputAdornment>
                            )
                        }}
                    />

                    {strength.level && (
                        <Box sx={{ mt: 0.5, mb: 1 }}>
                            <LinearProgress
                                variant="determinate"
                                value={STRENGTH_VALUE[strength.level]}
                                color={STRENGTH_COLOR[strength.level]}
                                sx={{ height: 5, borderRadius: 3 }}
                            />
                            <Typography variant="caption" sx={{ color: `${STRENGTH_COLOR[strength.level]}.main` }}>
                                {t(`changePassword.strength.${strength.level}`)}
                            </Typography>
                        </Box>
                    )}

                    <TextField
                        fullWidth
                        margin="normal"
                        type="password"
                        label={t('changePassword.confirmPassword')}
                        value={confirmPassword}
                        disabled={loading}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        onBlur={() => setTouched((s) => ({ ...s, confirm: true }))}
                        error={!!confirmError}
                        helperText={confirmError}
                    />

                    {alertError && (
                        <Alert severity="error" sx={{ mt: 2 }}>{alertError}</Alert>
                    )}
                </DialogContent>
            )}

            <DialogActions sx={{ padding: isMobile ? 2 : 3 }}>
                {phase === 'success' ? (
                    <Button onClick={handleClose} variant="contained" fullWidth={isSmallScreen}>
                        {t('changePassword.done')}
                    </Button>
                ) : (
                    <>
                        <Button onClick={handleClose} color="inherit" disabled={loading}>
                            {t('changePassword.cancel')}
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            variant="contained"
                            disabled={!isValid || loading}
                            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
                        >
                            {t('changePassword.save')}
                        </Button>
                    </>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default ChangePasswordDialog;
```

- [x] **Step 2: Verify it builds**

Run: `npm run build`
Expected: сборка успешна, без ошибок про неразрешённые импорты.

- [x] **Step 3: Commit**

```bash
git add src/components/ChangePasswordDialog.jsx
git commit -m "feat(auth): ChangePasswordDialog component"
```

---

## Task 5: Wire the dialog into BubblesPage and MainMenuDrawer

**Files:**
- Modify: `src/pages/BubblesPage.jsx`
- Modify: `src/components/MainMenuDrawer.jsx`

- [x] **Step 1: Import the component in BubblesPage**

В `src/pages/BubblesPage.jsx` после строки `import AppearanceDialog from '../components/AppearanceDialog';` (≈ строка 28) добавить:

```jsx
import ChangePasswordDialog from '../components/ChangePasswordDialog';
```

- [x] **Step 2: Add dialog state**

В `src/pages/BubblesPage.jsx` после строки `const [appearanceDialogOpen, setAppearanceDialogOpen] = useState(false); // Диалог оформления` (≈ строка 289) добавить:

```jsx
    const [changePasswordOpen, setChangePasswordOpen] = useState(false); // Диалог смены пароля
```

- [x] **Step 3: Pass the open handler to MainMenuDrawer**

В `src/pages/BubblesPage.jsx` после строки `onOpenAppearanceDialog={() => setAppearanceDialogOpen(true)}` (≈ строка 2745) добавить:

```jsx
                onOpenChangePasswordDialog={() => setChangePasswordOpen(true)}
```

- [x] **Step 4: Render the dialog**

В `src/pages/BubblesPage.jsx` сразу после закрывающего тега `<AppearanceDialog ... />` (блок начинается ≈ строка 2850) добавить:

```jsx
            <ChangePasswordDialog
                open={changePasswordOpen}
                onClose={() => setChangePasswordOpen(false)}
                isSmallScreen={isSmallScreen}
                isMobile={isMobile}
                getDialogPaperStyles={getDialogPaperStyles}
            />
```

- [x] **Step 5: Add the menu item in MainMenuDrawer**

В `src/components/MainMenuDrawer.jsx` добавить иконку в импорт из `@mui/icons-material` (в существующий список, например после `AccountTreeOutlined`):

```jsx
    LockOutlined
```

Добавить проп в деструктуризацию пропсов (после `onOpenAppearanceDialog,`):

```jsx
    onOpenChangePasswordDialog,
```

После блока `<ListItem>` пункта «Оформление» (он заканчивается на `</ListItem>` ≈ строка 230, перед `<Divider ... />` на строке 232) вставить:

```jsx
                    <ListItem
                        button
                        onClick={() => {
                            onClose();
                            onOpenChangePasswordDialog && onOpenChangePasswordDialog();
                        }}
                        sx={{ padding: '16px 24px', cursor: 'pointer', '&:hover': { backgroundColor: themeMode === 'light' ? '#F8F9FA' : '#333333' } }}
                    >
                        <ListItemIcon sx={{ minWidth: 40 }}>
                            <LockOutlined sx={{ color: themeMode === 'light' ? '#BDC3C7' : '#aaaaaa' }} />
                        </ListItemIcon>
                        <ListItemText
                            primary={t('changePassword.menuLabel')}
                            primaryTypographyProps={{ color: themeMode === 'light' ? '#2C3E50' : '#ffffff', fontWeight: 500 }}
                        />
                    </ListItem>
```

- [x] **Step 6: Verify it builds and tests pass**

Run: `npm run build && npm test`
Expected: сборка успешна; тесты зелёные (util + service).

- [x] **Step 7: Commit**

```bash
git add src/pages/BubblesPage.jsx src/components/MainMenuDrawer.jsx
git commit -m "feat(auth): wire ChangePasswordDialog into menu"
```

---

## Task 6: Manual verification

**Files:** нет (ручная проверка).

- [x] **Step 1: Run the dev server**

Run: `npm start`
Открыть приложение, залогиниться (email/password).

- [x] **Step 2: Verify the happy path**

Открыть меню → «Сменить пароль». Ввести верный текущий пароль, новый (≥6, отличный от текущего), совпадающий повтор → «Сохранить» → появляется экран с зелёной галочкой и «Готово». Закрыть, выйти, войти с новым паролем — успешно.

Expected: пароль реально сменился.

- [x] **Step 3: Verify validation and errors**

- Повтор ≠ новый → красный helperText «Пароли не совпадают», «Сохранить» неактивна.
- Новый < 6 → «Минимум 6 символов».
- Новый = текущему → «Новый пароль совпадает с текущим».
- Неверный текущий пароль → после «Сохранить» helperText под полем текущего «Неверный текущий пароль».
- Индикатор силы меняет цвет/ярлык по мере ввода нового пароля и не блокирует сохранение.

- [x] **Step 4: Verify theming (chrome-devtools)**

Проверить окно в light/dark и desktop/mobile: фон/текст наследуют тему (нет «прибитых» цветов фона), цвета индикатора/ошибок/успеха читаемы. Переключить пару скинов (если доступны) — окно наследует оформление.

- [x] **Step 5: Final commit if any tweaks were needed**

```bash
git add -A
git commit -m "fix(auth): change password dialog polish after manual QA"
```

---

## Notes

- **Не пушить** — push в этом репозитории = деплой (см. CLAUDE.md / project memory).
- Тестовая инфраструктура — node-окружение Vitest без jsdom/testing-library, поэтому компонент не покрывается юнит-тестами; вся тестируемая логика вынесена в `passwordPolicy.js` и сервис.
- Цвета индикатора/ошибок берутся из палитры MUI (`error`/`warning`/`success`), что обеспечивает корректность во всех скинах оси `design`.
