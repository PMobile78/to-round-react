import React, { useRef } from 'react';
import { Drawer, Box, Typography, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Divider, Switch } from '@mui/material';
import { useTranslation } from 'react-i18next';
import {
    LanguageOutlined,
    Palette,
    FormatColorFillOutlined,
    FormatSizeOutlined,
    LabelOutlined,
    Info,
    Logout,
    Sell,
    ViewListOutlined,
    AccountTreeOutlined,
    LockOutlined,
    NotificationsActiveOutlined,
    FileDownload,
    FileUpload
} from '@mui/icons-material';
import LanguageSelector from './LanguageSelector';

const MainMenuDrawer = ({
    open,
    onClose,
    isMobile,
    themeMode,
    themeToggleProps,
    toggleTheme,
    bubbleBackgroundEnabled,
    onToggleBubbleBackground,
    mainView,
    onToggleMainView,
    categoriesPanelEnabled,
    onToggleCategoriesPanel,
    onOpenCategoriesDialog,
    onOpenFontSettingsDialog,
    onOpenAppearanceDialog,
    onOpenChangePasswordDialog,
    onOpenMindMap,
    onAbout,
    onLogout,
    // This browser in users/{uid}/devices (null until registered) and its reminders switch
    thisDevice,
    onToggleThisDeviceReminders,
    // Backup (spec 10): the export, and the import of the chosen file
    onExportBackup,
    onImportBackupFile
}) => {
    const { t } = useTranslation();
    const fileInputRef = useRef(null);

    const handleImportClick = () => {
        fileInputRef.current.value = '';
        fileInputRef.current.click();
    };

    const handleFileChange = (event) => {
        const file = event.target.files && event.target.files[0];
        if (!file) return;
        onClose();
        onImportBackupFile && onImportBackupFile(file);
    };

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
                    <ListItemButton
                        onClick={() => {
                            onClose();
                            onOpenMindMap && onOpenMindMap();
                        }}
                        sx={{ padding: '16px 24px', cursor: 'pointer', '&:hover': { backgroundColor: themeMode === 'light' ? '#F8F9FA' : '#333333' } }}
                    >
                        <ListItemIcon sx={{ minWidth: 40 }}>
                            <AccountTreeOutlined sx={{ color: themeMode === 'light' ? '#BDC3C7' : '#aaaaaa' }} />
                        </ListItemIcon>
                        <ListItemText
                            primary={t('mindmap.title')}
                            primaryTypographyProps={{ color: themeMode === 'light' ? '#2C3E50' : '#ffffff', fontWeight: 500 }}
                        />
                    </ListItemButton>

                    <Divider sx={{ backgroundColor: themeMode === 'light' ? '#E0E0E0' : '#333333', margin: '8px 0' }} />

                    <ListItemButton
                        onClick={() => {
                            onClose();
                            onExportBackup && onExportBackup();
                        }}
                        sx={{ padding: '16px 24px', cursor: 'pointer', '&:hover': { backgroundColor: themeMode === 'light' ? '#F8F9FA' : '#333333' } }}
                    >
                        <ListItemIcon sx={{ minWidth: 40 }}>
                            <FileDownload sx={{ color: themeMode === 'light' ? '#BDC3C7' : '#aaaaaa' }} />
                        </ListItemIcon>
                        <ListItemText
                            primary={t('backup.export')}
                            primaryTypographyProps={{ color: themeMode === 'light' ? '#2C3E50' : '#ffffff', fontWeight: 500 }}
                        />
                    </ListItemButton>

                    <ListItemButton
                        onClick={handleImportClick}
                        sx={{ padding: '16px 24px', cursor: 'pointer', '&:hover': { backgroundColor: themeMode === 'light' ? '#F8F9FA' : '#333333' } }}
                    >
                        <ListItemIcon sx={{ minWidth: 40 }}>
                            <FileUpload sx={{ color: themeMode === 'light' ? '#BDC3C7' : '#aaaaaa' }} />
                        </ListItemIcon>
                        <ListItemText
                            primary={t('backup.import')}
                            primaryTypographyProps={{ color: themeMode === 'light' ? '#2C3E50' : '#ffffff', fontWeight: 500 }}
                        />
                    </ListItemButton>

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

                    <ListItemButton
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
                    </ListItemButton>

                    <ListItemButton
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
                    </ListItemButton>

                    <ListItemButton
                        onClick={() => {
                            onClose();
                            onOpenAppearanceDialog && onOpenAppearanceDialog();
                        }}
                        sx={{ padding: '16px 24px', cursor: 'pointer', '&:hover': { backgroundColor: themeMode === 'light' ? '#F8F9FA' : '#333333' } }}
                    >
                        <ListItemIcon sx={{ minWidth: 40 }}>
                            <Palette sx={{ color: themeMode === 'light' ? '#BDC3C7' : '#aaaaaa' }} />
                        </ListItemIcon>
                        <ListItemText
                            primary={t('appearance.menuLabel')}
                            primaryTypographyProps={{ color: themeMode === 'light' ? '#2C3E50' : '#ffffff', fontWeight: 500 }}
                        />
                    </ListItemButton>

                    <ListItemButton
                        onClick={() => {
                            onClose();
                            onOpenChangePasswordDialog && onOpenChangePasswordDialog();
                        }}
                        sx={{ padding: '16px 24px', cursor: 'pointer', '&:hover': { backgroundColor: themeMode === 'light' ? '#F8F9FA' : '#333333' } }}
                    >
                        <ListItemIcon sx={{ minWidth: 40 }}>
                            <LockOutlined sx={{ color: themeMode === 'light' ? '#BDC3C7' : '#aaaaaa' }} />
                        </ListItemIcon>
                        <ListItemText
                            primary={t('changePassword.menuLabel')}
                            primaryTypographyProps={{ color: themeMode === 'light' ? '#2C3E50' : '#ffffff', fontWeight: 500 }}
                        />
                    </ListItemButton>

                    <Divider sx={{ backgroundColor: themeMode === 'light' ? '#E0E0E0' : '#333333', margin: '8px 0' }} />

                    <ListItem sx={{ padding: '16px 24px' }}>
                        <ListItemIcon sx={{ minWidth: 40 }}>
                            <ViewListOutlined sx={{ color: themeMode === 'light' ? '#BDC3C7' : '#aaaaaa' }} />
                        </ListItemIcon>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" sx={{ color: themeMode === 'light' ? '#2C3E50' : '#ffffff', fontWeight: 500, marginBottom: 0.5 }}>
                                {t('bubbles.mainViewTasks')}
                            </Typography>
                            <Typography variant="caption" sx={{ display: 'block', color: themeMode === 'light' ? '#7F8C8D' : '#aaaaaa', marginBottom: 1, lineHeight: 1.3 }}>
                                {t('bubbles.mainViewTasksDesc')}
                            </Typography>
                            <Switch
                                checked={mainView === 'tasks'}
                                onChange={onToggleMainView}
                                size="small"
                                sx={{
                                    '& .MuiSwitch-switchBase.Mui-checked': { color: themeMode === 'light' ? '#3B7DED' : '#90CAF9' },
                                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: themeMode === 'light' ? '#3B7DED' : '#90CAF9' }
                                }}
                            />
                        </Box>
                    </ListItem>

                    <ListItem sx={{ padding: '16px 24px', opacity: mainView === 'tasks' ? 0.5 : 1 }}>
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
                                disabled={mainView === 'tasks'}
                                size="small"
                                sx={{
                                    '& .MuiSwitch-switchBase.Mui-checked': { color: themeMode === 'light' ? '#3B7DED' : '#90CAF9' },
                                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: themeMode === 'light' ? '#3B7DED' : '#90CAF9' }
                                }}
                            />
                        </Box>
                    </ListItem>

                    <ListItem sx={{ padding: '16px 24px', opacity: mainView === 'tasks' ? 0.5 : 1 }}>
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
                                disabled={mainView === 'tasks'}
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
                            <NotificationsActiveOutlined sx={{ color: themeMode === 'light' ? '#BDC3C7' : '#aaaaaa' }} />
                        </ListItemIcon>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" sx={{ color: themeMode === 'light' ? '#2C3E50' : '#ffffff', fontWeight: 500, marginBottom: 0.5 }}>
                                {t('bubbles.deviceReminders')}
                            </Typography>
                            {thisDevice && thisDevice.fcmToken === null && (
                                <Typography variant="caption" sx={{ display: 'block', color: themeMode === 'light' ? '#7F8C8D' : '#aaaaaa', marginBottom: 1, lineHeight: 1.3 }}>
                                    {t('bubbles.deviceRemindersNoPermission')}
                                </Typography>
                            )}
                            <Switch
                                checked={Boolean(thisDevice && thisDevice.notificationsEnabled)}
                                onChange={(e) => onToggleThisDeviceReminders(e.target.checked)}
                                disabled={!thisDevice}
                                inputProps={{ 'aria-label': t('bubbles.deviceReminders') }}
                                size="small"
                                sx={{
                                    '& .MuiSwitch-switchBase.Mui-checked': { color: themeMode === 'light' ? '#3B7DED' : '#90CAF9' },
                                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: themeMode === 'light' ? '#3B7DED' : '#90CAF9' }
                                }}
                            />
                        </Box>
                    </ListItem>

                    <ListItemButton
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
                    </ListItemButton>

                    <Divider sx={{ backgroundColor: themeMode === 'light' ? '#E0E0E0' : '#333333', margin: '8px 0' }} />

                    <ListItemButton
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
                    </ListItemButton>
                </List>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/json,.json"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                />
            </Box>
        </Drawer>
    );
};

export default MainMenuDrawer;

