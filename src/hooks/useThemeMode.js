import { useState, useEffect } from 'react';
import { createTheme } from '@mui/material/styles';
import { getDesignModule, DESIGNS } from '../theme/designs';

// Функция для получения системной темы
const getSystemTheme = () => {
    if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
};

/**
 * Theme mode and design. Signed in, they are the user's settings (users/{uid}.settings,
 * spec 3.5) and changes are written there through updateSettings. Before sign-in the screen
 * uses the system theme and the classic design; a change there lasts only for the session.
 */
export const useThemeMode = (settings = null, updateSettings = () => {}) => {
    const [localThemeMode, setLocalThemeMode] = useState('system');
    const [localDesign, setLocalDesign] = useState('classic');
    const [systemTheme, setSystemTheme] = useState(getSystemTheme);

    const themeMode = settings ? settings.themeMode : localThemeMode;
    const design = settings ? settings.design : localDesign;

    const setThemeModeExplicit = (mode) => {
        if (settings) updateSettings({ themeMode: mode });
        else setLocalThemeMode(mode);
    };

    const toggleTheme = () => {
        let newMode;
        if (themeMode === 'light') {
            newMode = 'dark';
        } else if (themeMode === 'dark') {
            newMode = 'system';
        } else {
            newMode = 'light';
        }
        setThemeModeExplicit(newMode);
    };

    const setDesignExplicit = (designId) => {
        if (!DESIGNS[designId]) return;
        if (settings) updateSettings({ design: designId });
        else setLocalDesign(designId);
    };

    // Слушаем изменения системной темы
    useEffect(() => {
        if (themeMode !== 'system' || typeof window === 'undefined' || !window.matchMedia) return undefined;
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = () => setSystemTheme(getSystemTheme());
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [themeMode]);

    // Получаем актуальную тему (если system, то берем системную)
    const actualTheme = themeMode === 'system' ? systemTheme : themeMode;

    const createAppTheme = (mode, designId) => {
        const designModule = getDesignModule(designId);
        if (!designModule) {
            console.warn(`Design module not found for design: ${designId}, falling back to classic`);
            return createAppTheme(mode, 'classic');
        }
        const designConfig = designModule(mode);
        return createTheme(designConfig);
    };

    const theme = createAppTheme(actualTheme, design);

    return {
        themeMode,
        actualTheme,
        design,
        toggleTheme,
        setThemeMode: setThemeModeExplicit,
        setDesign: setDesignExplicit,
        theme,
        designs: DESIGNS,
    };
};
