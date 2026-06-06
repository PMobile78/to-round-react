import React, { useEffect, useState } from 'react';
import { Box, IconButton, Typography, Button, TextField, CircularProgress } from '@mui/material';
import { ArrowBack, MenuOpen, AddCircleOutline } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useMindmaps } from '../hooks/useMindmaps';
import MindMapCanvas from '../components/mindmap/MindMapCanvas';
import MindMapListDrawer from '../components/mindmap/MindMapListDrawer';

const MindMapPage = ({ onBack, themeMode = 'light', isMobile = false }) => {
    const { t } = useTranslation();
    const {
        maps, loading, currentMapId, setCurrentMapId,
        createMap, removeMap, updateMap, renameMap, genId, branchColors
    } = useMindmaps();

    const [listOpen, setListOpen] = useState(false);
    const [titleDraft, setTitleDraft] = useState('');

    const currentMap = maps.find((m) => m.id === currentMapId) || null;

    // Auto-select first map (or open list when there are none) once loaded.
    useEffect(() => {
        if (loading || currentMapId) return;
        if (maps.length > 0) {
            setCurrentMapId(maps[0].id);
        } else {
            setListOpen(true);
        }
    }, [loading, maps, currentMapId, setCurrentMapId]);

    useEffect(() => {
        setTitleDraft(currentMap?.title || '');
    }, [currentMap?.id, currentMap?.title]);

    const handleNodesChange = (nodes) => {
        if (!currentMap) return;
        updateMap(currentMap.id, (m) => ({ ...m, nodes }));
    };

    const headerBg = themeMode === 'light' ? '#FFFFFF' : '#1e1e1e';
    const headerColor = themeMode === 'light' ? '#2C3E50' : '#FFFFFF';

    return (
        <Box sx={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', backgroundColor: '#FCFBF7' }}>
            {/* Header */}
            <Box
                sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 56,
                    zIndex: 40,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 1.5,
                    backgroundColor: headerBg,
                    borderBottom: themeMode === 'light' ? '1px solid #E0E0E0' : '1px solid #333',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
                }}
            >
                <IconButton onClick={onBack} sx={{ color: headerColor }}>
                    <ArrowBack />
                </IconButton>
                <IconButton onClick={() => setListOpen(true)} sx={{ color: headerColor }}>
                    <MenuOpen />
                </IconButton>
                {currentMap ? (
                    <TextField
                        variant="standard"
                        value={titleDraft}
                        onChange={(e) => setTitleDraft(e.target.value)}
                        onBlur={() => renameMap(currentMap.id, titleDraft.trim() || t('mindmap.untitled'))}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                        InputProps={{ disableUnderline: true, style: { fontSize: 18, fontWeight: 600, color: headerColor } }}
                        sx={{ flex: 1, maxWidth: 360 }}
                    />
                ) : (
                    <Typography variant="h6" sx={{ flex: 1, color: headerColor }}>
                        {t('mindmap.title')}
                    </Typography>
                )}
            </Box>

            {/* Canvas area */}
            <Box sx={{ position: 'absolute', top: 56, left: 0, right: 0, bottom: 0 }}>
                {loading ? (
                    <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CircularProgress />
                    </Box>
                ) : currentMap ? (
                    <MindMapCanvas
                        key={currentMap.id}
                        map={currentMap}
                        branchColors={branchColors}
                        genId={genId}
                        onNodesChange={handleNodesChange}
                        t={t}
                    />
                ) : (
                    <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                        <Typography variant="body1" color="text.secondary">
                            {t('mindmap.noMapSelected')}
                        </Typography>
                        <Button variant="contained" startIcon={<AddCircleOutline />} onClick={() => { createMap(t('mindmap.untitled')); }}>
                            {t('mindmap.createMap')}
                        </Button>
                    </Box>
                )}
            </Box>

            <MindMapListDrawer
                open={listOpen}
                onClose={() => setListOpen(false)}
                isMobile={isMobile}
                themeMode={themeMode}
                maps={maps}
                currentMapId={currentMapId}
                onSelect={(id) => { setCurrentMapId(id); setListOpen(false); }}
                onCreate={(title) => { createMap(title); setListOpen(false); }}
                onDelete={(id) => removeMap(id)}
                t={t}
            />
        </Box>
    );
};

export default MindMapPage;
