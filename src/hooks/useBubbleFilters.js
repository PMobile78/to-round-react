import { useCallback, useEffect, useState } from 'react';
import { lsGet, lsSet } from '../utils/storage';
import { LS } from '../utils/storageKeys';
import { BUBBLE_STATUS } from '../services/firestoreService';
import { useBubblesStore } from '../state/BubblesStore';

function readBubbleViewPlannedTasksFromLS() {
    return lsGet(LS.PLANNED_TASKS_ONLY, false) === true;
}

// Pure helper: toggle a tag id in/out of the filter list (returns a new array).
export function toggleTagInFilter(filterTags, tagId) {
    return filterTags.includes(tagId)
        ? filterTags.filter((id) => id !== tagId)
        : [...filterTags, tagId];
}

// Pure helper: true when every tag is selected and "no tag" bubbles are shown.
export function isAllTagsSelected(tags, filterTags, showNoTag) {
    return tags.length > 0 && filterTags.length === tags.length && showNoTag;
}

// Pure helper: detect a persisted tag filter that references tags from another
// account. The `bubbles-filter-tags` / `bubbles-show-no-tag` localStorage keys are
// shared across all accounts in the browser and are not cleared on logout, so after
// re-logging into a different account the saved filter can point at tag ids that no
// longer exist — leaving no category highlighted in the Task categories panel.
// Returns a reset-to-"all" descriptor when stale ids are present, or null when the
// filter is consistent with the loaded `tags`.
export function reconcileStaleFilterTags(tags, filterTags) {
    if (tags.length === 0) return null;
    const tagIds = new Set(tags.map((tag) => tag.id));
    const hasStale = filterTags.some((id) => !tagIds.has(id));
    if (!hasStale) return null;
    const allTagIds = tags.map((tag) => tag.id);
    return { filterTags: allTagIds, showNoTag: true, selectedCategory: 'all' };
}

// Pure helper: count active (or search-found) bubbles for a tag in bubbles-view.
// Always reflects the total count for the tag, independent of the active filters,
// but honours the current search query when one is present. `tagId === null`
// counts bubbles without a tag (or whose tag was deleted).
export function countBubblesByTagForBubblesView({ bubbles, tags, searchFoundBubbles, debouncedSearchQuery }, tagId) {
    const bubblesForCount = debouncedSearchQuery && debouncedSearchQuery.trim()
        ? searchFoundBubbles
        : bubbles.filter((bubble) => bubble.status === BUBBLE_STATUS.ACTIVE);

    if (tagId === null) {
        return bubblesForCount.filter((bubble) => {
            if (!bubble.tagId) return true;
            const tagExists = tags.find((t) => t.id === bubble.tagId);
            return !tagExists; // include bubbles whose tag was deleted
        }).length;
    }
    return bubblesForCount.filter((bubble) => bubble.tagId === tagId).length;
}

export function useBubbleFilters({ tags }) {
    const { register, searchFoundBubbles, debouncedSearchQuery } = useBubblesStore();
    const [filterTags, setFilterTags] = useState(() =>
        lsGet(LS.FILTER_TAGS, [])
    ); // Массив ID выбранных тегов для фильтрации

    const [showNoTag, setShowNoTag] = useState(() =>
        lsGet(LS.SHOW_NO_TAG, true)
    ); // Показывать ли пузыри без тегов

    const [bubbleViewPlannedTasksOnly, setBubbleViewPlannedTasksOnly] = useState(readBubbleViewPlannedTasksFromLS);

    const [selectedCategory, setSelectedCategory] = useState(() => {
        if (readBubbleViewPlannedTasksFromLS()) {
            return 'planned-tasks';
        }
        // Восстанавливаем выбранную категорию на основе сохраненных фильтров
        const savedFilterTags = lsGet(LS.FILTER_TAGS);
        const savedShowNoTag = lsGet(LS.SHOW_NO_TAG);

        if (savedFilterTags && savedShowNoTag !== null) {
            const filterTags = savedFilterTags;
            const showNoTag = savedShowNoTag;

            // Если выбраны все теги и включен показ пузырей без тегов - это "all"
            if (filterTags.length > 0 && showNoTag) {
                // Проверим, выбраны ли все доступные теги (это будет определено позже, когда загрузятся теги)
                return 'all';
            }
            // Если не выбраны теги, но включен показ пузырей без тегов - это "no-tags"
            else if (filterTags.length === 0 && showNoTag) {
                return 'no-tags';
            }
            // Если выбран только один тег - это конкретная категория
            else if (filterTags.length === 1 && !showNoTag) {
                return filterTags[0];
            }
        }
        return null;
    }); // Выбранная категория

    const [categoriesPanelEnabled, setCategoriesPanelEnabled] = useState(() =>
        lsGet(LS.CATEGORIES_PANEL_ENABLED, false)
    ); // Постоянное отображение панели категорий

    // Register setFilterTags into the store for other hooks (e.g., useTags)
    // to access when managing tags.
    useEffect(() => {
        register({ setFilterTags });
    }, [setFilterTags, register]);

    // Синхронизация selectedCategory с фильтрами после загрузки тегов
    useEffect(() => {
        if (tags.length > 0) {
            // Если на устройстве нет сохраненных настроек фильтра, выбираем все теги и показываем без тега
            let savedFilterTags = lsGet(LS.FILTER_TAGS);
            let savedShowNoTag = lsGet(LS.SHOW_NO_TAG);

            if (savedFilterTags === null && savedShowNoTag === null) {
                const allTagIds = tags.map(tag => tag.id);
                setFilterTags(allTagIds);
                setShowNoTag(true);
                setSelectedCategory('all');
                lsSet(LS.FILTER_TAGS, allTagIds);
                lsSet(LS.SHOW_NO_TAG, true);
                savedFilterTags = allTagIds;
                savedShowNoTag = true;
            }

            if (bubbleViewPlannedTasksOnly) {
                const allTagIds = tags.map((tag) => tag.id);
                setFilterTags(allTagIds);
                setShowNoTag(true);
                setSelectedCategory('planned-tasks');
                lsSet(LS.FILTER_TAGS, allTagIds);
                lsSet(LS.SHOW_NO_TAG, true);
            } else if (savedFilterTags && savedShowNoTag !== null) {
                const filterTags = savedFilterTags;
                const showNoTag = savedShowNoTag;

                // Сохранённый фильтр может ссылаться на теги предыдущего аккаунта
                // (ключи localStorage общие для всех аккаунтов и не чистятся при
                // logout). В этом случае сбрасываем фильтр на "all", иначе в панели
                // категорий не подсветится ни один пункт.
                const staleReset = reconcileStaleFilterTags(tags, filterTags);
                if (staleReset) {
                    setFilterTags(staleReset.filterTags);
                    setShowNoTag(staleReset.showNoTag);
                    setSelectedCategory(staleReset.selectedCategory);
                    lsSet(LS.FILTER_TAGS, staleReset.filterTags);
                    lsSet(LS.SHOW_NO_TAG, staleReset.showNoTag);
                    return;
                }

                // Если выбраны все теги и включен показ пузырей без тегов - это "all"
                if (filterTags.length === tags.length && showNoTag) {
                    setSelectedCategory('all');
                }
                // Если не выбраны теги, но включен показ пузырей без тегов - это "no-tags"
                else if (filterTags.length === 0 && showNoTag) {
                    setSelectedCategory('no-tags');
                }
                // Если выбран только один тег - это конкретная категория
                else if (filterTags.length === 1 && !showNoTag) {
                    setSelectedCategory(filterTags[0]);
                }
                // Если выбрано несколько тегов (но не все) — не выделяем категорию
                else if (filterTags.length > 1) {
                    setSelectedCategory(null);
                }
                // Если выбрано несколько тегов или другие комбинации - сбрасываем выбранную категорию
                else {
                    setSelectedCategory(null);
                }
            }
        }
    }, [tags, bubbleViewPlannedTasksOnly]);

    // Синхронизация selectedCategory при изменении фильтров
    useEffect(() => {
        if (tags.length > 0) {
            // Если выбраны все теги и включен показ пузырей без тегов - это "all" или «Запланированные»
            if (filterTags.length === tags.length && showNoTag) {
                setSelectedCategory(bubbleViewPlannedTasksOnly ? 'planned-tasks' : 'all');
            }
            // Если не выбраны теги, но включен показ пузырей без тегов - это "no-tags"
            else if (filterTags.length === 0 && showNoTag) {
                setSelectedCategory('no-tags');
            }
            // Если выбран только один тег - это конкретная категория
            else if (filterTags.length === 1 && !showNoTag) {
                setSelectedCategory(filterTags[0]);
            }
            // Если выбрано несколько тегов (но не все) — не выделяем категорию
            else if (filterTags.length > 1) {
                setSelectedCategory(null);
            }
            // Если выбрано несколько тегов или другие комбинации - сбрасываем выбранную категорию
            else {
                setSelectedCategory(null);
            }
        }
    }, [filterTags, showNoTag, tags, bubbleViewPlannedTasksOnly]);

    const handleCategorySelect = (categoryId) => {
        setSelectedCategory(categoryId);
        // Панель не закрывается при выборе категории, если она постоянно включена

        if (categoryId === 'all') {
            setBubbleViewPlannedTasksOnly(false);
            lsSet(LS.PLANNED_TASKS_ONLY, false);
            // Показываем все пузыри - устанавливаем все теги
            const allTagIds = tags.map(tag => tag.id);
            setFilterTags(allTagIds);
            setShowNoTag(true);
            lsSet(LS.FILTER_TAGS, allTagIds);
            lsSet(LS.SHOW_NO_TAG, true);
        } else if (categoryId === 'planned-tasks') {
            const allTagIds = tags.map(tag => tag.id);
            setBubbleViewPlannedTasksOnly(true);
            lsSet(LS.PLANNED_TASKS_ONLY, true);
            setFilterTags(allTagIds);
            setShowNoTag(true);
            lsSet(LS.FILTER_TAGS, allTagIds);
            lsSet(LS.SHOW_NO_TAG, true);
        } else if (categoryId === 'no-tags') {
            setBubbleViewPlannedTasksOnly(false);
            lsSet(LS.PLANNED_TASKS_ONLY, false);
            // Показываем только пузыри без тегов
            setFilterTags([]);
            setShowNoTag(true);
            lsSet(LS.FILTER_TAGS, []);
            lsSet(LS.SHOW_NO_TAG, true);
        } else {
            setBubbleViewPlannedTasksOnly(false);
            lsSet(LS.PLANNED_TASKS_ONLY, false);
            // Устанавливаем фильтр только на выбранную категорию
            setFilterTags([categoryId]);
            setShowNoTag(false); // Отключаем показ пузырей без тегов
            lsSet(LS.FILTER_TAGS, [categoryId]);
            lsSet(LS.SHOW_NO_TAG, false);
        }
    };

    const handleToggleCategoriesPanel = () => {
        const newValue = !categoriesPanelEnabled;
        setCategoriesPanelEnabled(newValue);
        lsSet(LS.CATEGORIES_PANEL_ENABLED, newValue);
    };

    // --- bubbles-view filter callbacks (moved from BubblesPage, Task B of #66) ---
    const handleTagFilterChange = useCallback((tagId) => {
        setBubbleViewPlannedTasksOnly(false);
        lsSet(LS.PLANNED_TASKS_ONLY, false);
        setFilterTags((prev) => {
            const newFilterTags = toggleTagInFilter(prev, tagId);
            lsSet(LS.FILTER_TAGS, newFilterTags);
            return newFilterTags;
        });
        // Сбрасываем выбранную категорию при ручном изменении фильтров
        setSelectedCategory(null);
    }, []);

    const handleNoTagFilterChange = useCallback(() => {
        setBubbleViewPlannedTasksOnly(false);
        lsSet(LS.PLANNED_TASKS_ONLY, false);
        setShowNoTag((prev) => {
            const newShowNoTag = !prev;
            lsSet(LS.SHOW_NO_TAG, newShowNoTag);
            return newShowNoTag;
        });
        // Сбрасываем выбранную категорию при ручном изменении фильтров
        setSelectedCategory(null);
    }, []);

    const clearAllFilters = useCallback(() => {
        setBubbleViewPlannedTasksOnly(false);
        lsSet(LS.PLANNED_TASKS_ONLY, false);
        setFilterTags([]);
        setShowNoTag(false);
        setSelectedCategory(null); // Сбрасываем выбранную категорию
        lsSet(LS.FILTER_TAGS, []);
        lsSet(LS.SHOW_NO_TAG, false);
    }, []);

    const selectAllFilters = useCallback(() => {
        setBubbleViewPlannedTasksOnly(false);
        lsSet(LS.PLANNED_TASKS_ONLY, false);
        const allTagIds = tags.map((tag) => tag.id);
        setFilterTags(allTagIds);
        setShowNoTag(true);
        setSelectedCategory(null); // Сбрасываем выбранную категорию
        lsSet(LS.FILTER_TAGS, allTagIds);
        lsSet(LS.SHOW_NO_TAG, true);
    }, [tags]);

    const isAllSelected = useCallback(() => {
        return isAllTagsSelected(tags, filterTags, showNoTag);
    }, [tags, filterTags, showNoTag]);

    // Count bubbles by tag for the bubbles view. All deps come from the store or
    // local state. Consumers of this callback are not memoized, so a stable identity
    // here is safe.
    const getBubbleCountByTagForBubblesView = useCallback((tagId) => {
        const { bubbles } = useBubblesStore();
        return countBubblesByTagForBubblesView({
            bubbles,
            tags,
            searchFoundBubbles,
            debouncedSearchQuery
        }, tagId);
    }, [tags, searchFoundBubbles, debouncedSearchQuery]);

    return {
        filterTags,
        setFilterTags,
        showNoTag,
        setShowNoTag,
        bubbleViewPlannedTasksOnly,
        setBubbleViewPlannedTasksOnly,
        selectedCategory,
        setSelectedCategory,
        categoriesPanelEnabled,
        setCategoriesPanelEnabled,
        handleCategorySelect,
        handleToggleCategoriesPanel,
        handleTagFilterChange,
        handleNoTagFilterChange,
        clearAllFilters,
        selectAllFilters,
        isAllSelected,
        getBubbleCountByTagForBubblesView,
    };
}
