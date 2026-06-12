import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { LightMode, DarkMode, SettingsSuggest } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

const ThemeToggle = ({ themeMode, actualTheme, toggleTheme, size = 'medium', sx = {} }) => {
    const { t } = useTranslation();

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

    // Определяем цвета на основе актуальной темы (что видит пользователь)
    const getThemeColors = () => {
        const isActuallyLight = actualTheme === 'light';
        return {
            color: isActuallyLight ? '#3B7DED' : 'white',
            backgroundColor: isActuallyLight
                ? 'rgba(59, 125, 237, 0.15)'
                : 'rgba(255, 255, 255, 0.2)',
            hoverColor: isActuallyLight
                ? 'rgba(59, 125, 237, 0.25)'
                : 'rgba(255, 255, 255, 0.3)'
        };
    };

    const colors = getThemeColors();

    return (
        <Tooltip title={t(`theme.${getNextThemeKey()}`)}>
            <IconButton
                onClick={toggleTheme}
                size={size}
                sx={{
                    color: colors.color,
                    backgroundColor: colors.backgroundColor,
                    '&:hover': {
                        backgroundColor: colors.hoverColor
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