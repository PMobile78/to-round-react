import { useCallback, useEffect, useRef } from 'react';
import { getBubblesByStatus } from '../utils/bubbleStatus';
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
        setListCategoryFilter,
        isAllListFiltersSelected,
        getBubbleCountByTagForListView,
    } = useBubblesUi();
    const storeDataRef = useRef({ bubbles, listFilter, listSearchQuery });

    // Keep ref up-to-date with store values
    useEffect(() => {
        storeDataRef.current = { bubbles, listFilter, listSearchQuery };
    }, [bubbles, listFilter, listSearchQuery]);

    // Memoized functions for list filter management. The filter is the user's setting
    // listFilter (users/{uid}.settings), kept by BubblesUiStore; by default all categories.
    const handleListTagFilterChange = useCallback((tagId) => {
        setListFilterTags(prev => toggleTagInFilter(prev, tagId));
    }, [setListFilterTags]);

    const handleListNoTagFilterChange = useCallback(() => {
        setListShowNoTag(prev => !prev);
    }, [setListShowNoTag]);

    const clearAllListFilters = useCallback(() => {
        setListCategoryFilter({ categoryIds: [], showUncategorized: false });
    }, [setListCategoryFilter]);

    const selectAllListFilters = useCallback(() => {
        setListCategoryFilter({ categoryIds: null, showUncategorized: true });
    }, [setListCategoryFilter]);

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
