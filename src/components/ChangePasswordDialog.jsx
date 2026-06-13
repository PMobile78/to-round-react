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
