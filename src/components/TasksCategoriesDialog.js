import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Box,
    Typography,
    Button,
    IconButton,
    List,
    ListItem
} from '@mui/material';
import { Add, CloseOutlined, DeleteOutlined, Edit, Category, DragHandle, DragIndicator } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { reorderArray } from '../utils/reorderArray';

const TasksCategoriesDialog = ({
    open,
    onClose,
    tags,
    deletingTags,
    canCreateMoreTags,
    onAddTag,
    onEditTag,
    onDeleteTag,
    onUndoDeleteTag,
    getBubbleCountByTag,
    themeMode,
    isMobile,
    isSmallScreen,
    getDialogPaperStyles,
    onReorderTags
}) => {
    const { t } = useTranslation();
    const [draggedIndex, setDraggedIndex] = useState(null);

    const handleDragStart = (index) => (event) => {
        setDraggedIndex(index);
        event.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (index) => (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (index) => (event) => {
        event.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;
        const updated = reorderArray(tags, draggedIndex, index);
        onReorderTags && onReorderTags(updated);
        setDraggedIndex(null);
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            fullScreen={isSmallScreen}
            PaperProps={{
                sx: {
                    borderRadius: isSmallScreen ? 0 : 3,
                    ...(getDialogPaperStyles ? getDialogPaperStyles() : {}),
                    margin: isMobile ? 1 : 3,
                    position: isMobile ? 'relative' : 'static'
                }
            }}
        >
            <DialogTitle
                sx={{
                    backgroundColor: 'primary.main',
                    color: 'white',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}
            >
                {t('bubbles.taskCategories')}
                <IconButton onClick={onClose} sx={{ color: 'white' }}>
                    <CloseOutlined />
                </IconButton>
            </DialogTitle>
            <DialogContent sx={{ padding: isMobile ? 2 : 3, paddingTop: isMobile ? 4 : 5, paddingBottom: isMobile ? 10 : 0 }}>
                {tags.length > 0 ? (
                    <List sx={{ padding: 0, marginTop: 3 }}>
                        {tags.map((tag, index) => {
                            const isDeleting = deletingTags?.has ? deletingTags.has(tag.id) : false;
                            return (
                                <ListItem
                                    key={tag.id}
                                    draggable={!isDeleting}
                                    onDragStart={handleDragStart(index)}
                                    onDragOver={handleDragOver(index)}
                                    onDrop={handleDrop(index)}
                                    sx={{
                                        border: '1px solid #E0E0E0',
                                        borderRadius: 2,
                                        marginBottom: 1,
                                        padding: 2,
                                        opacity: isDeleting ? 0.7 : 1,
                                        transition: 'opacity 0.3s ease',
                                        cursor: isDeleting ? 'default' : 'grab',
                                        '& .drag-handle': {
                                            opacity: 0,
                                            transition: 'opacity 0.15s ease'
                                        },
                                        '&:hover .drag-handle': {
                                            opacity: 1
                                        },
                                        backgroundColor: draggedIndex === index ? (themeMode === 'light' ? '#F8F9FA' : '#2a2a2a') : 'transparent'
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 0 }}>
                                        {!isDeleting && (
                                            <Box
                                                sx={{
                                                    width: 24,
                                                    height: 24,
                                                    borderRadius: '50%',
                                                    backgroundColor: tag.color,
                                                    border: '2px solid #E0E0E0'
                                                }}
                                            />
                                        )}
                                        <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {isDeleting ? (
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <DeleteOutlined sx={{ fontSize: 20, color: 'text.secondary' }} />
                                                        {t('bubbles.tagDeleted')}
                                                    </Box>
                                                ) : (
                                                    tag.name
                                                )}
                                            </Typography>
                                            {!isDeleting && (
                                                <Typography variant="body2" color="text.secondary">
                                                    {getBubbleCountByTag(tag.id)} {getBubbleCountByTag(tag.id) === 1 ? t('bubbles.bubble') : t('bubbles.bubbles')}
                                                </Typography>
                                            )}
                                        </Box>
                                        <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                                            {isDeleting ? (
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    onClick={() => onUndoDeleteTag(tag.id)}
                                                    sx={{
                                                        color: 'primary.main',
                                                        borderColor: 'primary.main',
                                                        textTransform: 'none',
                                                        fontSize: '0.75rem',
                                                        padding: '4px 8px'
                                                    }}
                                                >
                                                    {t('bubbles.undo')}
                                                </Button>
                                            ) : (
                                                <>
                                                    <IconButton size="small" onClick={() => onEditTag(tag)} sx={{ color: 'primary.main' }}>
                                                        <Edit fontSize="small" />
                                                    </IconButton>
                                                    <IconButton size="small" onClick={() => onDeleteTag(tag.id)} sx={{ color: 'error.main' }}>
                                                        <DeleteOutlined fontSize="small" />
                                                    </IconButton>
                                                    <DragIndicator className="drag-handle" sx={{ color: themeMode === 'light' ? '#BDC3C7' : '#aaaaaa', ml: 0.5, cursor: 'grab' }} />
                                                </>
                                            )}
                                        </Box>
                                    </Box>
                                </ListItem>
                            );
                        })}
                    </List>
                ) : (
                    <Box
                        sx={{
                            textAlign: 'center',
                            padding: 4,
                            marginTop: 3,
                            color: 'text.secondary'
                        }}
                    >
                        <Category sx={{ fontSize: 48, marginBottom: 2, opacity: 0.5 }} />
                        <Typography variant="h6" gutterBottom>
                            {t('bubbles.noCategoriesYet')}
                        </Typography>
                        <Typography variant="body2">{t('bubbles.createFirstCategory')}</Typography>
                    </Box>
                )}
            </DialogContent>

            {!isMobile && (
                <Box
                    sx={{
                        borderTop: themeMode === 'light' ? '1px solid #E0E0E0' : '1px solid #333333',
                        padding: 3,
                        textAlign: 'center',
                        backgroundColor: 'transparent'
                    }}
                >
                    <Button
                        variant="text"
                        startIcon={<Add />}
                        onClick={() => {
                            if (canCreateMoreTags()) onAddTag();
                        }}
                        disabled={!canCreateMoreTags()}
                        sx={{
                            backgroundColor: 'transparent',
                            color: canCreateMoreTags()
                                ? themeMode === 'light'
                                    ? '#757575'
                                    : '#aaaaaa'
                                : themeMode === 'light'
                                    ? '#B0B0B0'
                                    : '#666666',
                            borderRadius: 2,
                            padding: '12px 24px',
                            textTransform: 'none',
                            fontWeight: 500,
                            minWidth: 140,
                            fontSize: '14px',
                            border: 'none',
                            '&:hover': {
                                backgroundColor: canCreateMoreTags()
                                    ? themeMode === 'light'
                                        ? 'rgba(117, 117, 117, 0.08)'
                                        : 'rgba(255, 255, 255, 0.1)'
                                    : 'transparent'
                            },
                            '& .MuiButton-startIcon': {
                                color: canCreateMoreTags()
                                    ? themeMode === 'light'
                                        ? '#757575'
                                        : '#aaaaaa'
                                    : themeMode === 'light'
                                        ? '#B0B0B0'
                                        : '#666666',
                                marginRight: 1.5,
                                fontSize: '20px'
                            }
                        }}
                    >
                        {canCreateMoreTags() ? t('bubbles.addTag') : t('bubbles.maxCategoriesReached')}
                    </Button>
                </Box>
            )}

            {isMobile && (
                <Box
                    sx={{
                        position: 'absolute',
                        bottom: 16,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 1001
                    }}
                >
                    <Button
                        variant="text"
                        startIcon={<Add />}
                        onClick={() => {
                            if (canCreateMoreTags()) onAddTag();
                        }}
                        disabled={!canCreateMoreTags()}
                        sx={{
                            backgroundColor: 'transparent',
                            color: canCreateMoreTags()
                                ? themeMode === 'light'
                                    ? '#757575'
                                    : '#aaaaaa'
                                : themeMode === 'light'
                                    ? '#B0B0B0'
                                    : '#666666',
                            borderRadius: 2,
                            padding: '12px 24px',
                            textTransform: 'none',
                            fontWeight: 500,
                            minWidth: 140,
                            fontSize: '14px',
                            border: 'none',
                            '&:hover': {
                                backgroundColor: canCreateMoreTags()
                                    ? themeMode === 'light'
                                        ? 'rgba(117, 117, 117, 0.08)'
                                        : 'rgba(255, 255, 255, 0.1)'
                                    : 'transparent'
                            },
                            '& .MuiButton-startIcon': {
                                color: canCreateMoreTags()
                                    ? themeMode === 'light'
                                        ? '#757575'
                                        : '#aaaaaa'
                                    : themeMode === 'light'
                                        ? '#B0B0B0'
                                        : '#666666',
                                marginRight: 1.5,
                                fontSize: '20px'
                            }
                        }}
                    >
                        {canCreateMoreTags() ? t('bubbles.addTag') : t('bubbles.maxCategoriesReached')}
                    </Button>
                </Box>
            )}
            <DialogActions />
        </Dialog>
    );
};

export default TasksCategoriesDialog;


