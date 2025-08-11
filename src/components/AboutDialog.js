import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box } from '@mui/material';

const APP_VERSION = process.env.REACT_APP_BUILD_VERSION || 'dev';

export default function AboutDialog({ open, onClose, t }) {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{t ? t('bubbles.about') : 'About'}</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Typography variant="body2">Version: {APP_VERSION}</Typography>
                    <Typography variant="body2">Build time: {process.env.REACT_APP_BUILD_TIME || '-'}</Typography>
                    <Typography variant="body2">Commit: {process.env.REACT_APP_GIT_SHA || '-'}</Typography>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>OK</Button>
            </DialogActions>
        </Dialog>
    );
}


