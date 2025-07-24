import React, { useState, useEffect } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, CircularProgress } from '@mui/material';
import BubblesPage from './pages/BubblesPage';
import AuthForm from './components/AuthForm';
import { onAuthStateChange } from './services/authService';
import { useThemeMode } from './hooks/useThemeMode';

function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const { themeMode, actualTheme, toggleTheme, theme } = useThemeMode();
    navigator.serviceWorker.ready.then(reg => reg.showNotification('Test Desktop', { body: 'Hello from desktop!' }))
    useEffect(() => {
        const unsubscribe = onAuthStateChange((currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleLoginSuccess = (loggedInUser) => {
        setUser(loggedInUser);
    };

    if (loading) {
        return (
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <Box
                    sx={{
                        height: '100vh',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: theme.palette.background.bubbleView
                    }}
                >
                    <CircularProgress size={60} sx={{ color: 'white' }} />
                </Box>
            </ThemeProvider>
        );
    }

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            {user ? (
                <BubblesPage
                    user={user}
                    themeMode={actualTheme}
                    toggleTheme={toggleTheme}
                    themeToggleProps={{ themeMode, actualTheme }}
                />
            ) : (
                <AuthForm
                    onLoginSuccess={handleLoginSuccess}
                    themeMode={actualTheme}
                    toggleTheme={toggleTheme}
                    themeToggleProps={{ themeMode, actualTheme }}
                />
            )}
        </ThemeProvider>
    );
}

export default App; 