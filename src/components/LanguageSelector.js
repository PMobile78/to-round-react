import React, { useState } from 'react';
import {
    IconButton,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Typography,
    Box,
    useTheme,
    useMediaQuery
} from '@mui/material';
import { Language, Check } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

const LanguageSelector = ({ sx = {} }) => {
    const { i18n, t } = useTranslation();
    const [anchorEl, setAnchorEl] = useState(null);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    // Language options with their flags and names
    const languages = [
        {
            code: 'en',
            name: 'English',
            nativeName: 'English',
            flag: '🇺🇸'
        },
        {
            code: 'uk',
            name: 'Ukrainian',
            nativeName: 'Українська',
            flag: '🇺🇦'
        }
    ];

    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleLanguageChange = (languageCode) => {
        i18n.changeLanguage(languageCode);
        localStorage.setItem('i18nextLng', languageCode);
        handleClose();
    };

    const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

    return (
        <Box sx={sx}>
            <IconButton
                onClick={handleClick}
                sx={{
                    color: 'white',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.2)'
                    },
                    width: isMobile ? 40 : 48,
                    height: isMobile ? 40 : 48
                }}
                size={isMobile ? 'small' : 'medium'}
            >
                <Language />
            </IconButton>

            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleClose}
                PaperProps={{
                    sx: {
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: 2,
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                        minWidth: 200
                    }
                }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
                <Box sx={{ px: 2, py: 1, borderBottom: '1px solid rgba(0, 0, 0, 0.1)' }}>
                    <Typography variant="caption" color="text.secondary" fontWeight="bold">
                        {t('common.language')}
                    </Typography>
                </Box>
                {languages.map((language) => (
                    <MenuItem
                        key={language.code}
                        onClick={() => handleLanguageChange(language.code)}
                        selected={i18n.language === language.code}
                        sx={{
                            '&.Mui-selected': {
                                backgroundColor: 'rgba(59, 125, 237, 0.1)',
                                '&:hover': {
                                    backgroundColor: 'rgba(59, 125, 237, 0.15)'
                                }
                            },
                            '&:hover': {
                                backgroundColor: 'rgba(0, 0, 0, 0.04)'
                            }
                        }}
                    >
                        <ListItemIcon sx={{ minWidth: 32 }}>
                            <Typography variant="h6" component="span">
                                {language.flag}
                            </Typography>
                        </ListItemIcon>
                        <ListItemText
                            primary={language.nativeName}
                            secondary={language.name !== language.nativeName ? language.name : undefined}
                        />
                        {i18n.language === language.code && (
                            <Check sx={{ color: 'primary.main', ml: 1 }} />
                        )}
                    </MenuItem>
                ))}
            </Menu>
        </Box>
    );
};

export default LanguageSelector; 