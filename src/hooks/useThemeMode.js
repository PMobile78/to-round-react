import { useState, useEffect } from 'react';
import { createTheme } from '@mui/material/styles';

export const useThemeMode = () => {
    const [themeMode, setThemeMode] = useState(() => {
        const savedTheme = localStorage.getItem('app-theme-mode');
        return savedTheme || 'light';
    });

    const toggleTheme = () => {
        const newMode = themeMode === 'light' ? 'dark' : 'light';
        setThemeMode(newMode);
        localStorage.setItem('app-theme-mode', newMode);
    };

    useEffect(() => {
        localStorage.setItem('app-theme-mode', themeMode);
    }, [themeMode]);

    const createAppTheme = (mode) => {
        return createTheme({
            palette: {
                mode,
                primary: {
                    main: '#3B7DED',
                },
                secondary: {
                    main: '#FF6B6B',
                },
                background: {
                    default: mode === 'light' ? '#f5f5f5' : '#121212',
                    paper: mode === 'light' ? '#ffffff' : '#1e1e1e',
                    bubbleView: mode === 'light'
                        ? '#ffffff'
                        : 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
                },
                text: {
                    primary: mode === 'light' ? '#000000' : '#ffffff',
                    secondary: mode === 'light' ? '#666666' : '#aaaaaa',
                },
                divider: mode === 'light' ? '#e0e0e0' : '#333333',
            },
            typography: {
                fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
            },
            components: {
                MuiPaper: {
                    styleOverrides: {
                        root: {
                            backgroundColor: mode === 'light' ? '#ffffff' : '#1e1e1e',
                        },
                    },
                },
                MuiDialog: {
                    styleOverrides: {
                        paper: {
                            backgroundColor: mode === 'light' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(30, 30, 30, 0.95)',
                        },
                    },
                },
                MuiIconButton: {
                    styleOverrides: {
                        root: {
                            '&.theme-button': {
                                backgroundColor: mode === 'light' ? 'rgba(59, 125, 237, 0.15)' : 'rgba(255, 255, 255, 0.2)',
                                color: mode === 'light' ? '#3B7DED' : 'white',
                                '&:hover': {
                                    backgroundColor: mode === 'light' ? 'rgba(59, 125, 237, 0.25)' : 'rgba(255, 255, 255, 0.3)',
                                }
                            }
                        }
                    }
                },
                MuiButton: {
                    styleOverrides: {
                        root: {
                            '&.theme-button': {
                                backgroundColor: mode === 'light' ? 'rgba(59, 125, 237, 0.15)' : 'rgba(255, 255, 255, 0.2)',
                                color: mode === 'light' ? '#3B7DED' : 'white',
                                borderColor: mode === 'light' ? 'rgba(59, 125, 237, 0.5)' : 'rgba(255, 255, 255, 0.5)',
                                '&:hover': {
                                    backgroundColor: mode === 'light' ? 'rgba(59, 125, 237, 0.25)' : 'rgba(255, 255, 255, 0.3)',
                                    borderColor: mode === 'light' ? 'rgba(59, 125, 237, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                                }
                            }
                        }
                    }
                }
            },
        });
    };

    const theme = createAppTheme(themeMode);

    return {
        themeMode,
        toggleTheme,
        theme,
    };
}; 