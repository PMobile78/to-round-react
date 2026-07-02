import React, { useState, useEffect } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, CircularProgress } from '@mui/material';
import BubblesPage from './pages/BubblesPage';
const MindMapPage = React.lazy(() => import('./pages/MindMapPage'));
import AuthForm from './components/AuthForm';
import { onAuthStateChange } from './services/authService';
import { useThemeMode } from './hooks/useThemeMode';
import { BubblesDataProvider } from './state/BubblesDataStore';
import { BubblesUiProvider } from './state/BubblesUiStore';

// Hash-based routing so the screen survives F5 and works on GitHub Pages.
const getScreenFromHash = () => (window.location.hash === '#/mindmap' ? 'mindmap' : 'main');

function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [screen, setScreen] = useState(getScreenFromHash); // 'main' | 'mindmap'
    const { themeMode, actualTheme, toggleTheme, theme, design, setDesign, designs, setThemeMode } = useThemeMode();

    useEffect(() => {
        const onHashChange = () => setScreen(getScreenFromHash());
        window.addEventListener('hashchange', onHashChange);
        return () => window.removeEventListener('hashchange', onHashChange);
    }, []);

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

    // Navigation goes through the hash; hashchange listener updates the state.
    const navigate = (next) => {
        window.location.hash = next === 'mindmap' ? '/mindmap' : '/';
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
                screen === 'mindmap' ? (
                    <React.Suspense fallback={
                        <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: theme.palette.background.bubbleView }}>
                            <CircularProgress size={60} sx={{ color: 'white' }} />
                        </Box>
                    }>
                        <MindMapPage
                            onBack={() => navigate('main')}
                            themeMode={actualTheme}
                        />
                    </React.Suspense>
                ) : (
                    <BubblesDataProvider>
                        <BubblesUiProvider
                            themeModeState={themeMode}
                            setThemeMode={setThemeMode}
                            design={design}
                            setDesign={setDesign}
                            designs={designs}
                            toggleTheme={toggleTheme}
                            themeToggleProps={{ themeMode, actualTheme }}
                            onOpenMindMap={() => navigate('mindmap')}
                        >
                            <BubblesPage
                                user={user}
                                themeMode={actualTheme}
                            />
                        </BubblesUiProvider>
                    </BubblesDataProvider>
                )
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