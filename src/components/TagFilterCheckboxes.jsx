import React from 'react';
import {
    Box,
    Typography,
    Button,
    Divider,
    MenuItem,
    Checkbox
} from '@mui/material';
import { Check, Clear } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

export default function TagFilterCheckboxes({
    tags = [],
    selectedTagIds = [],
    onTagChange,
    showNoTag = true,
    onNoTagChange,
    getCount,
    isAllSelected = false,
    onSelectAll,
    onClearAll,
    themeMode = 'light'
}) {
    const { t } = useTranslation();

    return (
        <>
            {/* Header */}
            <Box sx={{
                p: 1,
                px: 2,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid',
                borderColor: themeMode === 'light' ? '#e0e0e0' : '#333333',
                backgroundColor: themeMode === 'light' ? '#ffffff' : '#1e1e1e'
            }}>
                <Typography variant="subtitle2" sx={{
                    fontWeight: 'bold',
                    color: themeMode === 'light' ? '#000000' : '#ffffff'
                }}>
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

            {/* No tag */}
            <MenuItem
                onClick={onNoTagChange}
                disableRipple
                sx={{
                    p: '12px 16px',
                    backgroundColor: themeMode === 'light' ? '#ffffff' : '#1e1e1e',
                    '&:hover': {
                        backgroundColor: themeMode === 'light' ? '#f5f5f5' : '#333333'
                    }
                }}
            >
                <Checkbox checked={showNoTag} size="small" sx={{ mr: 1 }} />
                <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: 'grey.400', border: '1px solid', borderColor: 'divider', mr: 1 }} />
                <Typography variant="body2" sx={{
                    flex: 1,
                    color: themeMode === 'light' ? '#000000' : '#ffffff'
                }}>
                    {t('bubbles.noTag')}
                </Typography>
                <Typography variant="caption" sx={{
                    color: themeMode === 'light' ? '#666666' : '#aaaaaa',
                    ml: 1
                }}>
                    {getCount ? getCount(null) : 0}
                </Typography>
            </MenuItem>

            {tags.length > 0 && <Divider sx={{ my: 0.5 }} />}

            {/* Tags */}
            {tags.length > 0 ? (
                tags.map(tag => (
                    <MenuItem
                        key={tag.id}
                        onClick={() => onTagChange(tag.id)}
                        disableRipple
                        sx={{
                            p: '12px 16px',
                            backgroundColor: themeMode === 'light' ? '#ffffff' : '#1e1e1e',
                            '&:hover': {
                                backgroundColor: themeMode === 'light' ? '#f5f5f5' : '#333333'
                            }
                        }}
                    >
                        <Checkbox checked={selectedTagIds.includes(tag.id)} size="small" sx={{ mr: 1 }} />
                        <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: tag.color, border: '1px solid', borderColor: 'divider', mr: 1 }} />
                        <Typography variant="body2" sx={{
                            flex: 1,
                            minWidth: 0,
                            color: themeMode === 'light' ? '#000000' : '#ffffff',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }}>
                            {tag.name}
                        </Typography>
                        <Typography variant="caption" sx={{
                            color: themeMode === 'light' ? '#666666' : '#aaaaaa',
                            ml: 1
                        }}>
                            {getCount ? getCount(tag.id) : 0}
                        </Typography>
                    </MenuItem>
                ))
            ) : (
                <MenuItem disabled sx={{ p: '12px 16px', justifyContent: 'center' }}>
                    <Typography variant="body2" sx={{
                        color: themeMode === 'light' ? '#666666' : '#aaaaaa'
                    }}>
                        {t('bubbles.noTagsAvailable')}
                    </Typography>
                </MenuItem>
            )}
        </>
    );
}
