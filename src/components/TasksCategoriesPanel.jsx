import React from 'react';
import {
    Typography,
    Box,
    Paper,
    IconButton,
    useTheme,
} from '@mui/material';
import {
    CloseOutlined,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import CategoryList from './CategoryList';

const TasksCategoriesPanel = ({
    open,
    onClose,
    tags,
    selectedCategory,
    onCategorySelect,
    themeMode,
    bubbleCounts = {},
    onOpenTagDialog,
    bubbles = [],
    isPermanent = false,
    onReorderTags,
    plannedTasksCount = 0,
}) => {
    const { t } = useTranslation();
    const theme = useTheme();

    // Используем теги как категории
    const allCategories = tags;

    // DnD упрощенный: перетаскивание элементов списка
    const [draggedIndex, setDraggedIndex] = React.useState(null);
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
        const updated = [...allCategories];
        const [removed] = updated.splice(draggedIndex, 1);
        updated.splice(index, 0, removed);
        onReorderTags && onReorderTags(updated);
        setDraggedIndex(null);
    };


    return (
        <Paper
            elevation={16}
            square
            sx={{
                position: 'fixed',
                left: 0,
                top: 0,
                height: '100vh',
                width: 320,
                color: 'text.primary',
                borderRight: `1px solid ${theme.palette.divider}`,
                zIndex: 1200,
                display: open ? 'block' : 'none',
                overflowY: 'auto'
            }}
        >
            {/* Заголовок */}
            <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 20px',
                borderBottom: `1px solid ${theme.palette.divider}`
            }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {t('bubbles.taskCategories')}
                </Typography>
                {!isPermanent && (
                    <IconButton
                        onClick={onClose}
                        sx={{
                            color: 'text.secondary',
                            '&:hover': {
                                backgroundColor: theme.palette.action.hover
                            }
                        }}
                    >
                        <CloseOutlined />
                    </IconButton>
                )}
            </Box>

            {/* Список категорий */}
            <CategoryList
                tags={allCategories}
                selectedCategory={selectedCategory}
                onCategorySelect={onCategorySelect}
                bubbleCounts={bubbleCounts}
                plannedTasksCount={plannedTasksCount}
                bubbles={bubbles}
                themeMode={themeMode}
                variant="sidebar"
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                draggedIndex={draggedIndex}
            />

            {/* Разделитель для настроек */}
            <Divider sx={{
                backgroundColor: theme.palette.divider,
                margin: '16px 20px'
            }} />

            {/* Настройки категорий */}
            {/* <List sx={{ padding: 0 }}>
                <ListItem
                    button
                    onClick={() => {
                        // Открыть диалог управления тегами
                        onClose();
                        if (onOpenTagDialog) {
                            onOpenTagDialog();
                        }
                    }}
                    sx={{
                        padding: '16px 20px',
                        cursor: 'pointer',
                        '&:hover': {
                            backgroundColor: theme.palette.action.hover
                        }
                    }}
                >
                    <ListItemIcon sx={{ minWidth: 40 }}>
                        <Edit sx={{ color: 'text.secondary' }} />
                    </ListItemIcon>
                    <ListItemText
                        primary={t('bubbles.manageTags')}
                        primaryTypographyProps={{
                            color: 'text.primary',
                            fontWeight: 500
                        }}
                    />
                </ListItem>
            </List> */}
        </Paper>
    );
};

export default TasksCategoriesPanel; 