import React from 'react';
import { Drawer, Box, Typography, IconButton } from '@mui/material';
import { CloseOutlined } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import TaskList from './TaskList';

const TaskListDrawer = ({
    open,
    onClose,
    isMobile,
    themeMode,
    // ListView props
    bubbles,
    setBubbles,
    tags,
    listFilter,
    setListFilter,
    listSortBy,
    setListSortBy,
    listSortOrder,
    setListSortOrder,
    listFilterTags,
    setListFilterTags,
    listShowNoTag,
    setListShowNoTag,
    listSearchQuery,
    setListSearchQuery,
    setSelectedBubble,
    setTitle,
    setDescription,
    setSelectedTagId,
    setEditDialog,
    handleListTagFilterChange,
    handleListNoTagFilterChange,
    clearAllListFilters,
    selectAllListFilters,
    getBubbleCountByTagForListView,
    isAllListFiltersSelected,
    onOpenFilterMenu
}) => {
    const { t } = useTranslation();

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            PaperProps={{
                sx: {
                    width: isMobile ? '100%' : '60%',
                    maxWidth: isMobile ? '100%' : '800px',
                    backgroundColor: themeMode === 'light' ? '#FFFFFF' : '#1e1e1e'
                }
            }}
        >
            <Box sx={{
                backgroundColor: 'primary.main',
                color: 'white',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 24px',
                borderBottom: themeMode === 'light' ? '1px solid #E0E0E0' : '1px solid #333333'
            }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {t('bubbles.listView')}
                </Typography>
                <IconButton onClick={onClose} sx={{ color: 'white' }}>
                    <CloseOutlined />
                </IconButton>
            </Box>
            <Box sx={{ height: 'calc(100vh - 73px)', overflow: 'auto' }}>
                <TaskList
                    bubbles={bubbles}
                    setBubbles={setBubbles}
                    tags={tags}
                    listFilter={listFilter}
                    setListFilter={setListFilter}
                    listSortBy={listSortBy}
                    setListSortBy={setListSortBy}
                    listSortOrder={listSortOrder}
                    setListSortOrder={setListSortOrder}
                    listFilterTags={listFilterTags}
                    setListFilterTags={setListFilterTags}
                    listShowNoTag={listShowNoTag}
                    setListShowNoTag={setListShowNoTag}
                    listSearchQuery={listSearchQuery}
                    setListSearchQuery={setListSearchQuery}
                    setSelectedBubble={setSelectedBubble}
                    setTitle={setTitle}
                    setDescription={setDescription}
                    setSelectedTagId={setSelectedTagId}
                    setEditDialog={setEditDialog}
                    handleListTagFilterChange={handleListTagFilterChange}
                    handleListNoTagFilterChange={handleListNoTagFilterChange}
                    clearAllListFilters={clearAllListFilters}
                    selectAllListFilters={selectAllListFilters}
                    getBubbleCountByTagForListView={getBubbleCountByTagForListView}
                    themeMode={themeMode}
                    isAllListFiltersSelected={isAllListFiltersSelected}
                    onOpenFilterMenu={onOpenFilterMenu}
                />
            </Box>
        </Drawer>
    );
};

export default TaskListDrawer;


