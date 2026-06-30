import * as React from 'react';
import { alpha } from '@mui/material/styles';
import Button from '@mui/material/Button';
import Popover from '@mui/material/Popover';
import { FilterList } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import TagFilterCheckboxes from './TagFilterCheckboxes';

export function FilterMenu({
    tags = [],
    filterTags = [],
    showNoTag = true,
    onTagFilterChange,
    onNoTagFilterChange,
    onSelectAll,
    onClearAll,
    getBubbleCountByTag,
    themeMode = 'light'
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
                        maxWidth: 350,
                        boxShadow: 1,
                        backgroundColor: themeMode === 'light' ? '#ffffff' : '#1e1e1e',
                        color: themeMode === 'light' ? '#000000' : '#ffffff',
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
                <TagFilterCheckboxes
                    tags={tags}
                    selectedTagIds={filterTags}
                    onTagChange={onTagFilterChange}
                    showNoTag={showNoTag}
                    onNoTagChange={onNoTagFilterChange}
                    getCount={getBubbleCountByTag}
                    isAllSelected={false}
                    onSelectAll={onSelectAll}
                    onClearAll={onClearAll}
                    themeMode={themeMode}
                />
            </Popover>
        </div>
    );
}
