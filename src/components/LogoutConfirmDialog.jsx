import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Typography, Button, IconButton, CircularProgress } from '@mui/material';
import { CloseOutlined } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

const LogoutConfirmDialog = ({ open, onClose, isMobile, getDialogPaperStyles, onConfirm }) => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);

    // Guard against a double-submit and give feedback while logout (which does a
    // best-effort FCM token cleanup + sign-out) is in flight.
    const handleConfirm = async () => {
        if (loading) return;
        setLoading(true);
        try {
            await onConfirm();
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={loading ? undefined : onClose}
            maxWidth="xs"
            fullWidth
            PaperProps={{ sx: { borderRadius: 3, ...getDialogPaperStyles(), margin: isMobile ? 1 : 3 } }}
        >
            <DialogTitle sx={{ color: 'text.primary', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {t('auth.logoutConfirm')}
                <IconButton onClick={onClose} disabled={loading} sx={{ color: 'text.primary' }}>
                    <CloseOutlined />
                </IconButton>
            </DialogTitle>
            <DialogContent sx={{ padding: isMobile ? 2 : 3 }}>
                <Typography variant="body1" sx={{ textAlign: 'center', padding: 2 }}>
                    {t('auth.logoutMessage')}
                </Typography>
            </DialogContent>
            <DialogActions sx={{ padding: isMobile ? 2 : 3, display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                <Button onClick={onClose} disabled={loading} color="inherit" variant="outlined" fullWidth sx={{ borderRadius: 2, minHeight: isMobile ? 48 : 36 }}>
                    {t('bubbles.cancel')}
                </Button>
                <Button
                    onClick={handleConfirm}
                    disabled={loading}
                    color="primary"
                    variant="contained"
                    fullWidth
                    startIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}
                    sx={{ borderRadius: 2, minHeight: isMobile ? 48 : 36 }}
                >
                    {t('auth.approveLogout')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default LogoutConfirmDialog;


