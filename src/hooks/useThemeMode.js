import { useState, useEffect } from 'react';
import { alpha, createTheme } from '@mui/material/styles';

export const useThemeMode = () => {
    const [themeMode, setThemeMode] = useState(() => {
        const savedTheme = localStorage.getItem('app-theme-mode');
        return savedTheme || 'system';
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

    const actualTheme = getActualTheme();

    const palettes = {
        light: {
            primary: '#2f6bdb',
            backgroundDefault: '#fafbfc',
            paper: '#ffffff',
            bubbleView: '#fafbfc',
            textPrimary: '#1c2330',
            textSecondary: '#5b6472',
            divider: '#eef0f3',
        },
        dark: {
            primary: '#5589e8',
            backgroundDefault: '#151c28',
            paper: '#161d2a',
            bubbleView: 'linear-gradient(160deg, #151c28 0%, #1b2433 100%)',
            textPrimary: '#e8ecf4',
            textSecondary: '#8e9ab0',
            divider: '#263043',
        },
    };

    // Soft, low-contrast layered shadows replacing MUI's harsh defaults
    const buildSoftShadows = () => {
        const shadows = ['none'];
        for (let i = 1; i <= 24; i++) {
            const y = Math.round(1 + i * 0.75);
            const blur = Math.round(4 + i * 1.6);
            const opacity = Math.min(0.05 + i * 0.007, 0.22);
            shadows.push(`0 ${y}px ${blur}px rgba(15, 23, 42, ${opacity})`);
        }
        return shadows;
    };

    const createAppTheme = (mode) => {
        const c = palettes[mode];
        const headingStyle = { fontWeight: 600, letterSpacing: '-0.01em' };
        return createTheme({
            palette: {
                mode,
                primary: { main: c.primary },
                secondary: { main: '#FF6B6B' },
                success: { main: mode === 'light' ? '#2e9e63' : '#4ec98b' },
                warning: { main: mode === 'light' ? '#d97f1d' : '#e8a44b' },
                error: { main: mode === 'light' ? '#d05050' : '#ef7070' },
                info: { main: mode === 'light' ? '#2f86c1' : '#5fb0de' },
                background: {
                    default: c.backgroundDefault,
                    paper: c.paper,
                    bubbleView: c.bubbleView,
                },
                text: {
                    primary: c.textPrimary,
                    secondary: c.textSecondary,
                },
                divider: c.divider,
            },
            shape: {
                borderRadius: 12,
            },
            typography: {
                fontFamily: "'InterVariable', 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
                h1: headingStyle,
                h2: headingStyle,
                h3: headingStyle,
                h4: headingStyle,
                h5: headingStyle,
                h6: headingStyle,
                button: { fontWeight: 500, textTransform: 'none' },
            },
            shadows: buildSoftShadows(),
            components: {
                MuiCssBaseline: {
                    styleOverrides: {
                        body: {
                            '& a': {
                                color: mode === 'light' ? '#2f6bdb' : '#8eb0f0',
                                textDecoration: 'none',
                                '&:hover': {
                                    color: mode === 'light' ? '#2558b8' : '#aac4f4',
                                    textDecoration: 'underline',
                                },
                                '&:visited': {
                                    color: mode === 'light' ? '#7b1fa2' : '#ce93d8',
                                }
                            }
                        }
                    }
                },
                MuiPaper: {
                    styleOverrides: {
                        root: {
                            // kill MUI's dark-mode elevation overlay so paper color stays exact
                            backgroundImage: 'none',
                        },
                    },
                },
                MuiDialog: {
                    styleOverrides: {
                        paper: {
                            borderRadius: 16,
                            backgroundColor: mode === 'light'
                                ? 'rgba(255, 255, 255, 0.95)'
                                : 'rgba(22, 29, 42, 0.95)',
                        },
                    },
                },
                MuiDrawer: {
                    styleOverrides: {
                        paper: {
                            backgroundImage: 'none',
                        },
                    },
                },
                MuiButton: {
                    styleOverrides: {
                        root: {
                            borderRadius: 10,
                        },
                    },
                },
                MuiFab: {
                    styleOverrides: {
                        root: {
                            borderRadius: 14,
                            boxShadow: `0 4px 14px ${alpha(c.primary, 0.35)}`,
                            '&:active': {
                                boxShadow: `0 2px 8px ${alpha(c.primary, 0.4)}`,
                            },
                        },
                    },
                },
                MuiOutlinedInput: {
                    styleOverrides: {
                        root: {
                            borderRadius: 10,
                        },
                    },
                },
                MuiChip: {
                    styleOverrides: {
                        root: {
                            borderRadius: 8,
                        },
                    },
                },
                MuiLink: {
                    styleOverrides: {
                        root: {
                            color: mode === 'light' ? '#2f6bdb' : '#8eb0f0',
                            '&:hover': {
                                color: mode === 'light' ? '#2558b8' : '#aac4f4',
                            },
                            '&:visited': {
                                color: mode === 'light' ? '#7b1fa2' : '#ce93d8',
                            }
                        }
                    }
                }
            },
        });
    };

    const theme = createAppTheme(actualTheme);

    return {
        themeMode,
        actualTheme,
        toggleTheme,
        theme,
    };
}; 