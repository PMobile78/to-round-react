import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Typography, Button, IconButton } from '@mui/material';
import { CloseOutlined } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

const LogoutConfirmDialog = ({ open, onClose, isMobile, getDialogPaperStyles, onConfirm }) => {
    const { t } = useTranslation();

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xs"
            fullWidth
            PaperProps={{ sx: { borderRadius: 3, ...getDialogPaperStyles(), margin: isMobile ? 1 : 3 } }}
        >
            <DialogTitle sx={{ backgroundColor: 'primary.main', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {t('auth.logoutConfirm')}
                <IconButton onClick={onClose} sx={{ color: 'white' }}>
                    <CloseOutlined />
                </IconButton>
            </DialogTitle>
            <DialogContent sx={{ padding: isMobile ? 2 : 3 }}>
                <Typography variant="body1" sx={{ textAlign: 'center', padding: 2 }}>
                    {t('auth.logoutMessage')}
                </Typography>
            </DialogContent>
            <DialogActions sx={{ padding: isMobile ? 2 : 3, display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                <Button onClick={onClose} color="inherit" variant="outlined" fullWidth sx={{ borderRadius: 2, minHeight: isMobile ? 48 : 36 }}>
                    {t('bubbles.cancel')}
                </Button>
                <Button onClick={onConfirm} color="primary" variant="contained" fullWidth sx={{ borderRadius: 2, minHeight: isMobile ? 48 : 36 }}>
                    {t('auth.approveLogout')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default LogoutConfirmDialog;


