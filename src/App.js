import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import BubblesPage from './pages/BubblesPage';

const theme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#3B7DED',
        },
        secondary: {
            main: '#FF6B6B',
        },
        background: {
            default: '#f5f5f5',
        },
    },
    typography: {
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    },
});

function App() {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <BubblesPage />
        </ThemeProvider>
    );
}

export default App; 