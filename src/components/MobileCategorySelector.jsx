import React from 'react';
import {
    Box,
    Select,
    FormControl,
    Typography,
    ListSubheader,
    useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { LabelOutlined, AllInclusive, LocalOffer } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { BUBBLE_STATUS } from '../services/firestoreService';
import CategoryList from './CategoryList';

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
    const theme = useTheme();

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
            return <AllInclusive sx={{ color: 'text.secondary' }} />;
        }
        if (selectedCategory === 'no-tags') {
            return <LabelOutlined sx={{ color: 'text.secondary' }} />;
        }
        if (selectedCategory === 'planned-tasks') {
            return <LocalOffer sx={{ color: theme.palette.warning.main }} />;
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
                                    color: 'text.primary',
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
                    backgroundColor: alpha(theme.palette.background.paper, 0.95),
                    backdropFilter: 'blur(15px)',
                    border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
                    borderRadius: 3,
                    height: 40,
                    boxShadow: theme.shadows[4],
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
                        backgroundColor: theme.palette.background.paper,
                        boxShadow: theme.shadows[8]
                    }
                }}
            >
                <CategoryList
                    tags={tags}
                    selectedCategory={selectedCategory}
                    onCategorySelect={onCategorySelect}
                    bubbleCounts={bubbleCounts}
                    plannedTasksCount={plannedTasksCount}
                    bubbles={bubbles}
                    themeMode={themeMode}
                    variant="dropdown"
                />
            </Select>
        </FormControl>
    );
};

export default MobileCategorySelector; 