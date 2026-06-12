import React from 'react';
import {
    Box,
    Select,
    MenuItem,
    FormControl,
    Typography,
    Chip,
    ListSubheader,
} from '@mui/material';
import { LabelOutlined, AllInclusive, LocalOffer } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { BUBBLE_STATUS } from '../services/firestoreService';

const ellipsisLabelSx = {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    minWidth: 0,
};

const labelRowSx = {
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    flex: 1,
    minWidth: 0,
};

const menuRowSx = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 1,
    padding: '12px 16px',
};

const MobileCategorySelector = ({
    tags,
    selectedCategory,
    onCategorySelect,
    themeMode,
    bubbleCounts = {},
    bubbles = [],
    plannedTasksCount = 0,
}) => {
    const { t } = useTranslation();

    const getBubbleCount = (categoryId) => {
        if (categoryId === 'all') {
            return Object.values(bubbleCounts).reduce((sum, count) => sum + count, 0);
        }
        if (categoryId === 'no-tags') {
            return bubbles.filter((b) => b.status === BUBBLE_STATUS.ACTIVE && !b.tagId).length;
        }
        if (categoryId === 'planned-tasks') {
            return plannedTasksCount;
        }
        return bubbleCounts[categoryId] || 0;
    };

    const handleChange = (event) => {
        const value = event.target.value;
        onCategorySelect(value);
    };

    const renderCategoryOption = (category) => {
        const count = getBubbleCount(category.id);
        return (
            <MenuItem
                key={category.id}
                value={category.id}
                sx={menuRowSx}
            >
                <Box sx={labelRowSx}>
                    <LabelOutlined sx={{ color: category.color, fontSize: 20, flexShrink: 0 }} />
                    <Typography
                        variant="body2"
                        title={category.name}
                        sx={{
                            color: themeMode === 'light' ? '#2C3E50' : '#ffffff',
                            ...ellipsisLabelSx,
                        }}
                    >
                        {category.name}
                    </Typography>
                </Box>
                <Chip
                    label={count}
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
        );
    };

    const renderAllCategoriesOption = () => {
        const count = getBubbleCount('all');
        return (
            <MenuItem
                key="all-categories"
                value="all"
                sx={menuRowSx}
            >
                <Box sx={labelRowSx}>
                    <AllInclusive sx={{ color: themeMode === 'light' ? '#BDC3C7' : '#aaaaaa', fontSize: 20, flexShrink: 0 }} />
                    <Typography variant="body2" sx={{ color: themeMode === 'light' ? '#2C3E50' : '#ffffff', ...ellipsisLabelSx }}>
                        {t('categories.allCategories')}
                    </Typography>
                </Box>
                <Chip
                    label={count}
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
        );
    };

    const renderPresetRow = (value, label, icon) => {
        const count = getBubbleCount(value);
        return (
            <MenuItem
                key={value}
                value={value}
                sx={menuRowSx}
            >
                <Box sx={labelRowSx}>
                    <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>{icon}</Box>
                    <Typography
                        variant="body2"
                        title={typeof label === 'string' ? label : undefined}
                        sx={{ color: themeMode === 'light' ? '#2C3E50' : '#ffffff', ...ellipsisLabelSx }}
                    >
                        {label}
                    </Typography>
                </Box>
                <Chip
                    label={count}
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
        );
    };

    const getSelectedCategoryName = () => {
        if (!selectedCategory) return '';
        if (selectedCategory === 'all') {
            return t('categories.allCategories');
        }
        if (selectedCategory === 'no-tags') {
            return t('bubbles.noTags');
        }
        if (selectedCategory === 'planned-tasks') {
            return t('bubbles.postponedTasks');
        }
        const category = tags.find(tag => tag.id === selectedCategory);
        return category ? category.name : '';
    };

    const getSelectedCategoryIcon = () => {
        if (!selectedCategory) return null;
        if (selectedCategory === 'all') {
            return <AllInclusive sx={{ color: themeMode === 'light' ? '#BDC3C7' : '#aaaaaa' }} />;
        }
        if (selectedCategory === 'no-tags') {
            return <LabelOutlined sx={{ color: themeMode === 'light' ? '#BDC3C7' : '#aaaaaa' }} />;
        }
        if (selectedCategory === 'planned-tasks') {
            return <LocalOffer sx={{ color: '#FF9800' }} />;
        }
        const category = tags.find(tag => tag.id === selectedCategory);
        return category ? (
            <LabelOutlined sx={{ color: category.color }} />
        ) : null;
    };

    return (
        <FormControl fullWidth size="small">
            <Select
                value={selectedCategory ?? ''}
                onChange={handleChange}
                displayEmpty
                renderValue={(value) => {
                    if (value === '') return null;
                    const fullName = getSelectedCategoryName();
                    return (
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                minWidth: 0,
                                width: '100%',
                                maxWidth: '100%',
                                overflow: 'hidden',
                                pr: 0.5,
                            }}
                        >
                            <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                                {getSelectedCategoryIcon()}
                            </Box>
                            <Typography
                                variant="body2"
                                title={fullName}
                                sx={{
                                    color: themeMode === 'light' ? '#2C3E50' : '#ffffff',
                                    fontSize: '14px',
                                    flex: 1,
                                    ...ellipsisLabelSx,
                                }}
                            >
                                {fullName}
                            </Typography>
                        </Box>
                    );
                }}
                sx={{
                    backgroundColor: themeMode === 'light' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(52, 73, 94, 0.95)',
                    backdropFilter: 'blur(15px)',
                    border: `1px solid ${themeMode === 'light' ? 'rgba(224, 224, 224, 0.9)' : 'rgba(102, 102, 102, 0.9)'}`,
                    borderRadius: 3,
                    height: 40,
                    boxShadow: themeMode === 'light'
                        ? '0 4px 12px rgba(0, 0, 0, 0.1)'
                        : '0 4px 12px rgba(0, 0, 0, 0.3)',
                    '& .MuiSelect-select': {
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        padding: '10px 16px',
                        fontSize: '14px',
                        overflow: 'hidden',
                    },
                    '& .MuiOutlinedInput-notchedOutline': {
                        border: 'none'
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                        border: 'none'
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        border: 'none'
                    },
                    '&:hover': {
                        backgroundColor: themeMode === 'light' ? 'rgba(255, 255, 255, 1)' : 'rgba(52, 73, 94, 1)',
                        boxShadow: themeMode === 'light'
                            ? '0 6px 16px rgba(0, 0, 0, 0.15)'
                            : '0 6px 16px rgba(0, 0, 0, 0.4)'
                    }
                }}
            >
                {renderAllCategoriesOption()}
                {renderPresetRow(
                    'no-tags',
                    t('bubbles.noTags'),
                    <LabelOutlined sx={{ color: themeMode === 'light' ? '#BDC3C7' : '#aaaaaa', fontSize: 20 }} />
                )}
                {renderPresetRow(
                    'planned-tasks',
                    t('bubbles.postponedTasks'),
                    <LocalOffer sx={{ color: '#FF9800', fontSize: 20 }} />
                )}
                {tags.length > 0 && (
                    <ListSubheader
                        sx={{
                            lineHeight: '32px',
                            backgroundColor: themeMode === 'light' ? 'rgba(255, 255, 255, 0.98)' : 'rgba(52, 73, 94, 0.98)',
                            color: themeMode === 'light' ? '#757575' : '#aaaaaa',
                            fontSize: '0.7rem',
                            letterSpacing: 1
                        }}
                    >
                        {t('bubbles.tags', { defaultValue: 'Tags' })}
                    </ListSubheader>
                )}
                {tags.map(renderCategoryOption)}
            </Select>
        </FormControl>
    );
};

export default MobileCategorySelector; 