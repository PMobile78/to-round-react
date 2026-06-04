import { useEffect, useState } from 'react';
import { lsGet, lsSet } from '../utils/storage';

const BUBBLES_PLANNED_TASKS_VIEW_LS_KEY = 'bubbles-planned-tasks-only';

function readBubbleViewPlannedTasksFromLS() {
    return lsGet(BUBBLES_PLANNED_TASKS_VIEW_LS_KEY, false) === true;
}

export function useBubbleFilters({ tags }) {
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
    };
}
