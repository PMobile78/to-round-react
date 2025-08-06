import React from 'react';
import {
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Typography,
    Box,
    IconButton,
    Divider,
} from '@mui/material';
import {
    CloseOutlined,
    Edit,
    LabelOutlined,
    AllInclusive
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

const Categories = ({
    open,
    onClose,
    tags,
    selectedCategory,
    onCategorySelect,
    themeMode,
    bubbleCounts = {},
    onOpenTagDialog,
    bubbles = [],
    isPermanent = false
}) => {
    const { t } = useTranslation();

    // Используем теги как категории
    const allCategories = tags;

    const getCategoryIcon = (category) => {
        return <LabelOutlined sx={{ color: category.color }} />;
    };

    const getBubbleCount = (categoryId) => {
        return bubbleCounts[categoryId] || 0;
    };

    return (
        <Box
            sx={{
                position: 'fixed',
                left: 0,
                top: 0,
                height: '100vh',
                width: 280,
                backgroundColor: themeMode === 'light' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(30, 30, 30, 0.95)',
                color: themeMode === 'light' ? '#2C3E50' : '#ffffff',
                backdropFilter: 'blur(10px)',
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
                <ListItem
                    button
                    onClick={() => onCategorySelect('all')}
                    selected={selectedCategory === 'all'}
                    sx={{
                        padding: '16px 20px',
                        cursor: 'pointer',
                        borderLeft: selectedCategory === 'all' ? '4px solid #3B7DED' : '4px solid transparent',
                        backgroundColor: selectedCategory === 'all'
                            ? (themeMode === 'light' ? '#E3F2FD' : '#1A237E')
                            : 'transparent',
                        '&:hover': {
                            backgroundColor: themeMode === 'light' ? '#F8F9FA' : '#333333'
                        },
                        '&.Mui-selected': {
                            backgroundColor: themeMode === 'light' ? '#E3F2FD' : '#1A237E',
                            '&:hover': {
                                backgroundColor: themeMode === 'light' ? '#E3F2FD' : '#1A237E'
                            }
                        }
                    }}
                >
                    <ListItemIcon sx={{ minWidth: 40 }}>
                        <AllInclusive sx={{ color: themeMode === 'light' ? '#BDC3C7' : '#aaaaaa' }} />
                    </ListItemIcon>
                    <ListItemText
                        primary={t('categories.allCategories')}
                        primaryTypographyProps={{
                            color: selectedCategory === 'all'
                                ? '#3B7DED'
                                : (themeMode === 'light' ? '#2C3E50' : '#ffffff'),
                            fontWeight: selectedCategory === 'all' ? 700 : 500
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
                </ListItem>

                <Divider sx={{
                    backgroundColor: themeMode === 'light' ? '#E0E0E0' : '#333333',
                    margin: '0 20px'
                }} />

                {allCategories.map((category, index) => (
                    <React.Fragment key={category.id}>
                        <ListItem
                            button
                            onClick={() => onCategorySelect(category.id)}
                            selected={selectedCategory === category.id}
                            sx={{
                                padding: '16px 20px',
                                cursor: 'pointer',
                                borderLeft: selectedCategory === category.id ? '4px solid #3B7DED' : '4px solid transparent',
                                backgroundColor: selectedCategory === category.id
                                    ? (themeMode === 'light' ? '#E3F2FD' : '#1A237E')
                                    : 'transparent',
                                '&:hover': {
                                    backgroundColor: themeMode === 'light' ? '#F8F9FA' : '#333333'
                                },
                                '&.Mui-selected': {
                                    backgroundColor: themeMode === 'light' ? '#E3F2FD' : '#1A237E',
                                    '&:hover': {
                                        backgroundColor: themeMode === 'light' ? '#E3F2FD' : '#1A237E'
                                    }
                                }
                            }}
                        >
                            <ListItemIcon sx={{ minWidth: 40 }}>
                                {getCategoryIcon(category)}
                            </ListItemIcon>
                            <ListItemText
                                primary={category.name}
                                primaryTypographyProps={{
                                    color: selectedCategory === category.id
                                        ? '#3B7DED'
                                        : (themeMode === 'light' ? '#2C3E50' : '#ffffff'),
                                    fontWeight: selectedCategory === category.id ? 700 : 500
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
                                {getBubbleCount(category.id)}
                            </Typography>
                        </ListItem>
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
            <List sx={{ padding: 0 }}>
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
            </List>
        </Box>
    );
};

export default Categories; 