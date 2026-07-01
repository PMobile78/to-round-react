import { useCallback, useEffect, useState } from 'react';
import { lsGet, lsSet } from '../utils/storage';
import { LS } from '../utils/storageKeys';
import { getBubblesByStatus } from '../services/firestoreService';
import { stripHtml } from '../utils/stripHtml';
import { toggleTagInFilter } from './useBubbleFilters';
import { useBubblesStore } from '../state/BubblesStore';

// Re-export the shared pure toggle helper so list-view consumers/tests can import
// it from here too (symmetry with useBubbleFilters).
export { toggleTagInFilter };

// Pure helper: true when every tag is selected and "no tag" tasks are shown.
export function isAllListTagsSelected(tags, listFilterTags, listShowNoTag) {
    return tags.length > 0 && listFilterTags.length === tags.length && listShowNoTag;
}

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

// Pure helper: count tasks by tag for the list view (based on selected status and
// search). `tagId === null` counts tasks without a tag or with a deleted tag.
export function countBubblesByTagForListView({ bubbles, tags, listFilter, listSearchQuery }, tagId) {
    const filteredByStatus = getBubblesByStatus(bubbles, listFilter);
    let tagFilteredBubbles;

    if (tagId === null) {
        // Count bubbles without tags or with deleted tags in selected status
        tagFilteredBubbles = filteredByStatus.filter(bubble => {
            if (!bubble.tagId) return true;
            const tagExists = tags.find(t => t.id === bubble.tagId);
            return !tagExists; // Включаем пузыри с удаленными тегами
        });
    } else {
        tagFilteredBubbles = filteredByStatus.filter(bubble => bubble.tagId === tagId);
    }

    // Apply search filter using the same logic as in ListView
    if (!listSearchQuery || !listSearchQuery.trim()) {
        return tagFilteredBubbles.length;
    }

    const query = listSearchQuery.toLowerCase().trim();
    const searchFilteredBubbles = tagFilteredBubbles.filter(task => {
        // Search in title
        const titleMatch = (task.title || '').toLowerCase().includes(query);

        // Search in description
        const descriptionMatch = stripHtml(task.description || '').toLowerCase().includes(query);

        // Search in tag name
        const tag = task.tagId ? tags.find(t => t.id === task.tagId) : null;
        const tagMatch = tag ? tag.name.toLowerCase().includes(query) : false;

        return titleMatch || descriptionMatch || tagMatch;
    });

    return searchFilteredBubbles.length;
}

export function useListFilters({ tags, pageDeps }) {
    const { register } = useBubblesStore();
    const [listFilterTags, setListFilterTags] = useState(() =>
        lsGet(LS.LIST_FILTER_TAGS, [])
    ); // Массив ID выбранных тегов для фильтрации в списке

    const [listShowNoTag, setListShowNoTag] = useState(() =>
        lsGet(LS.LIST_SHOW_NO_TAG, true)
    ); // Показывать ли задачи без тегов в списке

    // Register setListFilterTags into the store for other hooks (e.g., useTags)
    // to access when managing tags.
    useEffect(() => {
        register({ setListFilterTags });
    }, [setListFilterTags, register]);

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
    }, [tags]);

    // Memoized functions for list filter management
    const handleListTagFilterChange = useCallback((tagId) => {
        setListFilterTags(prev => {
            const newListFilterTags = toggleTagInFilter(prev, tagId);
            lsSet(LS.LIST_FILTER_TAGS, newListFilterTags);
            return newListFilterTags;
        });
    }, []);

    const handleListNoTagFilterChange = useCallback(() => {
        setListShowNoTag(prev => {
            const newListShowNoTag = !prev;
            lsSet(LS.LIST_SHOW_NO_TAG, newListShowNoTag);
            return newListShowNoTag;
        });
    }, []);

    const clearAllListFilters = useCallback(() => {
        setListFilterTags([]);
        setListShowNoTag(false);
        lsSet(LS.LIST_FILTER_TAGS, []);
        lsSet(LS.LIST_SHOW_NO_TAG, false);
    }, []);

    const selectAllListFilters = useCallback(() => {
        const allTagIds = tags.map(tag => tag.id);
        setListFilterTags(allTagIds);
        setListShowNoTag(true);
        lsSet(LS.LIST_FILTER_TAGS, allTagIds);
        lsSet(LS.LIST_SHOW_NO_TAG, true);
    }, [tags]);

    const isAllListFiltersSelected = useCallback(() => {
        return isAllListTagsSelected(tags, listFilterTags, listShowNoTag);
    }, [tags, listFilterTags, listShowNoTag]);

    // `listFilter` and `listSearchQuery` are defined *after* this hook
    // runs in BubblesPage, so they are read at call-time from the pageDeps bridge
    // ref. `bubbles` and `tags` come from the store. Consumers of this callback
    // are not memoized, so a stable identity is safe.
    const getBubbleCountByTagForListView = useCallback((tagId) => {
        const { bubbles } = useBubblesStore();
        const deps = (pageDeps && pageDeps.current) || {};
        return countBubblesByTagForListView({
            bubbles,
            tags,
            listFilter: deps.listFilter,
            listSearchQuery: deps.listSearchQuery
        }, tagId);
    }, [tags, pageDeps]);

    // Function for filtering bubbles for list view (supports all statuses). Reads
    // `listFilter` from the pageDeps bridge at call-time; `bubbles` comes from store.
    const getFilteredBubblesForList = useCallback(() => {
        const { bubbles } = useBubblesStore();
        const deps = (pageDeps && pageDeps.current) || {};
        return filterBubblesForList({
            bubbles,
            tags,
            listFilter: deps.listFilter,
            listFilterTags,
            listShowNoTag
        });
    }, [tags, listFilterTags, listShowNoTag, pageDeps]);

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
