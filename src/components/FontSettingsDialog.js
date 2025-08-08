import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography, Button, IconButton } from '@mui/material';
import { CloseOutlined } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

const FontSettingsDialog = ({
    open,
    onClose,
    isSmallScreen,
    isMobile,
    themeMode,
    getDialogPaperStyles,
    fontSize,
    onFontSizeChange,
    onReset
}) => {
    const { t } = useTranslation();

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            fullScreen={isSmallScreen}
            PaperProps={{ sx: { borderRadius: isSmallScreen ? 0 : 3, ...getDialogPaperStyles(), margin: isMobile ? 1 : 3 } }}
        >
            <DialogTitle sx={{ backgroundColor: 'primary.main', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {t('bubbles.fontSettings')}
                <IconButton onClick={onClose} sx={{ color: 'white' }}>
                    <CloseOutlined />
                </IconButton>
            </DialogTitle>
            <DialogContent sx={{ padding: isMobile ? 2 : 3 }}>
                <Typography variant="h6" gutterBottom>
                    {t('bubbles.fontSizeLabel')}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, marginBottom: 3 }}>
                    <Typography variant="body2" sx={{ minWidth: 40 }}>
                        {t('bubbles.small')}
                    </Typography>
                    <Box sx={{ flex: 1 }}>
                        <Box
                            component="input"
                            type="range"
                            min="8"
                            max="20"
                            value={fontSize}
                            onChange={(e) => onFontSizeChange(parseInt(e.target.value))}
                            sx={{
                                width: '100%',
                                height: 6,
                                borderRadius: 3,
                                appearance: 'none',
                                backgroundColor: '#E0E0E0',
                                outline: 'none',
                                cursor: 'pointer',
                                background: `linear-gradient(to right, #1976d2 0%, #1976d2 ${((fontSize - 8) / 12) * 100}%, #E0E0E0 ${((fontSize - 8) / 12) * 100}%, #E0E0E0 100%)`,
                                '&::-webkit-slider-thumb': { appearance: 'none', width: 20, height: 20, borderRadius: '50%', backgroundColor: '#1976d2', cursor: 'pointer', border: '2px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' },
                                '&::-moz-range-thumb': { width: 20, height: 20, borderRadius: '50%', backgroundColor: '#1976d2', cursor: 'pointer', border: '2px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }
                            }}
                        />
                    </Box>
                    <Typography variant="body2" sx={{ minWidth: 40 }}>
                        {t('bubbles.large')}
                    </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ marginBottom: 2 }}>
                    {t('bubbles.currentSize')}: {fontSize}px
                </Typography>
                <Box sx={{ border: '1px solid #E0E0E0', borderRadius: 2, padding: 2, backgroundColor: '#F5F5F5', textAlign: 'center', minHeight: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography sx={{ fontSize: isMobile ? fontSize * 0.75 : fontSize, fontWeight: 'bold', color: '#2C3E50' }}>
                        {t('bubbles.previewText')}
                    </Typography>
                </Box>
            </DialogContent>
            <DialogActions sx={{ padding: isMobile ? 2 : 3 }}>
                <Button onClick={onClose} color="inherit" fullWidth={isSmallScreen}>
                    {t('bubbles.close')}
                </Button>
                <Button onClick={onReset} variant="outlined" fullWidth={isSmallScreen}>
                    {t('bubbles.reset')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default FontSettingsDialog;


