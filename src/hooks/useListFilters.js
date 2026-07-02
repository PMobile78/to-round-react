import { useCallback, useEffect, useRef } from 'react';
import { lsGet, lsSet } from '../utils/storage';
import { LS } from '../utils/storageKeys';
import { getBubblesByStatus } from '../services/firestoreService';
import { toggleTagInFilter } from './useBubbleFilters';
import { useBubblesData } from '../state/BubblesDataStore';
import { useBubblesUi } from '../state/BubblesUiStore';

// Re-export the shared pure toggle helper so list-view consumers/tests can import
// it from here too (symmetry with useBubbleFilters).
export { toggleTagInFilter };

// Pure helper: filter tasks for the list view by status, then by the list tag
// filters. When all tags are selected and "no tag" is shown the status-filtered
// list is returned unchanged.
export function filterBubblesForList({ bubbles, tags, listFilter, listFilterTags, listShowNoTag }) {
    // In list mode, filter by selected status
    const filteredByStatus = getBubblesByStatus(bubbles, listFilter);

    // Apply tag filters using separate list filter states
    // Check if all tags are selected and showNoTag is true - show all bubbles
    const allTagsSelected = tags.length > 0 && listFilterTags.length === tags.length && listShowNoTag;

    if (allTagsSelected) {
        return filteredByStatus;
    }

    return filteredByStatus.filter(bubble => {
        // Проверяем, существует ли тег для пузыря
        const tagExists = bubble.tagId ? tags.find(t => t.id === bubble.tagId) : null;

        // Если выбраны теги и пузырь имеет один из выбранных тегов (который существует)
        if (listFilterTags.length > 0 && bubble.tagId && tagExists && listFilterTags.includes(bubble.tagId)) {
            return true;
        }
        // Если включен фильтр "No Tag" и у пузыря нет тега или тег был удален
        if (listShowNoTag && (!bubble.tagId || !tagExists)) {
            return true;
        }
        return false;
    });
}

export function useListFilters({ tags }) {
    const { bubbles } = useBubblesData();
    const {
        register,
        listFilter,
        listSearchQuery,
        listFilterTags,
        setListFilterTags,
        listShowNoTag,
        setListShowNoTag,
        isAllListFiltersSelected,
        getBubbleCountByTagForListView,
    } = useBubblesUi();
    const storeDataRef = useRef({ bubbles, listFilter, listSearchQuery });

    // Keep ref up-to-date with store values
    useEffect(() => {
        storeDataRef.current = { bubbles, listFilter, listSearchQuery };
    }, [bubbles, listFilter, listSearchQuery]);

    // Инициализация настроек фильтра списка задач после загрузки тегов
    useEffect(() => {
        if (tags.length > 0) {
            // Тоже самое для настроек фильтра в списке задач
            const savedListFilterTags = lsGet(LS.LIST_FILTER_TAGS);
            const savedListShowNoTag = lsGet(LS.LIST_SHOW_NO_TAG);
            if (savedListFilterTags === null && savedListShowNoTag === null) {
                const allTagIds = tags.map(tag => tag.id);
                setListFilterTags(allTagIds);
                setListShowNoTag(true);
                lsSet(LS.LIST_FILTER_TAGS, allTagIds);
                lsSet(LS.LIST_SHOW_NO_TAG, true);
            }
        }
    }, [tags, setListFilterTags, setListShowNoTag]);

    // Memoized functions for list filter management
    const handleListTagFilterChange = useCallback((tagId) => {
        setListFilterTags(prev => {
            const newListFilterTags = toggleTagInFilter(prev, tagId);
            lsSet(LS.LIST_FILTER_TAGS, newListFilterTags);
            return newListFilterTags;
        });
    }, [setListFilterTags]);

    const handleListNoTagFilterChange = useCallback(() => {
        setListShowNoTag(prev => {
            const newListShowNoTag = !prev;
            lsSet(LS.LIST_SHOW_NO_TAG, newListShowNoTag);
            return newListShowNoTag;
        });
    }, [setListShowNoTag]);

    const clearAllListFilters = useCallback(() => {
        setListFilterTags([]);
        setListShowNoTag(false);
        lsSet(LS.LIST_FILTER_TAGS, []);
        lsSet(LS.LIST_SHOW_NO_TAG, false);
    }, [setListFilterTags, setListShowNoTag]);

    const selectAllListFilters = useCallback(() => {
        const allTagIds = tags.map(tag => tag.id);
        setListFilterTags(allTagIds);
        setListShowNoTag(true);
        lsSet(LS.LIST_FILTER_TAGS, allTagIds);
        lsSet(LS.LIST_SHOW_NO_TAG, true);
    }, [tags, setListFilterTags, setListShowNoTag]);

    // Function for filtering bubbles for list view (supports all statuses).
    // Deps from store (via ref) or local state.
    const getFilteredBubblesForList = useCallback(() => {
        const { bubbles, listFilter } = storeDataRef.current;
        return filterBubblesForList({
            bubbles,
            tags,
            listFilter,
            listFilterTags,
            listShowNoTag
        });
    }, [tags, listFilterTags, listShowNoTag]);

    // Register the 4 handlers into the store for other hooks to access
    // (e.g., useTags may need them for tag management).
    // CRITICAL: This effect must come AFTER all 4 handler definitions to avoid TDZ.
    useEffect(() => {
        register({
            handleListTagFilterChange,
            handleListNoTagFilterChange,
            clearAllListFilters,
            selectAllListFilters,
        });
    }, [register, handleListTagFilterChange, handleListNoTagFilterChange, clearAllListFilters, selectAllListFilters]);

    return {
        listFilterTags,
        setListFilterTags,
        listShowNoTag,
        setListShowNoTag,
        handleListTagFilterChange,
        handleListNoTagFilterChange,
        clearAllListFilters,
        selectAllListFilters,
        isAllListFiltersSelected,
        getBubbleCountByTagForListView,
        getFilteredBubblesForList,
    };
}
