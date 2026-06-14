import { useState, useEffect } from 'react';
import { createTheme } from '@mui/material/styles';
import { getDesignModule, DESIGNS } from '../theme/designs';

export const useThemeMode = () => {
    const [themeMode, setThemeMode] = useState(() => {
        const savedTheme = localStorage.getItem('app-theme-mode');
        return savedTheme || 'system';
    });

    const [design, setDesign] = useState(() => {
        const savedDesign = localStorage.getItem('app-design');
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
        localStorage.setItem('app-theme-mode', newMode);
    };

    const setThemeModeExplicit = (mode) => {
        setThemeMode(mode);
        localStorage.setItem('app-theme-mode', mode);
    };

    const setDesignExplicit = (designId) => {
        if (DESIGNS[designId]) {
            setDesign(designId);
            localStorage.setItem('app-design', designId);
        }
    };

    // Слушаем изменения системной темы
    useEffect(() => {
        localStorage.setItem('app-theme-mode', themeMode);

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
        localStorage.setItem('app-design', design);
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