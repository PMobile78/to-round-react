import React from 'react';
import { Drawer, Box, IconButton, Typography, Button, Divider, MenuItem, Checkbox } from '@mui/material';
import { Check, Clear, CloseOutlined } from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';

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
    const { t } = useTranslation();
    const containerBg = themeMode === 'light' ? '#ffffff' : '#1e1e1e';
    const textColor = themeMode === 'light' ? '#000000' : '#ffffff';

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            PaperProps={{
                elevation: 0,
                sx: {
                    width: isMobile ? '85%' : 350,
                    maxWidth: '90%',
                    backgroundColor: containerBg,
                    color: textColor,
                    boxShadow: 'none'
                }
            }}
        >
            <Box sx={{ padding: 0, minHeight: '100vh', backgroundColor: containerBg }}>
                {/* Header */}
                <Box sx={{ padding: 2, paddingBottom: 1 }}>
                    <IconButton onClick={onClose} sx={{ color: textColor, padding: 0, marginBottom: 1 }}>
                        <CloseOutlined />
                    </IconButton>

                    {/* Title with select all/clear all */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid', borderColor: themeMode === 'light' ? '#e0e0e0' : '#333333', pb: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: textColor }}>
                            {t('bubbles.categories')}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Button
                                size="small"
                                onClick={onSelectAll}
                                startIcon={<Check />}
                                sx={{
                                    minWidth: 'auto',
                                    p: '4px 8px',
                                    fontSize: '0.75rem',
                                    color: themeMode === 'light' ? '#1976d2' : '#90caf9'
                                }}
                            >
                                {t('bubbles.selectAll')}
                            </Button>
                            <Button
                                size="small"
                                onClick={onClearAll}
                                startIcon={<Clear />}
                                sx={{
                                    minWidth: 'auto',
                                    p: '4px 8px',
                                    fontSize: '0.75rem',
                                    color: themeMode === 'light' ? '#1976d2' : '#90caf9'
                                }}
                            >
                                {t('bubbles.clearAll')}
                            </Button>
                        </Box>
                    </Box>
                </Box>

                {/* Categories list */}
                <Box sx={{ paddingX: 0, backgroundColor: containerBg }}>
                    {/* No tag */}
                    <MenuItem
                        onClick={onToggleNoTag}
                        disableRipple
                        sx={{
                            p: '12px 16px',
                            backgroundColor: containerBg,
                            '&:hover': {
                                backgroundColor: themeMode === 'light' ? '#f5f5f5' : '#333333'
                            }
                        }}
                    >
                        <Checkbox checked={showNoTag} size="small" sx={{ mr: 1 }} />
                        <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: 'grey.400', border: '1px solid', borderColor: 'divider', mr: 1, flexShrink: 0 }} />
                        <Typography variant="body2" sx={{ flex: 1, minWidth: 0, color: textColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {t('bubbles.noTag')}
                        </Typography>
                        <Typography variant="caption" sx={{ color: themeMode === 'light' ? '#666666' : '#aaaaaa', ml: 1 }}>
                            {getBubbleCountByTagForBubblesView ? getBubbleCountByTagForBubblesView(null) : 0}
                        </Typography>
                    </MenuItem>

                    {tags.length > 0 && <Divider sx={{ my: 0.5 }} />}

                    {/* Tags */}
                    {tags.length > 0 ? (
                        tags.map((tag) => (
                            <MenuItem
                                key={tag.id}
                                onClick={() => onToggleTag(tag.id)}
                                disableRipple
                                sx={{
                                    p: '12px 16px',
                                    backgroundColor: containerBg,
                                    '&:hover': {
                                        backgroundColor: themeMode === 'light' ? '#f5f5f5' : '#333333'
                                    }
                                }}
                            >
                                <Checkbox checked={filterTags.includes(tag.id)} size="small" sx={{ mr: 1 }} />
                                <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: tag.color, border: '1px solid', borderColor: 'divider', mr: 1, flexShrink: 0 }} />
                                <Typography variant="body2" sx={{ flex: 1, minWidth: 0, color: textColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {tag.name}
                                </Typography>
                                <Typography variant="caption" sx={{ color: themeMode === 'light' ? '#666666' : '#aaaaaa', ml: 1 }}>
                                    {getBubbleCountByTagForBubblesView ? getBubbleCountByTagForBubblesView(tag.id) : 0}
                                </Typography>
                            </MenuItem>
                        ))
                    ) : (
                        <MenuItem disabled sx={{ p: '12px 16px', justifyContent: 'center' }}>
                            <Typography variant="body2" sx={{ color: themeMode === 'light' ? '#666666' : '#aaaaaa' }}>
                                {t('bubbles.noTagsAvailable')}
                            </Typography>
                        </MenuItem>
                    )}
                </Box>
            </Box>
        </Drawer>
    );
};

export default TaskFilterDrawer;


