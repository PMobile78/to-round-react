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
    List
} from '@mui/material';
import { Add, CloseOutlined, DeleteOutlined, Edit, Category } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { reorderArray } from '../utils/reorderArray';
import CategoryList from './CategoryList';

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
                    color: 'text.primary',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}
            >
                {t('bubbles.taskCategories')}
                <IconButton onClick={onClose} sx={{ color: 'text.primary' }}>
                    <CloseOutlined />
                </IconButton>
            </DialogTitle>
            <DialogContent sx={{ padding: isMobile ? 2 : 3, paddingTop: isMobile ? 4 : 5, paddingBottom: isMobile ? 10 : 0 }}>
                {tags.length > 0 ? (
                    <CategoryList
                        tags={tags}
                        selectedCategory={null}
                        onCategorySelect={() => {}}
                        bubbleCounts={{}}
                        plannedTasksCount={0}
                        bubbles={[]}
                        themeMode={themeMode}
                        variant="dialog"
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        draggedIndex={draggedIndex}
                        isItemDeleting={(tag) => deletingTags?.has ? deletingTags.has(tag.id) : false}
                        getBubbleCountByTag={getBubbleCountByTag}
                        renderRowExtra={(tag) => {
                            const isDeleting = deletingTags?.has ? deletingTags.has(tag.id) : false;
                            return isDeleting ? (
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
                                </>
                            );
                        }}
                    />
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


