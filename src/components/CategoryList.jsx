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
    Chip,
    useTheme
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
    LabelOutlined,
    AllInclusive,
    DragIndicator,
    LocalOffer,
    DeleteOutlined,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

// Shared helper: render category row content (icon/color + name + count)
// Used across all three variants to eliminate duplication
function renderRowContent(item, theme, getCount, t, includeColorBox = false) {
    const count = getCount ? getCount(item.id) : 0;
    const isSpecial = ['all', 'no-tags', 'planned-tasks'].includes(item.id);

    // Determine icon/color for special categories
    let icon = null;
    if (item.id === 'all') {
        icon = <AllInclusive sx={{ color: theme.palette.text.secondary }} />;
    } else if (item.id === 'no-tags') {
        icon = <LabelOutlined sx={{ color: theme.palette.text.secondary }} />;
    } else if (item.id === 'planned-tasks') {
        icon = <LocalOffer sx={{ color: theme.palette.warning.main }} />;
    } else if (item.color) {
        icon = <LabelOutlined sx={{ color: item.color }} />;
    }

    // For dropdown/dialog: use colored box instead of icon
    let colorBox = null;
    if (includeColorBox) {
        if (item.id === 'no-tags') {
            colorBox = <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: 'grey.400', border: '1px solid', borderColor: 'divider', mr: 1 }} />;
        } else if (item.id === 'planned-tasks') {
            colorBox = <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: theme.palette.warning.main, border: '1px solid', borderColor: 'divider', mr: 1 }} />;
        } else if (item.color) {
            colorBox = <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: item.color, border: '1px solid', borderColor: 'divider', mr: 1 }} />;
        }
    }

    return { icon, colorBox, count };
}

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
    isItemDeleting = () => false,
    getBubbleCountByTag = (tagId) => bubbleCounts[tagId] || 0
}) {
    const { t } = useTranslation();
    const theme = useTheme();

    // Helper for sidebar variant
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
                        borderLeft: selectedCategory === 'all' ? `4px solid ${theme.palette.primary.main}` : '4px solid transparent',
                        backgroundColor: selectedCategory === 'all'
                            ? theme.palette.action.hover
                            : 'transparent',
                        '&:hover': {
                            backgroundColor: theme.palette.action.hover
                        },
                        '&.Mui-selected': {
                            backgroundColor: theme.palette.action.hover,
                            '&:hover': {
                                backgroundColor: theme.palette.action.hover
                            }
                        }
                    }}
                >
                    <Box sx={{ width: 4 }} />
                    <ListItemIcon sx={{ minWidth: 40 }}>
                        {renderRowContent({ id: 'all' }, theme, null, t).icon}
                    </ListItemIcon>
                    <ListItemText
                        primary={t('categories.allCategories')}
                        primaryTypographyProps={{
                            color: 'text.primary',
                            fontWeight: 500,
                            noWrap: true
                        }}
                    />
                    <Typography
                        variant="caption"
                        sx={{
                            color: 'text.primary',
                            fontWeight: 'bold',
                            fontSize: '12px',
                            backgroundColor: 'transparent'
                        }}
                    >
                        {bubbles.filter(bubble => bubble.status === 'active').length}
                    </Typography>
                </ListItemButton>

                {/* No tags */}
                <ListItemButton
                    onClick={() => onCategorySelect('no-tags')}
                    selected={selectedCategory === 'no-tags'}
                    sx={{
                        padding: '16px 20px',
                        cursor: 'pointer',
                        borderLeft: selectedCategory === 'no-tags' ? `4px solid ${theme.palette.primary.main}` : '4px solid transparent',
                        backgroundColor: selectedCategory === 'no-tags'
                            ? theme.palette.action.hover
                            : 'transparent',
                        '&:hover': {
                            backgroundColor: theme.palette.action.hover
                        },
                        '&.Mui-selected': {
                            backgroundColor: theme.palette.action.hover,
                            '&:hover': {
                                backgroundColor: theme.palette.action.hover
                            }
                        }
                    }}
                >
                    <Box sx={{ width: 4 }} />
                    <ListItemIcon sx={{ minWidth: 40 }}>
                        {renderRowContent({ id: 'no-tags' }, theme, null, t).icon}
                    </ListItemIcon>
                    <ListItemText
                        primary={t('bubbles.noTags')}
                        primaryTypographyProps={{
                            color: 'text.primary',
                            fontWeight: 500,
                            noWrap: true
                        }}
                    />
                    <Typography
                        variant="caption"
                        sx={{
                            color: 'text.primary',
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
                        borderLeft: selectedCategory === 'planned-tasks' ? `4px solid ${theme.palette.primary.main}` : '4px solid transparent',
                        backgroundColor: selectedCategory === 'planned-tasks'
                            ? theme.palette.action.hover
                            : 'transparent',
                        '&:hover': {
                            backgroundColor: theme.palette.action.hover
                        },
                        '&.Mui-selected': {
                            backgroundColor: theme.palette.action.hover,
                            '&:hover': {
                                backgroundColor: theme.palette.action.hover
                            }
                        }
                    }}
                >
                    <Box sx={{ width: 4 }} />
                    <ListItemIcon sx={{ minWidth: 40 }}>
                        {renderRowContent({ id: 'planned-tasks' }, theme, null, t).icon}
                    </ListItemIcon>
                    <ListItemText
                        primary={t('bubbles.postponedTasks')}
                        primaryTypographyProps={{
                            color: 'text.primary',
                            fontWeight: 500,
                            noWrap: true
                        }}
                    />
                    <Typography
                        variant="caption"
                        sx={{
                            color: 'text.primary',
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
                        borderColor: 'divider',
                        color: 'text.secondary',
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
                            bgcolor: alpha(theme.palette.background.paper, 0.95)
                        }}
                    >
                        <LabelOutlined sx={{ fontSize: 18, color: theme.palette.grey[500] }} />
                        <Typography variant="overline" sx={{ letterSpacing: 1 }}>
                            {t('bubbles.tags', { defaultValue: 'Tags' })}
                        </Typography>
                    </Box>
                </Divider>

                {/* Tag rows - using shared renderRowContent */}
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
                                borderLeft: selectedCategory === tag.id ? `4px solid ${theme.palette.primary.main}` : '4px solid transparent',
                                backgroundColor: selectedCategory === tag.id
                                    ? theme.palette.action.hover
                                    : 'transparent',
                                '&:hover': {
                                    backgroundColor: theme.palette.action.hover
                                },
                                '&.Mui-selected': {
                                    backgroundColor: theme.palette.action.hover,
                                    '&:hover': {
                                        backgroundColor: theme.palette.action.hover
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
                                        color: 'text.secondary',
                                        cursor: 'grab'
                                    }}
                                />
                            )}
                            <ListItemIcon sx={{ minWidth: 40 }}>
                                {renderRowContent(tag, theme, getBubbleCountByTag, t).icon}
                            </ListItemIcon>
                            <ListItemText
                                primary={tag.name}
                                primaryTypographyProps={{
                                    color: 'text.primary',
                                    fontWeight: 500,
                                    noWrap: true
                                }}
                            />
                            <Typography
                                variant="caption"
                                sx={{
                                    color: 'text.primary',
                                    fontWeight: 'bold',
                                    fontSize: '12px',
                                    backgroundColor: 'transparent',
                                    ml: 'auto'
                                }}
                            >
                                {renderRowContent(tag, theme, getBubbleCountByTag, t).count}
                            </Typography>
                            {renderRowExtra && renderRowExtra(tag)}
                        </ListItemButton>
                        {index < tags.length - 1 && (
                            <Divider sx={{
                                backgroundColor: theme.palette.divider,
                                margin: '0 20px'
                            }} />
                        )}
                    </React.Fragment>
                ))}
            </List>
        );
    }

    // Dropdown variant
    if (variant === 'dropdown') {
        return (
            <>
                {/* All, no-tags, planned-tasks */}
                {[
                    { id: 'all', name: t('categories.allCategories'), count: bubbles.filter(b => b.status === 'active').length },
                    { id: 'no-tags', name: t('bubbles.noTags'), count: bubbles.filter(b => b.status === 'active' && !b.tagId).length },
                    { id: 'planned-tasks', name: t('bubbles.postponedTasks'), count: plannedTasksCount }
                ].map(item => {
                    const { colorBox } = renderRowContent(item, theme, null, t, true);
                    return (
                        <MenuItem key={item.id} value={item.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, padding: '12px 16px' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
                                {colorBox}
                                <Typography variant="body2" sx={{ color: 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {item.name}
                                </Typography>
                            </Box>
                            <Chip label={item.count} size="small" sx={{ flexShrink: 0, backgroundColor: 'transparent', color: 'text.primary', fontWeight: 'bold', fontSize: '12px', border: `1px solid ${theme.palette.divider}` }} />
                        </MenuItem>
                    );
                })}
                {tags.map(tag => {
                    const { colorBox, count } = renderRowContent(tag, theme, getBubbleCountByTag, t, true);
                    return (
                        <MenuItem key={tag.id} value={tag.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, padding: '12px 16px' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
                                {colorBox}
                                <Typography variant="body2" title={tag.name} sx={{ color: 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {tag.name}
                                </Typography>
                            </Box>
                            <Chip label={count} size="small" sx={{ flexShrink: 0, backgroundColor: 'transparent', color: 'text.primary', fontWeight: 'bold', fontSize: '12px', border: `1px solid ${theme.palette.divider}` }} />
                        </MenuItem>
                    );
                })}
            </>
        );
    }

    // Dialog variant
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
                                    border: `1px solid ${theme.palette.divider}`,
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
                                    backgroundColor: draggedIndex === index ? theme.palette.action.hover : 'transparent'
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 0 }}>
                                    {!deleting && (
                                        <Box sx={{
                                            width: 24,
                                            height: 24,
                                            borderRadius: '50%',
                                            backgroundColor: tag.color,
                                            border: `2px solid ${theme.palette.divider}`
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
                                                {renderRowContent(tag, theme, getBubbleCountByTag, t).count} {renderRowContent(tag, theme, getBubbleCountByTag, t).count === 1 ? t('bubbles.bubble') : t('bubbles.bubbles')}
                                            </Typography>
                                        )}
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 1, flexShrink: 0, alignItems: 'center' }}>
                                        {renderRowExtra && renderRowExtra(tag)}
                                        {!deleting && onDragStart && (
                                            <DragIndicator className="drag-handle" sx={{ color: 'text.secondary', ml: 0.5, cursor: 'grab' }} />
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
