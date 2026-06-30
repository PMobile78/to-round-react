import { useState, useEffect } from 'react';
import { createTheme } from '@mui/material/styles';
import { lsGetString, lsSet } from '../utils/storage';
import { LS } from '../utils/storageKeys';
import { getDesignModule, DESIGNS } from '../theme/designs';

export const useThemeMode = () => {
    const [themeMode, setThemeMode] = useState(() => {
        const savedTheme = lsGetString(LS.THEME_MODE);
        return savedTheme || 'system';
    });

    const [design, setDesign] = useState(() => {
        const savedDesign = lsGetString(LS.DESIGN);
        return savedDesign || 'classic';
    });

    // Функция для получения системной темы
    const getSystemTheme = () => {
        if (typeof window !== 'undefined' && window.matchMedia) {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return 'light';
    };

    // Получаем актуальную тему (если system, то берем системную)
    const getActualTheme = () => {
        return themeMode === 'system' ? getSystemTheme() : themeMode;
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
        setThemeMode(newMode);
        lsSet(LS.THEME_MODE, newMode);
    };

    const setThemeModeExplicit = (mode) => {
        setThemeMode(mode);
        lsSet(LS.THEME_MODE, mode);
    };

    const setDesignExplicit = (designId) => {
        if (DESIGNS[designId]) {
            setDesign(designId);
            lsSet(LS.DESIGN, designId);
        }
    };

    // Слушаем изменения системной темы
    useEffect(() => {
        lsSet(LS.THEME_MODE, themeMode);

        if (themeMode === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handleChange = () => {
                // Принудительно перерендерим компонент при изменении системной темы
                setThemeMode('system');
            };

            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        }
    }, [themeMode]);

    // Persist design to localStorage whenever it changes
    useEffect(() => {
        lsSet(LS.DESIGN, design);
    }, [design]);

    const actualTheme = getActualTheme();

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