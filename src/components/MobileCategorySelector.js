import React, { useState } from 'react';
import {
    Box,
    Select,
    MenuItem,
    FormControl,
    Typography,
    Chip
} from '@mui/material';
import { LabelOutlined, AllInclusive } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

const MobileCategorySelector = ({
    tags,
    selectedCategory,
    onCategorySelect,
    themeMode,
    bubbleCounts = {}
}) => {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);

    const getBubbleCount = (categoryId) => {
        if (categoryId === 'all') {
            return Object.values(bubbleCounts).reduce((sum, count) => sum + count, 0);
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
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px'
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LabelOutlined sx={{ color: category.color, fontSize: 20 }} />
                    <Typography variant="body2" sx={{ color: themeMode === 'light' ? '#2C3E50' : '#ffffff' }}>
                        {category.name}
                    </Typography>
                </Box>
                <Chip
                    label={count}
                    size="small"
                    sx={{
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
                value="all"
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px'
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AllInclusive sx={{ color: themeMode === 'light' ? '#BDC3C7' : '#aaaaaa', fontSize: 20 }} />
                    <Typography variant="body2" sx={{ color: themeMode === 'light' ? '#2C3E50' : '#ffffff' }}>
                        {t('categories.allCategories')}
                    </Typography>
                </Box>
                <Chip
                    label={count}
                    size="small"
                    sx={{
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
        if (selectedCategory === 'all') {
            return t('categories.allCategories');
        }
        const category = tags.find(tag => tag.id === selectedCategory);
        return category ? category.name : t('categories.allCategories');
    };

    const getSelectedCategoryIcon = () => {
        if (selectedCategory === 'all') {
            return <AllInclusive sx={{ color: themeMode === 'light' ? '#BDC3C7' : '#aaaaaa' }} />;
        }
        const category = tags.find(tag => tag.id === selectedCategory);
        return category ? (
            <LabelOutlined sx={{ color: category.color }} />
        ) : (
            <AllInclusive sx={{ color: themeMode === 'light' ? '#BDC3C7' : '#aaaaaa' }} />
        );
    };

    return (
        <FormControl fullWidth size="small">
            <Select
                value={selectedCategory || 'all'}
                onChange={handleChange}
                displayEmpty
                renderValue={(value) => (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getSelectedCategoryIcon()}
                        <Typography variant="body2" sx={{
                            color: themeMode === 'light' ? '#2C3E50' : '#ffffff',
                            fontSize: '14px'
                        }}>
                            {getSelectedCategoryName()}
                        </Typography>
                    </Box>
                )}
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
                        fontSize: '14px'
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
                {tags.map(renderCategoryOption)}
            </Select>
        </FormControl>
    );
};

export default MobileCategorySelector; 