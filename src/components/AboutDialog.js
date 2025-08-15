import React, { useMemo } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box } from '@mui/material';

const APP_VERSION = process.env.REACT_APP_BUILD_VERSION || '0.0.1';

export default function AboutDialog({ open, onClose, t }) {
    const memoryInfo = useMemo(() => {
        try {
            const perf = window.performance;
            const mem = perf && perf.memory ? perf.memory : null;
            if (!mem) return null;
            const toMB = (bytes) => (bytes / (1024 * 1024)).toFixed(1);
            return {
                jsHeapSizeLimit: toMB(mem.jsHeapSizeLimit),
                totalJSHeapSize: toMB(mem.totalJSHeapSize),
                usedJSHeapSize: toMB(mem.usedJSHeapSize)
            };
        } catch (_) {
            return null;
        }
    }, []);
    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{t ? t('bubbles.about') : 'About'}</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Typography variant="body2">Version: {APP_VERSION}</Typography>
                    <Typography variant="body2">Build time: {process.env.REACT_APP_BUILD_TIME || '-'}</Typography>
                    <Typography variant="body2">Commit: {process.env.REACT_APP_GIT_SHA || '-'}</Typography>
                    {memoryInfo && (
                        <Box sx={{ mt: 1 }}>
                            <Typography variant="body2">
                                {t ? t('bubbles.memoryUsage') : 'Memory usage'}: {memoryInfo.usedJSHeapSize} MB / {memoryInfo.totalJSHeapSize} MB
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {t ? t('bubbles.memoryLimit') : 'Limit'}: {memoryInfo.jsHeapSizeLimit} MB
                            </Typography>
                        </Box>
                    )}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>OK</Button>
            </DialogActions>
        </Dialog>
    );
}


