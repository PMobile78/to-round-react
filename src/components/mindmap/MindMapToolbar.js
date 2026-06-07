import React from 'react';
import {
    Paper, Box, IconButton, ToggleButton, ToggleButtonGroup, Tooltip, Divider, TextField
} from '@mui/material';
import {
    FormatBold, Add, Remove, DeleteOutline, ImageOutlined,
    CropSquare, CircleOutlined, CloudOutlined, RemoveOutlined,
    LinearScaleOutlined, MoreHorizOutlined
} from '@mui/icons-material';

const QUICK_EMOJIS = ['💡', '⭐', '✅', '❗', '🎯', '📌', '🔥', '❤️', '📅', '💰', '🌱', '🚀'];

const MindMapToolbar = ({ node, isRoot, branchColors, onChange, onDelete, t }) => {
    if (!node) return null;

    const setImage = () => {
        const url = window.prompt(t('mindmap.enterImageUrl'), node.imageUrl || '');
        if (url === null) return;
        onChange({ imageUrl: url.trim() || null });
    };

    return (
        <Paper
            elevation={4}
            sx={{
                position: 'absolute',
                top: 12,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 30,
                px: 1.5,
                py: 1,
                borderRadius: 3,
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                maxWidth: 'calc(100% - 24px)'
            }}
            onPointerDown={(e) => e.stopPropagation()}
        >
            {/* Branch colors */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                {branchColors.map((c) => (
                    <Box
                        key={c}
                        onClick={() => onChange({ color: c })}
                        sx={{
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            backgroundColor: c,
                            cursor: 'pointer',
                            border: node.color === c ? '3px solid #2C3E50' : '2px solid #fff',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                        }}
                    />
                ))}
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                {/* Shape */}
                <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={node.shape}
                    onChange={(e, v) => v && onChange({ shape: v })}
                >
                    <ToggleButton value="rounded" title={t('mindmap.shapeRounded')}>
                        <Box sx={{ width: 14, height: 22, border: '2px solid currentColor', borderRadius: '999px' }} />
                    </ToggleButton>
                    <ToggleButton value="square" title={t('mindmap.shapeSquare')}><CropSquare fontSize="small" /></ToggleButton>
                    <ToggleButton value="circle" title={t('mindmap.shapeCircle')}><CircleOutlined fontSize="small" /></ToggleButton>
                    <ToggleButton value="ellipse" title={t('mindmap.shapeEllipse')}>
                        <Box sx={{ width: 15, height: 24, border: '2px solid currentColor', borderRadius: '50%' }} />
                    </ToggleButton>
                    <ToggleButton value="pill" title={t('mindmap.shapePill')}>
                        <Box sx={{ width: 22, height: 14, border: '2px solid currentColor', borderRadius: '999px' }} />
                    </ToggleButton>
                    <ToggleButton value="cloud" title={t('mindmap.shapeCloud')}><CloudOutlined fontSize="small" /></ToggleButton>
                    <ToggleButton value="none" title={t('mindmap.shapeNone')}><RemoveOutlined fontSize="small" /></ToggleButton>
                </ToggleButtonGroup>

                <Divider orientation="vertical" flexItem />

                {/* Bold */}
                <Tooltip title={t('mindmap.bold')}>
                    <ToggleButton
                        size="small"
                        value="bold"
                        selected={!!node.bold}
                        onChange={() => onChange({ bold: !node.bold })}
                    >
                        <FormatBold fontSize="small" />
                    </ToggleButton>
                </Tooltip>

                {/* Font size */}
                <Tooltip title={t('mindmap.decreaseFont')}>
                    <IconButton size="small" onClick={() => onChange({ fontSize: Math.max(10, (node.fontSize || 16) - 2) })}>
                        <Remove fontSize="small" />
                    </IconButton>
                </Tooltip>
                <Tooltip title={t('mindmap.increaseFont')}>
                    <IconButton size="small" onClick={() => onChange({ fontSize: Math.min(48, (node.fontSize || 16) + 2) })}>
                        <Add fontSize="small" />
                    </IconButton>
                </Tooltip>

                <Divider orientation="vertical" flexItem />

                {/* Line style + width (non-root only) */}
                {!isRoot && (
                    <>
                        <Tooltip title={t('mindmap.lineStyle')}>
                            <ToggleButton
                                size="small"
                                value="dashed"
                                selected={node.lineStyle === 'dashed'}
                                onChange={() => onChange({ lineStyle: node.lineStyle === 'dashed' ? 'solid' : 'dashed' })}
                            >
                                <MoreHorizOutlined fontSize="small" />
                            </ToggleButton>
                        </Tooltip>
                        <Tooltip title={t('mindmap.thinner')}>
                            <IconButton size="small" onClick={() => onChange({ lineWidth: Math.max(2, (node.lineWidth || 6) - 2) })}>
                                <LinearScaleOutlined fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title={t('mindmap.thicker')}>
                            <IconButton size="small" onClick={() => onChange({ lineWidth: Math.min(24, (node.lineWidth || 6) + 2) })}>
                                <LinearScaleOutlined />
                            </IconButton>
                        </Tooltip>
                        <Divider orientation="vertical" flexItem />
                    </>
                )}

                {/* Image */}
                <Tooltip title={t('mindmap.image')}>
                    <IconButton size="small" onClick={setImage} color={node.imageUrl ? 'primary' : 'default'}>
                        <ImageOutlined fontSize="small" />
                    </IconButton>
                </Tooltip>

                {/* Delete */}
                {!isRoot && (
                    <Tooltip title={t('mindmap.deleteNode')}>
                        <IconButton size="small" onClick={() => onDelete(node)} sx={{ color: '#E5484D' }}>
                            <DeleteOutline fontSize="small" />
                        </IconButton>
                    </Tooltip>
                )}
            </Box>

            {/* Emoji row */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                {QUICK_EMOJIS.map((em) => (
                    <Box
                        key={em}
                        onClick={() => onChange({ icon: node.icon === em ? null : em })}
                        sx={{
                            fontSize: 18,
                            cursor: 'pointer',
                            lineHeight: 1,
                            padding: '2px',
                            borderRadius: 1,
                            backgroundColor: node.icon === em ? 'action.selected' : 'transparent',
                            '&:hover': { backgroundColor: 'action.hover' }
                        }}
                    >
                        {em}
                    </Box>
                ))}
                <TextField
                    size="small"
                    variant="standard"
                    placeholder={t('mindmap.emoji')}
                    value={node.icon || ''}
                    onChange={(e) => onChange({ icon: e.target.value || null })}
                    sx={{ width: 64, ml: 0.5 }}
                    inputProps={{ style: { fontSize: 16, textAlign: 'center' } }}
                />
            </Box>
        </Paper>
    );
};

export default MindMapToolbar;
