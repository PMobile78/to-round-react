import { useCallback, useEffect, useState } from 'react';
import { lsGet, lsSet } from '../utils/storage';
import { BUBBLE_STATUS } from '../services/firestoreService';

const BUBBLES_PLANNED_TASKS_VIEW_LS_KEY = 'bubbles-planned-tasks-only';

function readBubbleViewPlannedTasksFromLS() {
    return lsGet(BUBBLES_PLANNED_TASKS_VIEW_LS_KEY, false) === true;
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

export function useBubbleFilters({ tags, pageDeps }) {
    const [filterTags, setFilterTags] = useState(() => {
        const saved = localStorage.getItem('bubbles-filter-tags');
        return saved ? JSON.parse(saved) : [];
    }); // Массив ID выбранных тегов для фильтрации

    const [showNoTag, setShowNoTag] = useState(() => {
        const saved = localStorage.getItem('bubbles-show-no-tag');
        return saved ? JSON.parse(saved) : true;
    }); // Показывать ли пузыри без тегов

    const [bubbleViewPlannedTasksOnly, setBubbleViewPlannedTasksOnly] = useState(readBubbleViewPlannedTasksFromLS);

    const [selectedCategory, setSelectedCategory] = useState(() => {
        if (readBubbleViewPlannedTasksFromLS()) {
            return 'planned-tasks';
        }
        // Восстанавливаем выбранную категорию на основе сохраненных фильтров
        const savedFilterTags = localStorage.getItem('bubbles-filter-tags');
        const savedShowNoTag = localStorage.getItem('bubbles-show-no-tag');

        if (savedFilterTags && savedShowNoTag) {
            const filterTags = JSON.parse(savedFilterTags);
            const showNoTag = JSON.parse(savedShowNoTag);

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

    const [categoriesPanelEnabled, setCategoriesPanelEnabled] = useState(() => {
        const saved = localStorage.getItem('bubbles-categories-panel-enabled');
        return saved ? JSON.parse(saved) : false;
    }); // Постоянное отображение панели категорий

    // Синхронизация selectedCategory с фильтрами после загрузки тегов
    useEffect(() => {
        if (tags.length > 0) {
            // Если на устройстве нет сохраненных настроек фильтра, выбираем все теги и показываем без тега
            let savedFilterTags = localStorage.getItem('bubbles-filter-tags');
            let savedShowNoTag = localStorage.getItem('bubbles-show-no-tag');

            if (savedFilterTags === null && savedShowNoTag === null) {
                const allTagIds = tags.map(tag => tag.id);
                setFilterTags(allTagIds);
                setShowNoTag(true);
                setSelectedCategory('all');
                localStorage.setItem('bubbles-filter-tags', JSON.stringify(allTagIds));
                localStorage.setItem('bubbles-show-no-tag', JSON.stringify(true));
                savedFilterTags = JSON.stringify(allTagIds);
                savedShowNoTag = JSON.stringify(true);
            }

            if (bubbleViewPlannedTasksOnly) {
                const allTagIds = tags.map((tag) => tag.id);
                setFilterTags(allTagIds);
                setShowNoTag(true);
                setSelectedCategory('planned-tasks');
                localStorage.setItem('bubbles-filter-tags', JSON.stringify(allTagIds));
                localStorage.setItem('bubbles-show-no-tag', JSON.stringify(true));
            } else if (savedFilterTags && savedShowNoTag) {
                const filterTags = JSON.parse(savedFilterTags);
                const showNoTag = JSON.parse(savedShowNoTag);

                // Сохранённый фильтр может ссылаться на теги предыдущего аккаунта
                // (ключи localStorage общие для всех аккаунтов и не чистятся при
                // logout). В этом случае сбрасываем фильтр на "all", иначе в панели
                // категорий не подсветится ни один пункт.
                const staleReset = reconcileStaleFilterTags(tags, filterTags);
                if (staleReset) {
                    setFilterTags(staleReset.filterTags);
                    setShowNoTag(staleReset.showNoTag);
                    setSelectedCategory(staleReset.selectedCategory);
                    localStorage.setItem('bubbles-filter-tags', JSON.stringify(staleReset.filterTags));
                    localStorage.setItem('bubbles-show-no-tag', JSON.stringify(staleReset.showNoTag));
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
            localStorage.setItem(BUBBLES_PLANNED_TASKS_VIEW_LS_KEY, JSON.stringify(false));
            // Показываем все пузыри - устанавливаем все теги
            const allTagIds = tags.map(tag => tag.id);
            setFilterTags(allTagIds);
            setShowNoTag(true);
            localStorage.setItem('bubbles-filter-tags', JSON.stringify(allTagIds));
            localStorage.setItem('bubbles-show-no-tag', JSON.stringify(true));
        } else if (categoryId === 'planned-tasks') {
            const allTagIds = tags.map(tag => tag.id);
            setBubbleViewPlannedTasksOnly(true);
            localStorage.setItem(BUBBLES_PLANNED_TASKS_VIEW_LS_KEY, JSON.stringify(true));
            setFilterTags(allTagIds);
            setShowNoTag(true);
            localStorage.setItem('bubbles-filter-tags', JSON.stringify(allTagIds));
            localStorage.setItem('bubbles-show-no-tag', JSON.stringify(true));
        } else if (categoryId === 'no-tags') {
            setBubbleViewPlannedTasksOnly(false);
            localStorage.setItem(BUBBLES_PLANNED_TASKS_VIEW_LS_KEY, JSON.stringify(false));
            // Показываем только пузыри без тегов
            setFilterTags([]);
            setShowNoTag(true);
            localStorage.setItem('bubbles-filter-tags', JSON.stringify([]));
            localStorage.setItem('bubbles-show-no-tag', JSON.stringify(true));
        } else {
            setBubbleViewPlannedTasksOnly(false);
            localStorage.setItem(BUBBLES_PLANNED_TASKS_VIEW_LS_KEY, JSON.stringify(false));
            // Устанавливаем фильтр только на выбранную категорию
            setFilterTags([categoryId]);
            setShowNoTag(false); // Отключаем показ пузырей без тегов
            localStorage.setItem('bubbles-filter-tags', JSON.stringify([categoryId]));
            localStorage.setItem('bubbles-show-no-tag', JSON.stringify(false));
        }
    };

    const handleToggleCategoriesPanel = () => {
        const newValue = !categoriesPanelEnabled;
        setCategoriesPanelEnabled(newValue);
        localStorage.setItem('bubbles-categories-panel-enabled', JSON.stringify(newValue));
    };

    // --- bubbles-view filter callbacks (moved from BubblesPage, Task B of #66) ---
    const handleTagFilterChange = useCallback((tagId) => {
        setBubbleViewPlannedTasksOnly(false);
        localStorage.setItem(BUBBLES_PLANNED_TASKS_VIEW_LS_KEY, JSON.stringify(false));
        setFilterTags((prev) => {
            const newFilterTags = toggleTagInFilter(prev, tagId);
            localStorage.setItem('bubbles-filter-tags', JSON.stringify(newFilterTags));
            return newFilterTags;
        });
        // Сбрасываем выбранную категорию при ручном изменении фильтров
        setSelectedCategory(null);
    }, []);

    const handleNoTagFilterChange = useCallback(() => {
        setBubbleViewPlannedTasksOnly(false);
        localStorage.setItem(BUBBLES_PLANNED_TASKS_VIEW_LS_KEY, JSON.stringify(false));
        setShowNoTag((prev) => {
            const newShowNoTag = !prev;
            localStorage.setItem('bubbles-show-no-tag', JSON.stringify(newShowNoTag));
            return newShowNoTag;
        });
        // Сбрасываем выбранную категорию при ручном изменении фильтров
        setSelectedCategory(null);
    }, []);

    const clearAllFilters = useCallback(() => {
        setBubbleViewPlannedTasksOnly(false);
        localStorage.setItem(BUBBLES_PLANNED_TASKS_VIEW_LS_KEY, JSON.stringify(false));
        setFilterTags([]);
        setShowNoTag(false);
        setSelectedCategory(null); // Сбрасываем выбранную категорию
        localStorage.setItem('bubbles-filter-tags', JSON.stringify([]));
        localStorage.setItem('bubbles-show-no-tag', JSON.stringify(false));
    }, []);

    const selectAllFilters = useCallback(() => {
        setBubbleViewPlannedTasksOnly(false);
        localStorage.setItem(BUBBLES_PLANNED_TASKS_VIEW_LS_KEY, JSON.stringify(false));
        const allTagIds = tags.map((tag) => tag.id);
        setFilterTags(allTagIds);
        setShowNoTag(true);
        setSelectedCategory(null); // Сбрасываем выбранную категорию
        localStorage.setItem('bubbles-filter-tags', JSON.stringify(allTagIds));
        localStorage.setItem('bubbles-show-no-tag', JSON.stringify(true));
    }, [tags]);

    const isAllSelected = useCallback(() => {
        return isAllTagsSelected(tags, filterTags, showNoTag);
    }, [tags, filterTags, showNoTag]);

    // Count bubbles by tag for the bubbles view. `bubbles` and the current search
    // state are defined *after* this hook runs in BubblesPage, so they are read at
    // call-time from the pageDeps bridge ref. Consumers of this callback are not
    // memoized, so a stable identity here is safe.
    const getBubbleCountByTagForBubblesView = useCallback((tagId) => {
        const deps = (pageDeps && pageDeps.current) || {};
        return countBubblesByTagForBubblesView({
            bubbles: deps.bubbles || [],
            tags,
            searchFoundBubbles: deps.searchFoundBubbles || [],
            debouncedSearchQuery: deps.debouncedSearchQuery
        }, tagId);
    }, [tags, pageDeps]);

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
