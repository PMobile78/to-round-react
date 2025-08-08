import React from 'react';
import { Drawer, Box, IconButton, Typography } from '@mui/material';
import { Check, CloseOutlined } from '@mui/icons-material';

const TaskFilterDrawer = ({
    open,
    onClose,
    isMobile,
    themeMode = 'light',
    tags = [],
    filterTags = [],
    showNoTag = true,
    onToggleNoTag,
    onToggleTag,
    onSelectAll,
    onClearAll,
    isAllSelected,
    getBubbleCountByTagForBubblesView
}) => {
    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            PaperProps={{
                sx: {
                    width: isMobile ? '85%' : 350,
                    maxWidth: '90%',
                    backgroundColor: '#2C3E50',
                    color: 'white'
                }
            }}
        >
            <Box sx={{ padding: 0 }}>
                {/* Header */}
                <Box sx={{ padding: 2, paddingBottom: 1 }}>
                    <IconButton onClick={onClose} sx={{ color: 'white', padding: 0, marginBottom: 1 }}>
                        <CloseOutlined />
                    </IconButton>

                    {/* Title with select all/clear all */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ color: '#BDC3C7', lineHeight: 1.3 }}>
                            Выберите категории для фильтрации
                        </Typography>
                        <IconButton
                            onClick={isAllSelected ? onClearAll : onSelectAll}
                            sx={{
                                color: 'white',
                                backgroundColor: isAllSelected ? 'rgba(255,255,255,0.1)' : 'transparent',
                                '&:hover': { backgroundColor: 'rgba(255,255,255,0.2)' },
                                padding: '4px'
                            }}
                        >
                            <Check />
                        </IconButton>
                    </Box>
                </Box>

                {/* Categories list */}
                <Box sx={{ paddingX: 0 }}>
                    {/* No tag */}
                    <Box
                        onClick={onToggleNoTag}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '16px 20px',
                            borderBottom: '1px solid rgba(255,255,255,0.1)',
                            cursor: 'pointer',
                            '&:hover': { backgroundColor: 'rgba(255,255,255,0.05)' }
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 0 }}>
                            <Box
                                sx={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: '50%',
                                    backgroundColor: '#B0B0B0',
                                    border: '2px solid #B0B0B0'
                                }}
                            />
                            <Typography
                                sx={{ color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0 }}
                            >
                                Без тега{' '}
                                <Box component="span" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                                    {getBubbleCountByTagForBubblesView ? getBubbleCountByTagForBubblesView(null) : 0}
                                </Box>
                            </Typography>
                        </Box>
                        {showNoTag && <Check sx={{ color: 'white', fontSize: '20px' }} />}
                    </Box>

                    {/* Tags */}
                    {tags.map((tag) => (
                        <Box
                            key={tag.id}
                            onClick={() => onToggleTag(tag.id)}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '16px 20px',
                                borderBottom: '1px solid rgba(255,255,255,0.1)',
                                cursor: 'pointer',
                                '&:hover': { backgroundColor: 'rgba(255,255,255,0.05)' }
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 0 }}>
                                <Box
                                    sx={{
                                        width: 24,
                                        height: 24,
                                        borderRadius: '50%',
                                        backgroundColor: tag.color,
                                        border: `2px solid ${tag.color}`
                                    }}
                                />
                                <Typography
                                    sx={{ color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0 }}
                                >
                                    {tag.name}{' '}
                                    <Box component="span" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                                        {getBubbleCountByTagForBubblesView ? getBubbleCountByTagForBubblesView(tag.id) : 0}
                                    </Box>
                                </Typography>
                            </Box>
                            {filterTags.includes(tag.id) && <Check sx={{ color: 'white', fontSize: '20px' }} />}
                        </Box>
                    ))}
                </Box>
            </Box>
        </Drawer>
    );
};

export default TaskFilterDrawer;


