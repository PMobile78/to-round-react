import React from 'react';
import {
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Typography,
    Box,
    Paper,
    IconButton,
    Divider,
} from '@mui/material';
import {
    CloseOutlined,
    Edit,
    LabelOutlined,
    AllInclusive,
    DragHandle,
    DragIndicator,
    LocalOffer,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

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

    const getCategoryIcon = (category) => {
        return <LabelOutlined sx={{ color: category.color }} />;
    };

    const getBubbleCount = (categoryId) => {
        return bubbleCounts[categoryId] || 0;
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
                color: themeMode === 'light' ? '#2C3E50' : '#ffffff',
                borderRight: `1px solid ${themeMode === 'light' ? '#E0E0E0' : '#333333'}`,
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
                borderBottom: `1px solid ${themeMode === 'light' ? '#E0E0E0' : '#333333'}`
            }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {t('bubbles.taskCategories')}
                </Typography>
                {!isPermanent && (
                    <IconButton
                        onClick={onClose}
                        sx={{
                            color: themeMode === 'light' ? '#BDC3C7' : '#aaaaaa',
                            '&:hover': {
                                backgroundColor: themeMode === 'light' ? '#F8F9FA' : '#333333'
                            }
                        }}
                    >
                        <CloseOutlined />
                    </IconButton>
                )}
            </Box>

            {/* Список категорий */}
            <List sx={{ padding: 0 }}>
                {/* Все категории */}
                <ListItemButton
                    onClick={() => onCategorySelect('all')}
                    selected={selectedCategory === 'all'}
                    sx={{
                        padding: '16px 20px',
                        cursor: 'pointer',
                        borderLeft: selectedCategory === 'all' ? '4px solid #3B7DED' : '4px solid transparent',
                        backgroundColor: selectedCategory === 'all'
                            ? (themeMode === 'light' ? '#F8F9FA' : '#333333')
                            : 'transparent',
                        '&:hover': {
                            backgroundColor: themeMode === 'light' ? '#F8F9FA' : '#333333'
                        },
                        '&.Mui-selected': {
                            backgroundColor: themeMode === 'light' ? '#F8F9FA' : '#333333',
                            '&:hover': {
                                backgroundColor: themeMode === 'light' ? '#F8F9FA' : '#333333'
                            }
                        }
                    }}
                >
                    <Box sx={{ width: 4 }} />
                    <ListItemIcon sx={{ minWidth: 40 }}>
                        <AllInclusive sx={{ color: themeMode === 'light' ? '#BDC3C7' : '#aaaaaa' }} />
                    </ListItemIcon>
                    <ListItemText
                        primary={t('categories.allCategories')}
                        primaryTypographyProps={{
                            color: themeMode === 'light' ? '#2C3E50' : '#ffffff',
                            fontWeight: 500,
                            noWrap: true
                        }}
                    />
                    <Typography
                        variant="caption"
                        sx={{
                            color: themeMode === 'light' ? '#2C3E50' : '#ffffff',
                            fontWeight: 'bold',
                            fontSize: '12px',
                            backgroundColor: 'transparent'
                        }}
                    >
                        {bubbles.filter(bubble => bubble.status === 'active').length}
                    </Typography>
                </ListItemButton>


                {/* No tags категория */}
                <ListItemButton
                    onClick={() => onCategorySelect('no-tags')}
                    selected={selectedCategory === 'no-tags'}
                    sx={{
                        padding: '16px 20px',
                        cursor: 'pointer',
                        borderLeft: selectedCategory === 'no-tags' ? '4px solid #3B7DED' : '4px solid transparent',
                        backgroundColor: selectedCategory === 'no-tags'
                            ? (themeMode === 'light' ? '#F8F9FA' : '#333333')
                            : 'transparent',
                        '&:hover': {
                            backgroundColor: themeMode === 'light' ? '#F8F9FA' : '#333333'
                        },
                        '&.Mui-selected': {
                            backgroundColor: themeMode === 'light' ? '#F8F9FA' : '#333333',
                            '&:hover': {
                                backgroundColor: themeMode === 'light' ? '#F8F9FA' : '#333333'
                            }
                        }
                    }}
                >
                    <Box sx={{ width: 4 }} />
                    <ListItemIcon sx={{ minWidth: 40 }}>
                        <LabelOutlined sx={{ color: themeMode === 'light' ? '#BDC3C7' : '#aaaaaa' }} />
                    </ListItemIcon>
                    <ListItemText
                        primary={t('bubbles.noTags')}
                        primaryTypographyProps={{
                            color: themeMode === 'light' ? '#2C3E50' : '#ffffff',
                            fontWeight: 500,
                            noWrap: true
                        }}
                    />
                    <Typography
                        variant="caption"
                        sx={{
                            color: themeMode === 'light' ? '#2C3E50' : '#ffffff',
                            fontWeight: 'bold',
                            fontSize: '12px',
                            backgroundColor: 'transparent'
                        }}
                    >
                        {bubbles.filter(bubble => bubble.status === 'active' && !bubble.tagId).length}
                    </Typography>
                </ListItemButton>


                {/* Запланированные (как вкладка в списке задач): dueDate в будущем */}
                <ListItemButton
                    onClick={() => onCategorySelect('planned-tasks')}
                    selected={selectedCategory === 'planned-tasks'}
                    sx={{
                        padding: '16px 20px',
                        cursor: 'pointer',
                        borderLeft: selectedCategory === 'planned-tasks' ? '4px solid #3B7DED' : '4px solid transparent',
                        backgroundColor: selectedCategory === 'planned-tasks'
                            ? (themeMode === 'light' ? '#F8F9FA' : '#333333')
                            : 'transparent',
                        '&:hover': {
                            backgroundColor: themeMode === 'light' ? '#F8F9FA' : '#333333'
                        },
                        '&.Mui-selected': {
                            backgroundColor: themeMode === 'light' ? '#F8F9FA' : '#333333',
                            '&:hover': {
                                backgroundColor: themeMode === 'light' ? '#F8F9FA' : '#333333'
                            }
                        }
                    }}
                >
                    <Box sx={{ width: 4 }} />
                    <ListItemIcon sx={{ minWidth: 40 }}>
                        <LocalOffer sx={{ color: '#FF9800' }} />
                    </ListItemIcon>
                    <ListItemText
                        primary={t('bubbles.postponedTasks')}
                        primaryTypographyProps={{
                            color: themeMode === 'light' ? '#2C3E50' : '#ffffff',
                            fontWeight: 500,
                            noWrap: true
                        }}
                    />
                    <Typography
                        variant="caption"
                        sx={{
                            color: themeMode === 'light' ? '#2C3E50' : '#ffffff',
                            fontWeight: 'bold',
                            fontSize: '12px',
                            backgroundColor: 'transparent'
                        }}
                    >
                        {plannedTasksCount}
                    </Typography>
                </ListItemButton>

                <Divider
                    textAlign="left"
                    sx={{
                        borderColor: themeMode === 'light' ? '#E0E0E0' : '#333333',
                        color: themeMode === 'light' ? '#757575' : '#aaaaaa',
                        mx: 2,
                        my: 1.5
                    }}
                >
                    <Box
                        sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 1,
                            px: 1,
                            borderRadius: 1,
                            bgcolor: themeMode === 'light' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(30, 30, 30, 0.95)'
                        }}
                    >
                        <LabelOutlined sx={{ fontSize: 18, color: themeMode === 'light' ? '#9E9E9E' : '#888888' }} />
                        <Typography variant="overline" sx={{ letterSpacing: 1 }}>
                            {t('bubbles.tags', { defaultValue: 'Tags' })}
                        </Typography>
                    </Box>
                </Divider>

                {allCategories.map((category, index) => (
                    <React.Fragment key={category.id}>
                        <ListItemButton
                            draggable
                            onDragStart={handleDragStart(index)}
                            onDragOver={handleDragOver(index)}
                            onDrop={handleDrop(index)}
                            onClick={() => onCategorySelect(category.id)}
                            selected={selectedCategory === category.id}
                            sx={{
                                padding: '16px 16px 16px 0px',
                                cursor: 'pointer',
                                borderLeft: selectedCategory === category.id ? '4px solid #3B7DED' : '4px solid transparent',
                                backgroundColor: selectedCategory === category.id
                                    ? (themeMode === 'light' ? '#F8F9FA' : '#333333')
                                    : 'transparent',
                                '&:hover': {
                                    backgroundColor: themeMode === 'light' ? '#F8F9FA' : '#333333'
                                },
                                '&.Mui-selected': {
                                    backgroundColor: themeMode === 'light' ? '#F8F9FA' : '#333333',
                                    '&:hover': {
                                        backgroundColor: themeMode === 'light' ? '#F8F9FA' : '#333333'
                                    }
                                },
                                '& .drag-handle': {
                                    opacity: 0,
                                    transition: 'opacity 0.15s ease'
                                },
                                '&:hover .drag-handle': {
                                    opacity: 1
                                }
                            }}
                        >
                            <DragIndicator
                                className="drag-handle"
                                sx={{
                                    color: themeMode === 'light' ? '#BDC3C7' : '#aaaaaa',
                                    cursor: 'grab'
                                }}
                            />
                            <ListItemIcon sx={{ minWidth: 40 }}>
                                {getCategoryIcon(category)}
                            </ListItemIcon>
                            <ListItemText
                                primary={category.name}
                                primaryTypographyProps={{
                                    color: themeMode === 'light' ? '#2C3E50' : '#ffffff',
                                    fontWeight: 500,
                                    noWrap: true
                                }}
                            />
                            <Typography
                                variant="caption"
                                sx={{
                                    color: themeMode === 'light' ? '#2C3E50' : '#ffffff',
                                    fontWeight: 'bold',
                                    fontSize: '12px',
                                    backgroundColor: 'transparent',
                                    ml: 'auto'
                                }}
                            >
                                {getBubbleCount(category.id)}
                            </Typography>
                        </ListItemButton>
                        {index < allCategories.length - 1 && (
                            <Divider sx={{
                                backgroundColor: themeMode === 'light' ? '#E0E0E0' : '#333333',
                                margin: '0 20px'
                            }} />
                        )}
                    </React.Fragment>
                ))}
            </List>

            {/* Разделитель для настроек */}
            <Divider sx={{
                backgroundColor: themeMode === 'light' ? '#E0E0E0' : '#333333',
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
                            backgroundColor: themeMode === 'light' ? '#F8F9FA' : '#333333'
                        }
                    }}
                >
                    <ListItemIcon sx={{ minWidth: 40 }}>
                        <Edit sx={{ color: themeMode === 'light' ? '#BDC3C7' : '#aaaaaa' }} />
                    </ListItemIcon>
                    <ListItemText
                        primary={t('bubbles.manageTags')}
                        primaryTypographyProps={{
                            color: themeMode === 'light' ? '#2C3E50' : '#ffffff',
                            fontWeight: 500
                        }}
                    />
                </ListItem>
            </List> */}
        </Paper>
    );
};

export default TasksCategoriesPanel; 