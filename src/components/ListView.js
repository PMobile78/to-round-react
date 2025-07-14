import React from 'react';
import {
    Box,
    Typography,
    TextField,
    Button,
    IconButton,
    useMediaQuery,
    useTheme,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Chip,
    List,
    ListItem,
    Tooltip,
} from '@mui/material';
import {
    CheckCircle,
    DeleteOutlined,
    Edit,
    LocalOffer,
    Restore,
    ArrowUpward,
    ArrowDownward,
    Search,
    Clear,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { FilterMenu } from './FilterMenu';
import {
    BUBBLE_STATUS,
    markBubbleAsDone,
    markBubbleAsDeleted,
    restoreBubble,
    getBubblesByStatus,
    saveBubblesToFirestore
} from '../services/firestoreService';

// Auto-cleanup period for deleted tasks (30 days)
const DELETED_TASKS_CLEANUP_DAYS = 30;

const ListView = ({
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
}) => {
    const { t } = useTranslation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const getStatusIcon = (status) => {
        switch (status) {
            case BUBBLE_STATUS.DONE:
                return <CheckCircle sx={{ color: '#4CAF50' }} />;
            case BUBBLE_STATUS.DELETED:
                return <DeleteOutlined sx={{ color: '#F44336' }} />;
            case BUBBLE_STATUS.POSTPONE:
                return <LocalOffer sx={{ color: '#FF9800' }} />;
            default:
                return <CheckCircle sx={{ color: '#2196F3' }} />;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case BUBBLE_STATUS.DONE:
                return '#E8F5E8';
            case BUBBLE_STATUS.DELETED:
                return '#FFEBEE';
            case BUBBLE_STATUS.POSTPONE:
                return '#FFF3E0';
            default:
                return '#E3F2FD';
        }
    };

    // Filter tasks by search query
    const filterTasksBySearch = (tasks) => {
        if (!listSearchQuery.trim()) {
            return tasks;
        }

        const query = listSearchQuery.toLowerCase().trim();
        return tasks.filter(task => {
            // Search in title
            const titleMatch = (task.title || '').toLowerCase().includes(query);

            // Search in description
            const descriptionMatch = (task.description || '').toLowerCase().includes(query);

            // Search in tag name
            const tag = task.tagId ? tags.find(t => t.id === task.tagId) : null;
            const tagMatch = tag ? tag.name.toLowerCase().includes(query) : false;

            return titleMatch || descriptionMatch || tagMatch;
        });
    };

    const sortTasks = (tasks) => {
        const sortedTasks = [...tasks];

        sortedTasks.sort((a, b) => {
            let aValue, bValue;

            switch (listSortBy) {
                case 'title':
                    aValue = (a.title || '').toLowerCase();
                    bValue = (b.title || '').toLowerCase();
                    break;
                case 'tag':
                    const aTag = a.tagId ? tags.find(t => t.id === a.tagId) : null;
                    const bTag = b.tagId ? tags.find(t => t.id === b.tagId) : null;
                    aValue = aTag ? aTag.name.toLowerCase() : '';
                    bValue = bTag ? bTag.name.toLowerCase() : '';
                    break;
                case 'updatedAt':
                    aValue = new Date(a.updatedAt || a.createdAt);
                    bValue = new Date(b.updatedAt || b.createdAt);
                    break;
                case 'createdAt':
                default:
                    aValue = new Date(a.createdAt);
                    bValue = new Date(b.createdAt);
                    break;
            }

            if (listSortOrder === 'asc') {
                if (aValue < bValue) return -1;
                if (aValue > bValue) return 1;
                return 0;
            } else {
                if (aValue > bValue) return -1;
                if (aValue < bValue) return 1;
                return 0;
            }
        });

        return sortedTasks;
    };

    const getFilteredBubblesForList = () => {
        // Filter by selected status
        const filteredByStatus = getBubblesByStatus(bubbles, listFilter);

        // Apply tag filters using separate list filter states
        // Check if all tags are selected and showNoTag is true - show all bubbles
        const allTagsSelected = tags.length > 0 && listFilterTags.length === tags.length && listShowNoTag;

        if (allTagsSelected) {
            return filteredByStatus;
        }

        return filteredByStatus.filter(bubble => {
            // Если выбраны теги и пузырь имеет один из выбранных тегов
            if (listFilterTags.length > 0 && bubble.tagId && listFilterTags.includes(bubble.tagId)) {
                return true;
            }
            // Если включен фильтр "No Tag" и у пузыря нет тега
            if (listShowNoTag && !bubble.tagId) {
                return true;
            }
            return false;
        });
    };

    const getTasksByStatus = (status) => {
        const filteredBubbles = getFilteredBubblesForList();
        const sortedTasks = sortTasks(filteredBubbles);
        return filterTasksBySearch(sortedTasks);
    };

    const getTasksCountByStatus = (status) => {
        // Apply tag filters to all bubbles using list filter states
        const allTagsSelected = tags.length > 0 && listFilterTags.length === tags.length && listShowNoTag;

        let filteredBubbles = bubbles;

        if (!allTagsSelected) {
            filteredBubbles = bubbles.filter(bubble => {
                // Если выбраны теги и пузырь имеет один из выбранных тегов
                if (listFilterTags.length > 0 && bubble.tagId && listFilterTags.includes(bubble.tagId)) {
                    return true;
                }
                // Если включен фильтр "No Tag" и у пузыря нет тега
                if (listShowNoTag && !bubble.tagId) {
                    return true;
                }
                return false;
            });
        }

        // Filter by status
        let statusFilteredBubbles;
        if (status === 'active') {
            statusFilteredBubbles = filteredBubbles.filter(bubble => bubble.status === BUBBLE_STATUS.ACTIVE);
        } else if (status === 'done') {
            statusFilteredBubbles = filteredBubbles.filter(bubble => bubble.status === BUBBLE_STATUS.DONE);
        } else if (status === 'postpone') {
            statusFilteredBubbles = filteredBubbles.filter(bubble => bubble.status === BUBBLE_STATUS.POSTPONE);
        } else if (status === 'deleted') {
            statusFilteredBubbles = filteredBubbles.filter(bubble => bubble.status === BUBBLE_STATUS.DELETED);
        } else {
            statusFilteredBubbles = filteredBubbles;
        }

        // Apply search filter
        const searchFilteredBubbles = filterTasksBySearch(statusFilteredBubbles);
        return searchFilteredBubbles.length;
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const handleRestoreBubble = async (bubbleId) => {
        try {
            const updatedBubbles = await restoreBubble(bubbleId, bubbles);
            setBubbles(updatedBubbles);
        } catch (error) {
            console.error('Error restoring bubble:', error);
        }
    };

    // Mark task as done from list view
    const handleMarkTaskAsDone = async (taskId) => {
        try {
            const updatedBubbles = await markBubbleAsDone(taskId, bubbles);
            setBubbles(updatedBubbles);
        } catch (error) {
            console.error('Error marking task as done:', error);
        }
    };

    // Delete task from list view
    const handleDeleteTask = async (taskId) => {
        try {
            const updatedBubbles = await markBubbleAsDeleted(taskId, bubbles);
            setBubbles(updatedBubbles);
        } catch (error) {
            console.error('Error deleting task:', error);
        }
    };

    // Permanently delete task from list view
    const handlePermanentDeleteTask = async (taskId) => {
        try {
            const updatedBubbles = bubbles.filter(bubble => bubble.id !== taskId);
            setBubbles(updatedBubbles);
            saveBubblesToFirestore(updatedBubbles);
        } catch (error) {
            console.error('Error permanently deleting task:', error);
        }
    };

    // Edit task from list view
    const handleEditTask = (task) => {
        setSelectedBubble(task);
        setTitle(task.title || '');
        setDescription(task.description || '');
        setSelectedTagId(task.tagId || '');
        setEditDialog(true);
    };

    const tasks = getTasksByStatus(listFilter);
    const isEmpty = tasks.length === 0;

    return (
        <Box sx={{ padding: 2, height: '100%', overflow: 'auto' }}>
            {/* Filter and Sort controls */}
            <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: isMobile ? 'flex-start' : 'center',
                marginBottom: 2,
                gap: 2,
                flexWrap: 'wrap',
                flexDirection: isMobile ? 'column' : 'row'
            }}>
                {/* Categories filter */}
                <FilterMenu
                    tags={tags}
                    filterTags={listFilterTags}
                    showNoTag={listShowNoTag}
                    onTagFilterChange={handleListTagFilterChange}
                    onNoTagFilterChange={handleListNoTagFilterChange}
                    onSelectAll={selectAllListFilters}
                    onClearAll={clearAllListFilters}
                    getBubbleCountByTag={getBubbleCountByTagForListView}
                />

                {/* Sort controls */}
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    width: isMobile ? '100%' : 'auto'
                }}>
                    <FormControl size="small" sx={{
                        minWidth: isMobile ? 'auto' : 140,
                        flex: isMobile ? 1 : 'none'
                    }}>
                        <InputLabel>{t('bubbles.sortBy')}</InputLabel>
                        <Select
                            value={listSortBy}
                            label={t('bubbles.sortBy')}
                            onChange={(e) => {
                                const newSortBy = e.target.value;
                                setListSortBy(newSortBy);
                                localStorage.setItem('bubbles-list-sort-by', newSortBy);
                            }}
                        >
                            <MenuItem value="createdAt">{t('bubbles.createdAt')}</MenuItem>
                            <MenuItem value="updatedAt">{t('bubbles.updatedAt')}</MenuItem>
                            <MenuItem value="title">{t('bubbles.title')}</MenuItem>
                            <MenuItem value="tag">{t('bubbles.category')}</MenuItem>
                        </Select>
                    </FormControl>
                    <Tooltip title={listSortOrder === 'asc' ? t('bubbles.sortAscending') : t('bubbles.sortDescending')}>
                        <IconButton
                            onClick={() => {
                                const newSortOrder = listSortOrder === 'asc' ? 'desc' : 'asc';
                                setListSortOrder(newSortOrder);
                                localStorage.setItem('bubbles-list-sort-order', newSortOrder);
                            }}
                            sx={{
                                color: 'primary.main',
                                border: '1px solid',
                                borderColor: 'rgba(25, 118, 210, 0.5)',
                                '&:hover': {
                                    backgroundColor: 'rgba(25, 118, 210, 0.05)'
                                }
                            }}
                        >
                            {listSortOrder === 'asc' ? <ArrowUpward /> : <ArrowDownward />}
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            {/* Search field */}
            <Box sx={{ marginBottom: 2 }}>
                <TextField
                    fullWidth
                    size="small"
                    variant="outlined"
                    placeholder={t('bubbles.searchPlaceholder')}
                    value={listSearchQuery}
                    onChange={(e) => setListSearchQuery(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <Search sx={{ color: 'text.secondary', marginRight: 1 }} />
                        ),
                        endAdornment: listSearchQuery && (
                            <IconButton
                                size="small"
                                onClick={() => setListSearchQuery('')}
                                sx={{ padding: 0.5 }}
                            >
                                <Clear fontSize="small" />
                            </IconButton>
                        )
                    }}
                    sx={{
                        '& .MuiInputBase-input': {
                            fontSize: isMobile ? 16 : 14 // Предотвращает zoom на iOS
                        },
                        '& .MuiOutlinedInput-root': {
                            borderRadius: 2
                        }
                    }}
                />
            </Box>

            {/* Filter tabs */}
            <Box sx={{
                display: 'flex',
                justifyContent: 'center',
                marginBottom: 3,
                flexWrap: 'wrap',
                gap: 1
            }}>
                {[
                    { key: 'active', label: t('bubbles.activeTasks'), count: getTasksCountByStatus('active') },
                    { key: 'done', label: t('bubbles.doneTasks'), count: getTasksCountByStatus('done') },
                    { key: 'deleted', label: t('bubbles.deletedTasks'), count: getTasksCountByStatus('deleted') },
                    { key: 'postpone', label: t('bubbles.postponedTasks'), count: getTasksCountByStatus('postpone') },
                ].map(tab => (
                    <Button
                        key={tab.key}
                        variant={listFilter === tab.key ? 'contained' : 'outlined'}
                        onClick={() => setListFilter(tab.key)}
                        sx={{
                            borderRadius: 20,
                            paddingX: 2,
                            paddingY: 1,
                            textTransform: 'none',
                            minWidth: 'auto',
                            fontSize: isMobile ? '0.8rem' : '0.9rem'
                        }}
                    >
                        {tab.label} ({tab.count})
                    </Button>
                ))}
            </Box>

            {/* Warning for deleted tasks */}
            {listFilter === 'deleted' && (
                <Box sx={{
                    marginBottom: 2,
                    padding: 2,
                    backgroundColor: '#FFF3E0',
                    border: '1px solid #FFB74D',
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                }}>
                    <LocalOffer sx={{ color: '#FF9800', fontSize: 20 }} />
                    <Typography variant="body2" sx={{ color: '#E65100' }}>
                        {t('bubbles.deletedTasksWarning', { days: DELETED_TASKS_CLEANUP_DAYS })}
                    </Typography>
                </Box>
            )}

            {/* Tasks list */}
            {isEmpty ? (
                <Box sx={{
                    textAlign: 'center',
                    padding: 4,
                    color: 'text.secondary'
                }}>
                    <Typography variant="h6" gutterBottom>
                        {listFilter === 'active' && t('bubbles.noActiveTasks')}
                        {listFilter === 'done' && t('bubbles.noDoneTasks')}
                        {listFilter === 'postpone' && t('bubbles.noPostponedTasks')}
                        {listFilter === 'deleted' && t('bubbles.noDeletedTasks')}
                    </Typography>
                </Box>
            ) : (
                <List sx={{ padding: 0 }}>
                    {tasks.map((task, index) => {
                        const tag = task.tagId ? tags.find(t => t.id === task.tagId) : null;

                        return (
                            <ListItem
                                key={task.id}
                                sx={{
                                    marginBottom: 1,
                                    padding: 2,
                                    borderRadius: 2,
                                    backgroundColor: getStatusColor(task.status),
                                    border: '1px solid #E0E0E0'
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', width: '100%', gap: 2 }}>
                                    {/* Status icon */}
                                    <Box sx={{ paddingTop: 0.5 }}>
                                        {getStatusIcon(task.status)}
                                    </Box>

                                    {/* Task content */}
                                    <Box sx={{ flex: 1 }}>
                                        <Typography variant="h6" sx={{ marginBottom: 1 }}>
                                            {task.title || t('bubbles.empty')}
                                        </Typography>

                                        {task.description && (
                                            <Typography variant="body2" color="text.secondary" sx={{ marginBottom: 1 }}>
                                                {task.description}
                                            </Typography>
                                        )}

                                        {/* Tag */}
                                        {tag && (
                                            <Chip
                                                label={tag.name}
                                                size="small"
                                                sx={{
                                                    backgroundColor: tag.color,
                                                    color: 'white',
                                                    marginBottom: 1
                                                }}
                                            />
                                        )}

                                        {/* Dates */}
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                            <Typography variant="caption" color="text.secondary">
                                                {t('bubbles.createdAt')}: {formatDate(task.createdAt)}
                                            </Typography>
                                            {task.updatedAt && task.updatedAt !== task.createdAt && (
                                                <Typography variant="caption" color="text.secondary">
                                                    {t('bubbles.updatedAt')}: {formatDate(task.updatedAt)}
                                                </Typography>
                                            )}
                                            {task.deletedAt && (
                                                <Typography variant="caption" color="text.secondary">
                                                    {t('bubbles.deletedAt')}: {formatDate(task.deletedAt)}
                                                </Typography>
                                            )}
                                        </Box>
                                    </Box>

                                    {/* Actions */}
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        {task.status === BUBBLE_STATUS.ACTIVE && (
                                            <>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleEditTask(task)}
                                                    sx={{ color: 'primary.main' }}
                                                    title={t('bubbles.editBubble')}
                                                >
                                                    <Edit />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleMarkTaskAsDone(task.id)}
                                                    sx={{ color: 'success.main' }}
                                                    title={t('bubbles.markAsDone')}
                                                >
                                                    <CheckCircle />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleDeleteTask(task.id)}
                                                    sx={{ color: 'error.main' }}
                                                    title={t('bubbles.deleteBubble')}
                                                >
                                                    <DeleteOutlined />
                                                </IconButton>
                                            </>
                                        )}
                                        {task.status === BUBBLE_STATUS.DONE && (
                                            <>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleRestoreBubble(task.id)}
                                                    sx={{ color: 'primary.main' }}
                                                    title={t('bubbles.restoreBubble')}
                                                >
                                                    <Restore />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleDeleteTask(task.id)}
                                                    sx={{ color: 'error.main' }}
                                                    title={t('bubbles.deleteBubble')}
                                                >
                                                    <DeleteOutlined />
                                                </IconButton>
                                            </>
                                        )}
                                        {task.status === BUBBLE_STATUS.DELETED && (
                                            <>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleRestoreBubble(task.id)}
                                                    sx={{ color: 'primary.main' }}
                                                    title={t('bubbles.restoreBubble')}
                                                >
                                                    <Restore />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handlePermanentDeleteTask(task.id)}
                                                    sx={{ color: 'error.main' }}
                                                    title={t('bubbles.permanentDelete')}
                                                >
                                                    <DeleteOutlined />
                                                </IconButton>
                                            </>
                                        )}
                                    </Box>
                                </Box>
                            </ListItem>
                        );
                    })}
                </List>
            )}
        </Box>
    );
};

export default ListView; 