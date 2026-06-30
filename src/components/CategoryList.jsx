import React from 'react';
import {
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    ListItem,
    Typography,
    Box,
    Divider,
    MenuItem,
    Chip
} from '@mui/material';
import {
    LabelOutlined,
    AllInclusive,
    DragIndicator,
    LocalOffer,
    DeleteOutlined,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

export default function CategoryList({
    tags,
    selectedCategory,
    onCategorySelect,
    bubbleCounts = {},
    plannedTasksCount = 0,
    bubbles = [],
    themeMode = 'light',
    variant = 'sidebar', // 'sidebar', 'dialog', 'dropdown'
    onDragStart,
    onDragOver,
    onDrop,
    draggedIndex,
    renderRowExtra,
    isItemDeleting = () => false, // function(tag) => boolean
    getBubbleCountByTag = (tagId) => bubbleCounts[tagId] || 0
}) {
    const { t } = useTranslation();

    const getBubbleCount = (categoryId) => {
        return bubbleCounts[categoryId] || 0;
    };

    // For sidebar variant - render ListItemButton
    if (variant === 'sidebar') {
        return (
            <List sx={{ padding: 0 }}>
                {/* All categories */}
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

                {/* No tags category */}
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

                {/* Planned tasks */}
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

                {/* Tag rows */}
                {tags.map((tag, index) => (
                    <React.Fragment key={tag.id}>
                        <ListItemButton
                            draggable={!!onDragStart}
                            onDragStart={onDragStart ? onDragStart(index) : undefined}
                            onDragOver={onDragOver ? onDragOver(index) : undefined}
                            onDrop={onDrop ? onDrop(index) : undefined}
                            onClick={() => onCategorySelect(tag.id)}
                            selected={selectedCategory === tag.id}
                            sx={{
                                padding: '16px 16px 16px 0px',
                                cursor: 'pointer',
                                borderLeft: selectedCategory === tag.id ? '4px solid #3B7DED' : '4px solid transparent',
                                backgroundColor: selectedCategory === tag.id
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
                            {onDragStart && (
                                <DragIndicator
                                    className="drag-handle"
                                    sx={{
                                        color: themeMode === 'light' ? '#BDC3C7' : '#aaaaaa',
                                        cursor: 'grab'
                                    }}
                                />
                            )}
                            <ListItemIcon sx={{ minWidth: 40 }}>
                                <LabelOutlined sx={{ color: tag.color }} />
                            </ListItemIcon>
                            <ListItemText
                                primary={tag.name}
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
                                {getBubbleCount(tag.id)}
                            </Typography>
                            {renderRowExtra && renderRowExtra(tag)}
                        </ListItemButton>
                        {index < tags.length - 1 && (
                            <Divider sx={{
                                backgroundColor: themeMode === 'light' ? '#E0E0E0' : '#333333',
                                margin: '0 20px'
                            }} />
                        )}
                    </React.Fragment>
                ))}
            </List>
        );
    }

    // For dropdown variant - render MenuItem elements
    if (variant === 'dropdown') {
        return (
            <>
                <MenuItem
                    value="all"
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 1,
                        padding: '12px 16px'
                    }}
                >
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        flex: 1,
                        minWidth: 0
                    }}>
                        <AllInclusive sx={{ color: themeMode === 'light' ? '#BDC3C7' : '#aaaaaa', fontSize: 20, flexShrink: 0 }} />
                        <Typography variant="body2" sx={{ color: themeMode === 'light' ? '#2C3E50' : '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {t('categories.allCategories')}
                        </Typography>
                    </Box>
                    <Chip
                        label={bubbles.filter(b => b.status === 'active').length}
                        size="small"
                        sx={{
                            flexShrink: 0,
                            backgroundColor: 'transparent',
                            color: themeMode === 'light' ? '#2C3E50' : '#ffffff',
                            fontWeight: 'bold',
                            fontSize: '12px',
                            border: `1px solid ${themeMode === 'light' ? '#E0E0E0' : '#666666'}`
                        }}
                    />
                </MenuItem>
                <MenuItem
                    value="no-tags"
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 1,
                        padding: '12px 16px'
                    }}
                >
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        flex: 1,
                        minWidth: 0
                    }}>
                        <LabelOutlined sx={{ color: themeMode === 'light' ? '#BDC3C7' : '#aaaaaa', fontSize: 20, flexShrink: 0 }} />
                        <Typography variant="body2" sx={{ color: themeMode === 'light' ? '#2C3E50' : '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {t('bubbles.noTags')}
                        </Typography>
                    </Box>
                    <Chip
                        label={bubbles.filter(b => b.status === 'active' && !b.tagId).length}
                        size="small"
                        sx={{
                            flexShrink: 0,
                            backgroundColor: 'transparent',
                            color: themeMode === 'light' ? '#2C3E50' : '#ffffff',
                            fontWeight: 'bold',
                            fontSize: '12px',
                            border: `1px solid ${themeMode === 'light' ? '#E0E0E0' : '#666666'}`
                        }}
                    />
                </MenuItem>
                <MenuItem
                    value="planned-tasks"
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 1,
                        padding: '12px 16px'
                    }}
                >
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        flex: 1,
                        minWidth: 0
                    }}>
                        <LocalOffer sx={{ color: '#FF9800', fontSize: 20, flexShrink: 0 }} />
                        <Typography variant="body2" sx={{ color: themeMode === 'light' ? '#2C3E50' : '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {t('bubbles.postponedTasks')}
                        </Typography>
                    </Box>
                    <Chip
                        label={plannedTasksCount}
                        size="small"
                        sx={{
                            flexShrink: 0,
                            backgroundColor: 'transparent',
                            color: themeMode === 'light' ? '#2C3E50' : '#ffffff',
                            fontWeight: 'bold',
                            fontSize: '12px',
                            border: `1px solid ${themeMode === 'light' ? '#E0E0E0' : '#666666'}`
                        }}
                    />
                </MenuItem>
                {tags.map(tag => (
                    <MenuItem
                        key={tag.id}
                        value={tag.id}
                        sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 1,
                            padding: '12px 16px'
                        }}
                    >
                        <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            flex: 1,
                            minWidth: 0
                        }}>
                            <LabelOutlined sx={{ color: tag.color, fontSize: 20, flexShrink: 0 }} />
                            <Typography variant="body2" title={tag.name} sx={{
                                color: themeMode === 'light' ? '#2C3E50' : '#ffffff',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                            }}>
                                {tag.name}
                            </Typography>
                        </Box>
                        <Chip
                            label={getBubbleCount(tag.id)}
                            size="small"
                            sx={{
                                flexShrink: 0,
                                backgroundColor: 'transparent',
                                color: themeMode === 'light' ? '#2C3E50' : '#ffffff',
                                fontWeight: 'bold',
                                fontSize: '12px',
                                border: `1px solid ${themeMode === 'light' ? '#E0E0E0' : '#666666'}`
                            }}
                        />
                    </MenuItem>
                ))}
            </>
        );
    }

    // For dialog variant - render ListItem elements (for tag management dialog)
    if (variant === 'dialog') {
        return (
            <List sx={{ padding: 0, marginTop: 3 }}>
                {tags.map((tag, index) => {
                    const deleting = isItemDeleting(tag);
                    return (
                        <React.Fragment key={tag.id}>
                            <ListItem
                                draggable={!deleting && !!onDragStart}
                                onDragStart={onDragStart ? onDragStart(index) : undefined}
                                onDragOver={onDragOver ? onDragOver(index) : undefined}
                                onDrop={onDrop ? onDrop(index) : undefined}
                                sx={{
                                    border: '1px solid #E0E0E0',
                                    borderRadius: 2,
                                    marginBottom: 1,
                                    padding: 2,
                                    opacity: deleting ? 0.7 : 1,
                                    transition: 'opacity 0.3s ease',
                                    cursor: deleting ? 'default' : onDragStart ? 'grab' : 'default',
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
                                    {!deleting && (
                                        <Box sx={{
                                            width: 24,
                                            height: 24,
                                            borderRadius: '50%',
                                            backgroundColor: tag.color,
                                            border: '2px solid #E0E0E0'
                                        }} />
                                    )}
                                    <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {deleting ? (
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <DeleteOutlined sx={{ fontSize: 20, color: 'text.secondary' }} />
                                                    {t('bubbles.tagDeleted')}
                                                </Box>
                                            ) : (
                                                tag.name
                                            )}
                                        </Typography>
                                        {!deleting && (
                                            <Typography variant="body2" color="text.secondary">
                                                {getBubbleCountByTag(tag.id)} {getBubbleCountByTag(tag.id) === 1 ? t('bubbles.bubble') : t('bubbles.bubbles')}
                                            </Typography>
                                        )}
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 1, flexShrink: 0, alignItems: 'center' }}>
                                        {renderRowExtra && renderRowExtra(tag)}
                                        {!deleting && onDragStart && (
                                            <DragIndicator className="drag-handle" sx={{ color: themeMode === 'light' ? '#BDC3C7' : '#aaaaaa', ml: 0.5, cursor: 'grab' }} />
                                        )}
                                    </Box>
                                </Box>
                            </ListItem>
                        </React.Fragment>
                    );
                })}
            </List>
        );
    }

    return null;
}
