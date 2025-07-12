import * as React from 'react';
import { alpha } from '@mui/material/styles';
import Button from '@mui/material/Button';
import Popover from '@mui/material/Popover';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import Checkbox from '@mui/material/Checkbox';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { Check, Clear, FilterList } from '@mui/icons-material';

export function FilterMenu({
    tags = [],
    filterTags = [],
    showNoTag = true,
    onTagFilterChange,
    onNoTagFilterChange,
    onSelectAll,
    onClearAll,
    getBubbleCountByTag
}) {
    const { t } = useTranslation();
    const [anchorEl, setAnchorEl] = React.useState(null);

    const handleOpen = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const open = Boolean(anchorEl);
    const id = open ? 'filter-popover' : undefined;

    return (
        <div>
            <Button
                aria-describedby={id}
                variant="outlined"
                disableElevation
                onClick={handleOpen}
                startIcon={<FilterList />}
                sx={{
                    minWidth: 'auto',
                    padding: '8px 12px',
                    borderRadius: 1,
                    textTransform: 'none',
                    fontSize: '0.875rem',
                }}
            >
                {t('bubbles.filterButton')}
            </Button>

            <Popover
                id={id}
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                PaperProps={{
                    onClick: (e) => {
                        // предотвращаем закрытие при кликах внутри
                        e.stopPropagation();
                    },
                    sx: {
                        borderRadius: 1,
                        minWidth: 280,
                        boxShadow: 1,
                        '& .MuiMenuItem-root': {
                            '&:active': {
                                backgroundColor: alpha(
                                    '#1976d2',
                                    0.12
                                ),
                            },
                        },
                    }
                }}
            // оставляем стандартное поведение фокуса
            >
                {/* Header */}
                <Box sx={{ p: 1, px: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                        {t('bubbles.categories')}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Button size="small" onClick={onSelectAll} startIcon={<Check />} sx={{ minWidth: 'auto', p: '4px 8px', fontSize: '0.75rem' }}>
                            {t('bubbles.selectAll')}
                        </Button>
                        <Button size="small" onClick={onClearAll} startIcon={<Clear />} sx={{ minWidth: 'auto', p: '4px 8px', fontSize: '0.75rem' }}>
                            {t('bubbles.clearAll')}
                        </Button>
                    </Box>
                </Box>

                {/* No tag */}
                <MenuItem
                    onClick={(e) => {
                        onNoTagFilterChange();
                    }}
                    disableRipple
                    sx={{ p: '12px 16px' }}
                >
                    <Checkbox checked={showNoTag} size="small" sx={{ mr: 1 }} />
                    <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: 'grey.400', border: '1px solid', borderColor: 'divider', mr: 1 }} />
                    <Typography variant="body2" sx={{ flex: 1 }}>
                        {t('bubbles.noTag')}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {getBubbleCountByTag ? getBubbleCountByTag(null) : 0}
                    </Typography>
                </MenuItem>

                {tags.length > 0 && <Divider sx={{ my: 0.5 }} />}

                {tags.length > 0 ? (
                    tags.map(tag => (
                        <MenuItem
                            key={tag.id}
                            onClick={() => {
                                onTagFilterChange(tag.id);
                            }}
                            disableRipple
                            sx={{ p: '12px 16px' }}
                        >
                            <Checkbox checked={filterTags.includes(tag.id)} size="small" sx={{ mr: 1 }} />
                            <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: tag.color, border: '1px solid', borderColor: 'divider', mr: 1 }} />
                            <Typography variant="body2" sx={{ flex: 1 }}>
                                {tag.name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                {getBubbleCountByTag ? getBubbleCountByTag(tag.id) : 0}
                            </Typography>
                        </MenuItem>
                    ))
                ) : (
                    <MenuItem disabled sx={{ p: '12px 16px', justifyContent: 'center' }}>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            {t('bubbles.noTagsAvailable')}
                        </Typography>
                    </MenuItem>
                )}
            </Popover>
        </div>
    );
}
