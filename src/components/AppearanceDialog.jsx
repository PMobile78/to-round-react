import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    Box,
    Typography,
    IconButton,
    ToggleButton,
    ToggleButtonGroup,
    Card,
    CardContent,
    Grid
} from '@mui/material';
import { CloseOutlined, LightMode, DarkMode, SettingsSuggest } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

const AppearanceDialog = ({
    open,
    onClose,
    isSmallScreen,
    isMobile,
    themeMode,
    setThemeMode,
    design,
    setDesign,
    designs,
    getDialogPaperStyles,
}) => {
    const { t } = useTranslation();

    const handleModeChange = (event, newMode) => {
        if (newMode !== null) {
            setThemeMode(newMode);
        }
    };

    const handleDesignSelect = (designId) => {
        setDesign(designId);
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            fullScreen={isSmallScreen}
            PaperProps={{
                sx: {
                    borderRadius: isSmallScreen ? 0 : 3,
                    ...getDialogPaperStyles(),
                    margin: isMobile ? 1 : 3
                }
            }}
        >
            <DialogTitle
                sx={{
                    color: 'text.primary',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}
            >
                {t('appearance.title')}
                <IconButton onClick={onClose} sx={{ color: 'text.primary' }}>
                    <CloseOutlined />
                </IconButton>
            </DialogTitle>
            <DialogContent sx={{ padding: isMobile ? 2 : 3 }}>
                {/* Theme Mode Section */}
                <Typography variant="h6" gutterBottom sx={{ marginBottom: 2 }}>
                    {t('appearance.themeMode')}
                </Typography>
                <Box sx={{ marginBottom: 4 }}>
                    <ToggleButtonGroup
                        value={themeMode}
                        exclusive
                        onChange={handleModeChange}
                        fullWidth
                        sx={{
                            '& .MuiToggleButton-root': {
                                textTransform: 'none',
                                flex: 1,
                                padding: '8px 12px',
                                fontSize: '0.9rem'
                            }
                        }}
                    >
                        <ToggleButton value="light" aria-label="light">
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <LightMode sx={{ fontSize: '1.2rem' }} />
                                <span>{t('theme.lightMode')}</span>
                            </Box>
                        </ToggleButton>
                        <ToggleButton value="dark" aria-label="dark">
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <DarkMode sx={{ fontSize: '1.2rem' }} />
                                <span>{t('theme.darkMode')}</span>
                            </Box>
                        </ToggleButton>
                        <ToggleButton value="system" aria-label="system">
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <SettingsSuggest sx={{ fontSize: '1.2rem' }} />
                                <span>{t('theme.systemMode')}</span>
                            </Box>
                        </ToggleButton>
                    </ToggleButtonGroup>
                </Box>

                {/* Design Section */}
                <Typography variant="h6" gutterBottom sx={{ marginBottom: 2 }}>
                    {t('appearance.design')}
                </Typography>
                <Grid container spacing={2}>
                    {Object.values(designs).map((designMeta) => (
                        <Grid item xs={6} sm={6} key={designMeta.id}>
                            <Card
                                onClick={() => handleDesignSelect(designMeta.id)}
                                sx={{
                                    cursor: 'pointer',
                                    border:
                                        design === designMeta.id
                                            ? '3px solid'
                                            : '1px solid',
                                    borderColor:
                                        design === designMeta.id
                                            ? 'primary.main'
                                            : 'divider',
                                    transition: 'all 0.2s ease',
                                    '&:hover': {
                                        boxShadow: design === designMeta.id ? 4 : 1,
                                        transform: design === designMeta.id ? 'scale(1.02)' : 'scale(1)'
                                    }
                                }}
                            >
                                <CardContent sx={{ padding: '12px', textAlign: 'center' }}>
                                    {/* Preview color swatches */}
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            gap: 1,
                                            justifyContent: 'center',
                                            marginBottom: 1
                                        }}
                                    >
                                        {designMeta.previewColors &&
                                            ['primary', 'secondary', 'background'].map((colorKey) => (
                                                <Box
                                                    key={colorKey}
                                                    sx={{
                                                        width: 24,
                                                        height: 24,
                                                        borderRadius: 1,
                                                        backgroundColor: designMeta.previewColors[colorKey],
                                                        border: '1px solid rgba(0,0,0,0.1)'
                                                    }}
                                                />
                                            ))}
                                    </Box>
                                    {/* Design label */}
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            fontWeight: design === designMeta.id ? 600 : 500,
                                            color: design === designMeta.id ? 'primary.main' : 'text.primary'
                                        }}
                                    >
                                        {t(designMeta.labelKey)}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            </DialogContent>
        </Dialog>
    );
};

export default AppearanceDialog;
