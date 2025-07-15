import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { LightMode, DarkMode } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

const ThemeToggle = ({ themeMode, toggleTheme, size = 'medium', sx = {} }) => {
    const { t } = useTranslation();

    return (
        <Tooltip title={themeMode === 'light' ? t('theme.switchToDark') : t('theme.switchToLight')}>
            <IconButton
                onClick={toggleTheme}
                size={size}
                sx={{
                    color: themeMode === 'light' ? '#3B7DED' : 'white',
                    backgroundColor: themeMode === 'light'
                        ? 'rgba(59, 125, 237, 0.15)'
                        : 'rgba(255, 255, 255, 0.2)',
                    '&:hover': {
                        backgroundColor: themeMode === 'light'
                            ? 'rgba(59, 125, 237, 0.25)'
                            : 'rgba(255, 255, 255, 0.3)'
                    },
                    ...sx
                }}
            >
                {themeMode === 'light' ? <DarkMode /> : <LightMode />}
            </IconButton>
        </Tooltip>
    );
};

export default ThemeToggle; 