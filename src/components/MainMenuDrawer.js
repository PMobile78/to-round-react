import React from 'react';
import { Drawer, Box, Typography, List, ListItem, ListItemIcon, ListItemText, Divider, Switch } from '@mui/material';
import { useTranslation } from 'react-i18next';
import {
    LanguageOutlined,
    PaletteOutlined,
    FormatColorFillOutlined,
    FormatSizeOutlined,
    LabelOutlined,
    Info,
    Logout,
    Sell
} from '@mui/icons-material';
import LanguageSelector from './LanguageSelector';
import ThemeToggle from './ThemeToggle';

const MainMenuDrawer = ({
    open,
    onClose,
    isMobile,
    themeMode,
    themeToggleProps,
    toggleTheme,
    bubbleBackgroundEnabled,
    onToggleBubbleBackground,
    categoriesPanelEnabled,
    onToggleCategoriesPanel,
    onOpenCategoriesDialog,
    onOpenFontSettingsDialog,
    onAbout,
    onLogout
}) => {
    const { t } = useTranslation();

    return (
        <Drawer
            anchor="left"
            open={open}
            onClose={onClose}
            PaperProps={{
                sx: {
                    width: isMobile ? '70%' : 300,
                    maxWidth: '85%',
                    backgroundColor: themeMode === 'light' ? '#FFFFFF' : '#1e1e1e',
                    zIndex: 1300
                }
            }}
        >
            <Box sx={{ padding: 0 }}>
                <Box sx={{
                    padding: 3,
                    paddingBottom: 2,
                    borderBottom: themeMode === 'light' ? '1px solid #E0E0E0' : '1px solid #333333'
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, marginBottom: 2 }}>
                        <Typography variant="h6" sx={{
                            fontWeight: 'bold',
                            color: themeMode === 'light' ? '#2C3E50' : '#ffffff'
                        }}>
                            ToDo Round
                        </Typography>
                    </Box>
                </Box>

                <List sx={{ padding: 0 }}>
                    <ListItem sx={{ padding: '16px 24px' }}>
                        <ListItemIcon sx={{ minWidth: 40 }}>
                            <LanguageOutlined sx={{ color: themeMode === 'light' ? '#BDC3C7' : '#aaaaaa' }} />
                        </ListItemIcon>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" sx={{
                                color: themeMode === 'light' ? '#2C3E50' : '#ffffff',
                                fontWeight: 500,
                                marginBottom: 1
                            }}>
                                {t('language.title')}
                            </Typography>
                            <LanguageSelector themeMode={themeMode} />
                        </Box>
                    </ListItem>

                    <Divider sx={{ backgroundColor: themeMode === 'light' ? '#E0E0E0' : '#333333', margin: '8px 0' }} />

                    <ListItem sx={{ padding: '16px 24px' }}>
                        <ListItemIcon sx={{ minWidth: 40 }}>
                            <PaletteOutlined sx={{ color: themeMode === 'light' ? '#BDC3C7' : '#aaaaaa' }} />
                        </ListItemIcon>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" sx={{
                                color: themeMode === 'light' ? '#2C3E50' : '#ffffff',
                                fontWeight: 500,
                                marginBottom: 1
                            }}>
                                {t('theme.title')}
                            </Typography>
                            <ThemeToggle {...themeToggleProps} toggleTheme={toggleTheme} size="small" />
                        </Box>
                    </ListItem>

                    <Divider sx={{ backgroundColor: themeMode === 'light' ? '#E0E0E0' : '#333333', margin: '8px 0' }} />

                    <ListItem
                        button
                        onClick={() => {
                            onClose();
                            onOpenCategoriesDialog && onOpenCategoriesDialog();
                        }}
                        sx={{ padding: '16px 24px', cursor: 'pointer', '&:hover': { backgroundColor: themeMode === 'light' ? '#F8F9FA' : '#333333' } }}
                    >
                        <ListItemIcon sx={{ minWidth: 40 }}>
                            <Sell sx={{ color: themeMode === 'light' ? '#BDC3C7' : '#aaaaaa' }} />
                        </ListItemIcon>
                        <ListItemText
                            primary={t('bubbles.taskCategories')}
                            primaryTypographyProps={{ color: themeMode === 'light' ? '#2C3E50' : '#ffffff', fontWeight: 500 }}
                        />
                    </ListItem>

                    <ListItem
                        button
                        onClick={() => {
                            onClose();
                            onOpenFontSettingsDialog && onOpenFontSettingsDialog();
                        }}
                        sx={{ padding: '16px 24px', cursor: 'pointer', '&:hover': { backgroundColor: themeMode === 'light' ? '#F8F9FA' : '#333333' } }}
                    >
                        <ListItemIcon sx={{ minWidth: 40 }}>
                            <FormatSizeOutlined sx={{ color: themeMode === 'light' ? '#BDC3C7' : '#aaaaaa' }} />
                        </ListItemIcon>
                        <ListItemText
                            primary={t('bubbles.fontSettings')}
                            primaryTypographyProps={{ color: themeMode === 'light' ? '#2C3E50' : '#ffffff', fontWeight: 500 }}
                        />
                    </ListItem>

                    <ListItem sx={{ padding: '16px 24px' }}>
                        <ListItemIcon sx={{ minWidth: 40 }}>
                            <FormatColorFillOutlined sx={{ color: themeMode === 'light' ? '#BDC3C7' : '#aaaaaa' }} />
                        </ListItemIcon>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" sx={{ color: themeMode === 'light' ? '#2C3E50' : '#ffffff', fontWeight: 500, marginBottom: 1 }}>
                                {t('bubbles.bubbleBackground')}
                            </Typography>
                            <Switch
                                checked={bubbleBackgroundEnabled}
                                onChange={onToggleBubbleBackground}
                                size="small"
                                sx={{
                                    '& .MuiSwitch-switchBase.Mui-checked': { color: themeMode === 'light' ? '#3B7DED' : '#90CAF9' },
                                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: themeMode === 'light' ? '#3B7DED' : '#90CAF9' }
                                }}
                            />
                        </Box>
                    </ListItem>

                    <ListItem sx={{ padding: '16px 24px' }}>
                        <ListItemIcon sx={{ minWidth: 40 }}>
                            <LabelOutlined sx={{ color: themeMode === 'light' ? '#BDC3C7' : '#aaaaaa' }} />
                        </ListItemIcon>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" sx={{ color: themeMode === 'light' ? '#2C3E50' : '#ffffff', fontWeight: 500, marginBottom: 1 }}>
                                {t('bubbles.taskCategoriesPanel')}
                            </Typography>
                            <Switch
                                checked={categoriesPanelEnabled}
                                onChange={onToggleCategoriesPanel}
                                size="small"
                                sx={{
                                    '& .MuiSwitch-switchBase.Mui-checked': { color: themeMode === 'light' ? '#3B7DED' : '#90CAF9' },
                                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: themeMode === 'light' ? '#3B7DED' : '#90CAF9' }
                                }}
                            />
                        </Box>
                    </ListItem>

                    <ListItem
                        button
                        onClick={() => {
                            onClose();
                            onAbout && onAbout();
                        }}
                        sx={{ padding: '16px 24px', cursor: 'pointer', '&:hover': { backgroundColor: themeMode === 'light' ? '#F8F9FA' : '#333333' } }}
                    >
                        <ListItemIcon sx={{ minWidth: 40 }}>
                            <Info sx={{ color: themeMode === 'light' ? '#BDC3C7' : '#aaaaaa' }} />
                        </ListItemIcon>
                        <ListItemText primary={t('bubbles.about')} primaryTypographyProps={{ color: themeMode === 'light' ? '#2C3E50' : '#ffffff', fontWeight: 500 }} />
                    </ListItem>

                    <Divider sx={{ backgroundColor: themeMode === 'light' ? '#E0E0E0' : '#333333', margin: '8px 0' }} />

                    <ListItem
                        button
                        onClick={() => {
                            onClose();
                            onLogout && onLogout();
                        }}
                        sx={{ padding: '16px 24px', cursor: 'pointer', '&:hover': { backgroundColor: themeMode === 'light' ? '#FFEBEE' : '#4A1418' } }}
                    >
                        <ListItemIcon sx={{ minWidth: 40 }}>
                            <Logout sx={{ color: themeMode === 'light' ? '#D32F2F' : '#FF8A80' }} />
                        </ListItemIcon>
                        <ListItemText primary={t('auth.logout')} primaryTypographyProps={{ color: themeMode === 'light' ? '#D32F2F' : '#FF8A80', fontWeight: 500 }} />
                    </ListItem>
                </List>
            </Box>
        </Drawer>
    );
};

export default MainMenuDrawer;


