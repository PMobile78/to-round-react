import { useCallback, useEffect, useState } from 'react';
import { useBubblesUi } from '../state/BubblesUiStore';

// Pure helper: toggle a tag id in/out of the filter list (returns a new array).
export function toggleTagInFilter(filterTags, tagId) {
    return filterTags.includes(tagId)
        ? filterTags.filter((id) => id !== tagId)
        : [...filterTags, tagId];
}

/**
 * Bubbles-view filter and category panel. The filter itself is the user's setting
 * bubbleFilter (users/{uid}.settings, spec 3.5) kept by BubblesUiStore; this hook keeps the
 * selected category of the panel in step with it.
 */
export function useBubbleFilters({ tags }) {
    const {
        register,
        filterTags,
        setFilterTags,
        showNoTag,
        setShowNoTag,
        bubbleViewPlannedTasksOnly,
        setBubbleViewPlannedTasksOnly,
        setBubbleFilter,
        categoriesPanelEnabled,
        setCategoriesPanelEnabled,
        isAllSelected,
        getBubbleCountByTagForBubblesView,
    } = useBubblesUi();

    const [selectedCategory, setSelectedCategory] = useState(null); // Выбранная категория

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
            // Если выбрано несколько тегов (но не все) или другие комбинации — не выделяем категорию
            else {
                setSelectedCategory(null);
            }
        } else if (bubbleViewPlannedTasksOnly) {
            setSelectedCategory('planned-tasks');
        }
    }, [filterTags, showNoTag, tags, bubbleViewPlannedTasksOnly]);

    const handleCategorySelect = (categoryId) => {
        setSelectedCategory(categoryId);
        // Панель не закрывается при выборе категории, если она постоянно включена

        if (categoryId === 'all') {
            // Показываем все пузыри (null: все категории, и новые тоже)
            setBubbleFilter({ categoryIds: null, showUncategorized: true, plannedOnly: false });
        } else if (categoryId === 'planned-tasks') {
            setBubbleFilter({ categoryIds: null, showUncategorized: true, plannedOnly: true });
        } else if (categoryId === 'no-tags') {
            // Показываем только пузыри без тегов
            setBubbleFilter({ categoryIds: [], showUncategorized: true, plannedOnly: false });
        } else {
            // Устанавливаем фильтр только на выбранную категорию
            setBubbleFilter({ categoryIds: [categoryId], showUncategorized: false, plannedOnly: false });
        }
    };

    const handleToggleCategoriesPanel = () => {
        setCategoriesPanelEnabled(!categoriesPanelEnabled);
    };

    // --- bubbles-view filter callbacks (moved from BubblesPage, Task B of #66) ---
    const handleTagFilterChange = useCallback((tagId) => {
        setBubbleViewPlannedTasksOnly(false);
        setFilterTags((prev) => toggleTagInFilter(prev, tagId));
        // Сбрасываем выбранную категорию при ручном изменении фильтров
        setSelectedCategory(null);
    }, [setBubbleViewPlannedTasksOnly, setFilterTags]);

    const handleNoTagFilterChange = useCallback(() => {
        setBubbleViewPlannedTasksOnly(false);
        setShowNoTag((prev) => !prev);
        // Сбрасываем выбранную категорию при ручном изменении фильтров
        setSelectedCategory(null);
    }, [setBubbleViewPlannedTasksOnly, setShowNoTag]);

    const clearAllFilters = useCallback(() => {
        setBubbleFilter({ categoryIds: [], showUncategorized: false, plannedOnly: false });
        setSelectedCategory(null); // Сбрасываем выбранную категорию
    }, [setBubbleFilter]);

    const selectAllFilters = useCallback(() => {
        setBubbleFilter({ categoryIds: null, showUncategorized: true, plannedOnly: false });
        setSelectedCategory(null); // Сбрасываем выбранную категорию
    }, [setBubbleFilter]);

    // Register the 4 filter handlers for TaskFilterDrawer to access via the store.
    // NOTE: This effect is placed after all four handler definitions to avoid TDZ
    // (Temporal Dead Zone) — the dependency array must not reference const callbacks
    // that are still in the dead zone.
    useEffect(() => {
        register({
            handleTagFilterChange,
            handleNoTagFilterChange,
            selectAllFilters,
            clearAllFilters,
        });
    }, [register, handleTagFilterChange, handleNoTagFilterChange, selectAllFilters, clearAllFilters]);

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
