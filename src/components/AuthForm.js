import React, { useState } from 'react';
import {
    Box,
    Paper,
    TextField,
    Button,
    Typography,
    Alert,
    Tab,
    Tabs,
    IconButton,
    InputAdornment,
    CircularProgress,
    useTheme,
    useMediaQuery
} from '@mui/material';
import { Visibility, VisibilityOff, Bubble } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { createUser, loginUser, resetPassword } from '../services/authService';
import LanguageSelector from './LanguageSelector';

const AuthForm = ({ onLoginSuccess }) => {
    const { t } = useTranslation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const [tabValue, setTabValue] = useState(0);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
        setError('');
        setSuccess('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setDisplayName('');
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!email || !password) {
            setError(t('auth.fillAllFields'));
            return;
        }

        setLoading(true);
        setError('');

        const result = await loginUser(email, password);

        if (result.success) {
            setSuccess(t('auth.loginSuccess'));
            setTimeout(() => {
                onLoginSuccess(result.user);
            }, 1000);
        } else {
            setError(result.error);
        }

        setLoading(false);
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        if (!email || !password || !confirmPassword) {
            setError(t('auth.fillAllFields'));
            return;
        }

        if (password !== confirmPassword) {
            setError(t('auth.passwordMismatch'));
            return;
        }

        if (password.length < 6) {
            setError(t('auth.passwordTooShort'));
            return;
        }

        setLoading(true);
        setError('');

        const result = await createUser(email, password, displayName);

        if (result.success) {
            setSuccess(t('auth.registerSuccess'));
            setTimeout(() => {
                onLoginSuccess(result.user);
            }, 1000);
        } else {
            setError(result.error);
        }

        setLoading(false);
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 2
            }}
        >
            <LanguageSelector sx={{
                position: 'absolute',
                top: 20,
                right: 20,
                zIndex: 1000
            }} />

            <Paper
                elevation={10}
                sx={{
                    width: '100%',
                    maxWidth: 400,
                    padding: isMobile ? 3 : 4,
                    borderRadius: 3,
                    backgroundColor: 'rgba(255, 255, 255, 0.95)'
                }}
            >
                <Box sx={{ textAlign: 'center', marginBottom: 3 }}>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#667eea' }}>
                        🫧
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#667eea', marginBottom: 1 }}>
                        To-Round
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        {t('auth.welcome')}
                    </Typography>
                </Box>

                <Tabs
                    value={tabValue}
                    onChange={handleTabChange}
                    variant="fullWidth"
                    sx={{ marginBottom: 3 }}
                >
                    <Tab label={t('auth.login')} />
                    <Tab label={t('auth.register')} />
                </Tabs>

                {error && (
                    <Alert severity="error" sx={{ marginBottom: 2 }}>
                        {error}
                    </Alert>
                )}
                {success && (
                    <Alert severity="success" sx={{ marginBottom: 2 }}>
                        {success}
                    </Alert>
                )}

                {tabValue === 0 && (
                    <Box component="form" onSubmit={handleLogin}>
                        <TextField
                            fullWidth
                            type="email"
                            label={t('auth.email')}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            margin="normal"
                            variant="outlined"
                            disabled={loading}
                            sx={{ '& .MuiInputBase-input': { fontSize: isMobile ? 16 : 14 } }}
                        />
                        <TextField
                            fullWidth
                            type={showPassword ? 'text' : 'password'}
                            label={t('auth.password')}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            margin="normal"
                            variant="outlined"
                            disabled={loading}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                            sx={{ '& .MuiInputBase-input': { fontSize: isMobile ? 16 : 14 } }}
                        />
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            disabled={loading}
                            sx={{
                                marginTop: 3,
                                marginBottom: 2,
                                height: 48,
                                fontSize: 16,
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                            }}
                        >
                            {loading ? <CircularProgress size={24} color="inherit" /> : t('auth.loginButton')}
                        </Button>
                    </Box>
                )}

                {tabValue === 1 && (
                    <Box component="form" onSubmit={handleRegister}>
                        <TextField
                            fullWidth
                            label={t('auth.displayName')}
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            margin="normal"
                            variant="outlined"
                            disabled={loading}
                            sx={{ '& .MuiInputBase-input': { fontSize: isMobile ? 16 : 14 } }}
                        />
                        <TextField
                            fullWidth
                            type="email"
                            label={t('auth.email')}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            margin="normal"
                            variant="outlined"
                            disabled={loading}
                            sx={{ '& .MuiInputBase-input': { fontSize: isMobile ? 16 : 14 } }}
                        />
                        <TextField
                            fullWidth
                            type={showPassword ? 'text' : 'password'}
                            label={t('auth.password')}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            margin="normal"
                            variant="outlined"
                            disabled={loading}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                            sx={{ '& .MuiInputBase-input': { fontSize: isMobile ? 16 : 14 } }}
                        />
                        <TextField
                            fullWidth
                            type={showConfirmPassword ? 'text' : 'password'}
                            label={t('auth.confirmPassword')}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            margin="normal"
                            variant="outlined"
                            disabled={loading}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)} edge="end">
                                            {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                            sx={{ '& .MuiInputBase-input': { fontSize: isMobile ? 16 : 14 } }}
                        />
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            disabled={loading}
                            sx={{
                                marginTop: 3,
                                marginBottom: 2,
                                height: 48,
                                fontSize: 16,
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                            }}
                        >
                            {loading ? <CircularProgress size={24} color="inherit" /> : t('auth.registerButton')}
                        </Button>
                    </Box>
                )}
            </Paper>
        </Box>
    );
};

export default AuthForm;
