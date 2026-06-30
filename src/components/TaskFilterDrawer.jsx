import React from 'react';
import { Drawer, Box, IconButton } from '@mui/material';
import { CloseOutlined } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import TagFilterCheckboxes from './TagFilterCheckboxes';

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
                {/* Close button */}
                <Box sx={{ padding: 2, paddingBottom: 1 }}>
                    <IconButton onClick={onClose} sx={{ color: textColor, padding: 0, marginBottom: 1 }}>
                        <CloseOutlined />
                    </IconButton>
                </Box>

                {/* Categories list */}
                <Box sx={{ paddingX: 0, backgroundColor: containerBg }}>
                    <TagFilterCheckboxes
                        tags={tags}
                        selectedTagIds={filterTags}
                        onTagChange={onToggleTag}
                        showNoTag={showNoTag}
                        onNoTagChange={onToggleNoTag}
                        getCount={getBubbleCountByTagForBubblesView}
                        isAllSelected={isAllSelected}
                        onSelectAll={onSelectAll}
                        onClearAll={onClearAll}
                        themeMode={themeMode}
                    />
                </Box>
            </Box>
        </Drawer>
    );
};

export default TaskFilterDrawer;


