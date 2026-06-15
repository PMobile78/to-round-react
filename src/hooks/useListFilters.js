import { useCallback, useEffect, useState } from 'react';
import { getBubblesByStatus } from '../services/firestoreService';
import { stripHtml } from '../utils/stripHtml';
import { toggleTagInFilter } from './useBubbleFilters';

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
    const [listFilterTags, setListFilterTags] = useState(() => {
        const saved = localStorage.getItem('bubbles-list-filter-tags');
        return saved ? JSON.parse(saved) : [];
    }); // Массив ID выбранных тегов для фильтрации в списке

    const [listShowNoTag, setListShowNoTag] = useState(() => {
        const saved = localStorage.getItem('bubbles-list-show-no-tag');
        return saved ? JSON.parse(saved) : true;
    }); // Показывать ли задачи без тегов в списке

    // Инициализация настроек фильтра списка задач после загрузки тегов
    useEffect(() => {
        if (tags.length > 0) {
            // Тоже самое для настроек фильтра в списке задач
            const savedListFilterTags = localStorage.getItem('bubbles-list-filter-tags');
            const savedListShowNoTag = localStorage.getItem('bubbles-list-show-no-tag');
            if (savedListFilterTags === null && savedListShowNoTag === null) {
                const allTagIds = tags.map(tag => tag.id);
                setListFilterTags(allTagIds);
                setListShowNoTag(true);
                localStorage.setItem('bubbles-list-filter-tags', JSON.stringify(allTagIds));
                localStorage.setItem('bubbles-list-show-no-tag', JSON.stringify(true));
            }
        }
    }, [tags]);

    // Memoized functions for list filter management
    const handleListTagFilterChange = useCallback((tagId) => {
        setListFilterTags(prev => {
            const newListFilterTags = toggleTagInFilter(prev, tagId);
            localStorage.setItem('bubbles-list-filter-tags', JSON.stringify(newListFilterTags));
            return newListFilterTags;
        });
    }, []);

    const handleListNoTagFilterChange = useCallback(() => {
        setListShowNoTag(prev => {
            const newListShowNoTag = !prev;
            localStorage.setItem('bubbles-list-show-no-tag', JSON.stringify(newListShowNoTag));
            return newListShowNoTag;
        });
    }, []);

    const clearAllListFilters = useCallback(() => {
        setListFilterTags([]);
        setListShowNoTag(false);
        localStorage.setItem('bubbles-list-filter-tags', JSON.stringify([]));
        localStorage.setItem('bubbles-list-show-no-tag', JSON.stringify(false));
    }, []);

    const selectAllListFilters = useCallback(() => {
        const allTagIds = tags.map(tag => tag.id);
        setListFilterTags(allTagIds);
        setListShowNoTag(true);
        localStorage.setItem('bubbles-list-filter-tags', JSON.stringify(allTagIds));
        localStorage.setItem('bubbles-list-show-no-tag', JSON.stringify(true));
    }, [tags]);

    const isAllListFiltersSelected = useCallback(() => {
        return isAllListTagsSelected(tags, listFilterTags, listShowNoTag);
    }, [tags, listFilterTags, listShowNoTag]);

    // `bubbles`, `listFilter` and `listSearchQuery` are defined *after* this hook
    // runs in BubblesPage, so they are read at call-time from the pageDeps bridge
    // ref. Consumers of this callback are not memoized, so a stable identity is safe.
    const getBubbleCountByTagForListView = useCallback((tagId) => {
        const deps = (pageDeps && pageDeps.current) || {};
        return countBubblesByTagForListView({
            bubbles: deps.bubbles || [],
            tags,
            listFilter: deps.listFilter,
            listSearchQuery: deps.listSearchQuery
        }, tagId);
    }, [tags, pageDeps]);

    // Function for filtering bubbles for list view (supports all statuses). Reads
    // `bubbles`/`listFilter` from the pageDeps bridge at call-time (same reasoning
    // as getBubbleCountByTagForListView above).
    const getFilteredBubblesForList = useCallback(() => {
        const deps = (pageDeps && pageDeps.current) || {};
        return filterBubblesForList({
            bubbles: deps.bubbles || [],
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
