import * as React from 'react';
import { styled, alpha } from '@mui/material/styles';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';

import Checkbox from '@mui/material/Checkbox';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import { useTranslation } from 'react-i18next';
import { Check, Clear, FilterList } from '@mui/icons-material';

const StyledMenu = styled((props) => (
    <Menu
        elevation={0}
        anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
        }}
        transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
        }}
        {...props}
    />
))(({ theme }) => ({
    '& .MuiPaper-root': {
        borderRadius: 6,
        marginTop: theme.spacing(1),
        minWidth: 280,
        color: 'rgb(55, 65, 81)',
        boxShadow:
            'rgb(255, 255, 255) 0px 0px 0px 0px, rgba(0, 0, 0, 0.05) 0px 0px 0px 1px, rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.05) 0px 4px 6px -2px',
        '& .MuiMenu-list': {
            padding: '4px 0',
        },
        '& .MuiMenuItem-root': {
            '& .MuiSvgIcon-root': {
                fontSize: 18,
                color: theme.palette.text.secondary,
                marginRight: theme.spacing(1.5),
            },
            '&:active': {
                backgroundColor: alpha(
                    theme.palette.primary.main,
                    theme.palette.action.selectedOpacity,
                ),
            },
        },
        ...theme.applyStyles('dark', {
            color: theme.palette.grey[300],
        }),
    },
}));

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
    const open = Boolean(anchorEl);

    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };



    return (
        <div>
            <Button
                id="demo-customized-button"
                aria-controls={open ? 'demo-customized-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={open ? 'true' : undefined}
                variant="outlined"
                disableElevation
                onClick={handleClick}
                startIcon={<FilterList />}
                sx={{
                    minWidth: 'auto',
                    width: 'auto',
                    padding: '8px 12px',
                    borderRadius: 1,
                    textTransform: 'none',
                    fontSize: '0.875rem',
                    '& .MuiButton-startIcon': {
                        marginRight: 1
                    }
                }}
            >
                {t('bubbles.filterButton')}
            </Button>
            <StyledMenu
                id="demo-customized-menu"
                slotProps={{
                    list: {
                        'aria-labelledby': 'demo-customized-button',
                    },
                }}
                anchorEl={anchorEl}
                open={open}
                onClose={(event, reason) => {
                    // Закрываем только при клике вне меню или нажатии Escape
                    if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
                        handleClose();
                    }
                    // Игнорируем все остальные причины закрытия
                }}
                disableAutoFocusItem
                keepMounted
            >
                <Box onClick={(e) => e.stopPropagation()}>
                    {/* Заголовок с кнопками управления */}
                    <Box sx={{
                        padding: '8px 16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '1px solid #E0E0E0'
                    }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                            {t('bubbles.categories')}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Button
                                size="small"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    onSelectAll();
                                }}
                                startIcon={<Check />}
                                sx={{
                                    minWidth: 'auto',
                                    padding: '4px 8px',
                                    fontSize: '0.75rem'
                                }}
                            >
                                {t('bubbles.selectAll')}
                            </Button>
                            <Button
                                size="small"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    onClearAll();
                                }}
                                startIcon={<Clear />}
                                sx={{
                                    minWidth: 'auto',
                                    padding: '4px 8px',
                                    fontSize: '0.75rem'
                                }}
                            >
                                {t('bubbles.clearAll')}
                            </Button>
                        </Box>
                    </Box>

                    {/* Опция "Без тега" */}
                    <Box
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            onNoTagFilterChange();
                        }}
                        sx={{
                            padding: '12px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            cursor: 'pointer',
                            '&:hover': {
                                backgroundColor: '#F5F5F5'
                            }
                        }}
                    >
                        <Checkbox
                            checked={showNoTag}
                            size="small"
                            onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                            }}
                            onChange={(e) => {
                                e.stopPropagation();
                                onNoTagFilterChange();
                            }}
                            sx={{ marginRight: 1 }}
                        />
                        <Box
                            sx={{
                                width: 16,
                                height: 16,
                                borderRadius: '50%',
                                backgroundColor: '#B0B0B0',
                                border: '1px solid #ccc',
                                marginRight: 1
                            }}
                        />
                        <Typography variant="body2" sx={{ flex: 1 }}>
                            {t('bubbles.noTag')}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {getBubbleCountByTag ? getBubbleCountByTag(null) : 0}
                        </Typography>
                    </Box>

                    {/* Разделитель */}
                    {tags.length > 0 && <Divider sx={{ my: 0.5 }} />}

                    {/* Список тегов */}
                    {tags.map((tag) => (
                        <Box
                            key={tag.id}
                            onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                onTagFilterChange(tag.id);
                            }}
                            sx={{
                                padding: '12px 16px',
                                display: 'flex',
                                alignItems: 'center',
                                cursor: 'pointer',
                                '&:hover': {
                                    backgroundColor: '#F5F5F5'
                                }
                            }}
                        >
                            <Checkbox
                                checked={filterTags.includes(tag.id)}
                                size="small"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                }}
                                onChange={(e) => {
                                    e.stopPropagation();
                                    onTagFilterChange(tag.id);
                                }}
                                sx={{ marginRight: 1 }}
                            />
                            <Box
                                sx={{
                                    width: 16,
                                    height: 16,
                                    borderRadius: '50%',
                                    backgroundColor: tag.color,
                                    border: '1px solid #ccc',
                                    marginRight: 1
                                }}
                            />
                            <Typography variant="body2" sx={{ flex: 1 }}>
                                {tag.name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                {getBubbleCountByTag ? getBubbleCountByTag(tag.id) : 0}
                            </Typography>
                        </Box>
                    ))}

                    {/* Сообщение если нет тегов */}
                    {tags.length === 0 && (
                        <MenuItem disabled sx={{ padding: '12px 16px' }}>
                            <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', width: '100%' }}>
                                {t('bubbles.noTagsAvailable')}
                            </Typography>
                        </MenuItem>
                    )}
                </Box>
            </StyledMenu>
        </div>
    );
}
