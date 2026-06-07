import React, { useState } from 'react';
import {
    Drawer, Box, Typography, List, ListItemButton, ListItemText, IconButton,
    Button, TextField, Divider, ToggleButton, ToggleButtonGroup, Chip
} from '@mui/material';
import { Add, DeleteOutline, AccountTree } from '@mui/icons-material';

const ENGINE_LABELS = {
    custom: 'engineCustom',
    reactflow: 'engineReactFlow',
    mindelixir: 'engineMindElixir'
};

const MindMapListDrawer = ({
    open, onClose, isMobile, themeMode, maps, currentMapId, onSelect, onCreate, onDelete, t
}) => {
    const [newTitle, setNewTitle] = useState('');
    const [engine, setEngine] = useState('custom');

    const handleCreate = () => {
        const title = newTitle.trim() || t('mindmap.untitled');
        onCreate(title, engine);
        setNewTitle('');
    };

    return (
        <Drawer
            anchor="left"
            open={open}
            onClose={onClose}
            PaperProps={{
                sx: {
                    width: isMobile ? '80%' : 320,
                    maxWidth: '90%',
                    backgroundColor: themeMode === 'light' ? '#FFFFFF' : '#1e1e1e'
                }
            }}
        >
            <Box sx={{ p: 2.5, borderBottom: themeMode === 'light' ? '1px solid #E0E0E0' : '1px solid #333' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <AccountTree sx={{ color: themeMode === 'light' ? '#2C3E50' : '#fff' }} />
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: themeMode === 'light' ? '#2C3E50' : '#fff' }}>
                        {t('mindmap.myMaps')}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                        size="small"
                        fullWidth
                        placeholder={t('mindmap.newMapName')}
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
                    />
                    <Button variant="contained" onClick={handleCreate} startIcon={<Add />} sx={{ flexShrink: 0 }}>
                        {t('mindmap.create')}
                    </Button>
                </Box>
                <Box sx={{ mt: 1.5 }}>
                    <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: 'text.secondary' }}>
                        {t('mindmap.engine')}
                    </Typography>
                    <ToggleButtonGroup
                        size="small"
                        exclusive
                        value={engine}
                        onChange={(e, v) => v && setEngine(v)}
                        fullWidth
                    >
                        <ToggleButton value="custom">{t('mindmap.engineCustom')}</ToggleButton>
                        <ToggleButton value="reactflow">{t('mindmap.engineReactFlow')}</ToggleButton>
                        <ToggleButton value="mindelixir">{t('mindmap.engineMindElixir')}</ToggleButton>
                    </ToggleButtonGroup>
                </Box>
            </Box>

            <Divider />

            <List sx={{ p: 0, overflowY: 'auto' }}>
                {maps.length === 0 && (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                            {t('mindmap.noMaps')}
                        </Typography>
                    </Box>
                )}
                {maps.map((m) => (
                    <ListItemButton
                        key={m.id}
                        selected={m.id === currentMapId}
                        onClick={() => onSelect(m.id)}
                    >
                        <ListItemText
                            primary={m.title || t('mindmap.untitled')}
                            primaryTypographyProps={{
                                color: themeMode === 'light' ? '#2C3E50' : '#fff',
                                fontWeight: m.id === currentMapId ? 600 : 400,
                                noWrap: true
                            }}
                            secondary={
                                <Chip
                                    label={t(`mindmap.${ENGINE_LABELS[m.engine] || 'engineCustom'}`)}
                                    size="small"
                                    variant="outlined"
                                    sx={{ height: 18, fontSize: 11, mt: 0.5 }}
                                />
                            }
                            secondaryTypographyProps={{ component: 'div' }}
                        />
                        <IconButton
                            edge="end"
                            size="small"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(t('mindmap.confirmDeleteMap'))) onDelete(m.id);
                            }}
                            sx={{ color: '#E5484D' }}
                        >
                            <DeleteOutline fontSize="small" />
                        </IconButton>
                    </ListItemButton>
                ))}
            </List>
        </Drawer>
    );
};

export default MindMapListDrawer;
