import React from 'react';
import { IconButton, Tooltip, useTheme } from '@mui/material';
import { LightMode, DarkMode, SettingsSuggest } from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';

const ThemeToggle = ({ themeMode, actualTheme, toggleTheme, size = 'medium', sx = {} }) => {
    const { t } = useTranslation();
    const theme = useTheme();

    // Определяем следующую тему для tooltip
    const getNextThemeKey = () => {
        if (themeMode === 'light') return 'switchToDark';
        if (themeMode === 'dark') return 'switchToSystem';
        return 'switchToLight';
    };

    // Определяем иконку на основе текущего режима
    const getThemeIcon = () => {
        if (themeMode === 'light') return <LightMode />;
        if (themeMode === 'dark') return <DarkMode />;
        return <SettingsSuggest />; // system
    };

    return (
        <Tooltip title={t(`theme.${getNextThemeKey()}`)}>
            <IconButton
                onClick={toggleTheme}
                size={size}
                sx={{
                    color: theme.palette.primary.main,
                    backgroundColor: alpha(theme.palette.primary.main, 0.15),
                    '&:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.25)
                    },
                    ...sx
                }}
            >
                {getThemeIcon()}
            </IconButton>
        </Tooltip>
    );
};

export default ThemeToggle; 