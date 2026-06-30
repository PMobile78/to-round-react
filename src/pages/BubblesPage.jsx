import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
    Box,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { lsGet, lsSet, lsGetString } from '../utils/storage';
import { LS } from '../utils/storageKeys';
import BubblesDialogs from '../components/BubblesDialogs';
import TextOverlay from '../components/TextOverlay';
import { logoutUser } from '../services/authService';
import {
    loadBubblesFromFirestore,
    saveTagsToFirestore,
    subscribeToBubblesUpdates,
    BUBBLE_STATUS,
    cleanupOldDeletedBubbles,
    updateBubbleFields,
    deleteBubbleDoc
} from '../services/firestoreService';

import TasksCategoriesPanel from '../components/TasksCategoriesPanel';
import MobileCategorySelector from '../components/MobileCategorySelector';
import BubbleViewHeader from '../components/BubbleViewHeader';
import BubbleViewToolbar from '../components/BubbleViewToolbar';
import BubbleViewFab from '../components/BubbleViewFab';
import TasksFullScreenView from '../components/TasksFullScreenView';
import { DesignBackdrop } from '../components/DesignBackdrop';
import logger from '../utils/logger';
import { useMatterResize } from '../hooks/useMatterResize';
import { computeCanvasSize, createWorldBounds } from '../utils/physicsUtils';
import { useMatterEngine } from '../hooks/useMatterEngine';
import { useDraggableFab } from '../hooks/useDraggableFab';
import { useBubbleFilters } from '../hooks/useBubbleFilters';
import { useListFilters } from '../hooks/useListFilters';
import { useBubbleImportExport } from '../hooks/useBubbleImportExport';
import { useBubbleWorld } from '../hooks/useBubbleWorld';
import { useTags } from '../hooks/useTags';
import { useBubbleNotifications } from '../hooks/useBubbleNotifications';
import { useBubbleCrud } from '../hooks/useBubbleCrud';
import { withAlpha } from '../utils/colorUtils';
import { parseLocalDateTime } from '../utils/dateTime';
import { notificationKeyPrefix, shouldShowStopPulsing } from '../utils/notifications';
import { applyBubbleFill } from '../utils/bubbleStyle';
import {
    readBubbleViewPlannedTasksFromLS
} from '../utils/bubbleData';


const BubblesPage = ({ user, themeMode, toggleTheme, themeToggleProps, onOpenMindMap, themeModeState, setThemeMode, design, setDesign, designs }) => {
    const { t, i18n } = useTranslation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md')); // 768px and below
    const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm')); // 600px and below

    const canvasRef = useRef(null);
    const engineRef = useRef(null);
    const renderRef = useRef(null);
    const wallsRef = useRef([]);
    const [bubbles, setBubbles] = useState([]);

    // Bubble CRUD + dialog state extracted into useBubbleCrud (Task 5/6 of #38).
    // Called early because it owns selectedBubble/editDialog, which liveEditRef,
    // useMatterEngine and useBubbleNotifications all consume. crudDeps bridges
    // values its handlers need at call-time that are defined later (tags,
    // selectedTagId, selectedCategory, getBubbleFillStyle, canvasSize and the
    // notification state) — kept fresh each render below.
    const crudDepsRef = useRef({});
    const {
        createDialog,
        setCreateDialog,
        editDialog,
        setEditDialog,
        selectedBubble,
        setSelectedBubble,
        useRichTextCreate,
        setUseRichTextCreate,
        useRichTextEdit,
        setUseRichTextEdit,
        bubbleSize,
        setBubbleSize,
        editBubbleSize,
        setEditBubbleSize,
        openCreateDialog,
        createNewBubble,
        handleSaveBubble,
        handleDeleteBubble,
        handleMarkAsDone,
        handleCloseDialog,
        clearAllBubbles,
        handleToggleEditUseRichText
    } = useBubbleCrud({ engineRef, renderRef, bubbles, setBubbles, theme, isMobile, deps: crudDepsRef });

    // Live mirror of edit-dialog state for the Matter mount-effect subscription
    // (its closure captures editDialog/selectedBubble once and stays stale).
    const liveEditRef = useRef({ editDialog: false, selectedBubbleId: null });
    useEffect(() => {
        liveEditRef.current = { editDialog, selectedBubbleId: selectedBubble?.id ?? null };
    }, [editDialog, selectedBubble]);
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

    // Tag state + behaviour extracted into useTags (Task 2/6 of #38).
    // pageDeps bridges page-owned deps that are defined *after* this call or that
    // would otherwise create a useTags <-> useBubbleFilters cycle (setFilterTags
    // comes from useBubbleFilters, which itself needs `tags` from useTags).
    // Tag handlers read pageDeps.current at call-time, so render order is fine.
    const tagPageDepsRef = useRef({});
    const {
        tags,
        setTags,
        tagsRef,
        selectedTagId,
        setSelectedTagId,
        tagDialog,
        tagName,
        setTagName,
        tagColor,
        setTagColor,
        editingTag,
        deletingTags,
        deleteTimers,
        handleOpenTagDialog,
        handleSaveTag,
        handleDeleteTag,
        handleUndoDeleteTag,
        handleCloseTagDialog,
        getBubbleCountByTag,
        getNextAvailableColor,
        isColorAvailable,
        canCreateMoreTags,
        COLOR_PALETTE
    } = useTags({ user, bubbles, pageDeps: tagPageDepsRef });

    // Filter / category state extracted into hook.
    // filterPageDepsRef bridges deps the bubbles-view count callback needs but that
    // are defined *after* this call (bubbles + search state); read at call-time.
    const filterPageDepsRef = useRef({});
    const {
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
    } = useBubbleFilters({ tags, pageDeps: filterPageDepsRef });

    // List-view filter / count state extracted into useListFilters (Task C of #67).
    // listFilterPageDepsRef bridges deps the list count/filter callbacks need but
    // that are defined *after* this call (bubbles + listFilter + list search); read
    // at call-time.
    const listFilterPageDepsRef = useRef({});
    const {
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
    } = useListFilters({ tags, pageDeps: listFilterPageDepsRef });

    // JSON import/export handlers extracted into useBubbleImportExport (Task D of #68).
    // importExportPageDepsRef bridges the page-owned `bubbles` + `tags` the export
    // builder reads at call-time (refreshed below), keeping a stable handler identity.
    const importExportPageDepsRef = useRef({});
    const {
        handleExportJson,
        handleImportJson,
    } = useBubbleImportExport({ pageDeps: importExportPageDepsRef, setBubbles, setTags });

    const [filterDrawerOpen, setFilterDrawerOpen] = useState(false); // Состояние бокового меню фильтров
    const [menuDrawerOpen, setMenuDrawerOpen] = useState(false); // Состояние левого бокового меню
    const [categoriesDrawerOpen, setCategoriesDrawerOpen] = useState(false); // Состояние панели категорий
    const [categoriesDialog, setCategoriesDialog] = useState(false); // Диалог управления категориями
    const [fontSettingsDialog, setFontSettingsDialog] = useState(false); // Диалог настроек шрифта
    const [appearanceDialogOpen, setAppearanceDialogOpen] = useState(false); // Диалог оформления
    const [changePasswordOpen, setChangePasswordOpen] = useState(false); // Диалог смены пароля
    const [fontSize, setFontSize] = useState(() => {
        const savedFontSize = lsGetString(LS.FONT_SIZE);
        return savedFontSize ? parseInt(savedFontSize) : 8;
    }); // Размер шрифта для надписей в пузырях
    const [logoutDialog, setLogoutDialog] = useState(false); // Диалог подтверждения выхода
    const [listViewDialog, setListViewDialog] = useState(false); // Диалог списка задач
    const [listFilter, setListFilter] = useState('active'); // 'active', 'done', 'postpone', 'deleted'
    const [listSortBy, setListSortBy] = useState(() => {
        const saved = lsGetString(LS.LIST_SORT_BY);
        return saved ? saved : 'updatedAt';
    }); // 'createdAt', 'updatedAt', 'title', 'tag'
    const [listSortOrder, setListSortOrder] = useState(() => {
        const saved = lsGetString(LS.LIST_SORT_ORDER);
        return saved ? saved : 'desc';
    }); // 'asc', 'desc'
    // listFilterTags / listShowNoTag state now live in useListFilters (Task C of #67).
    const [listSearchQuery, setListSearchQuery] = useState(''); // Поисковый запрос для списка задач

    const [showInstructions, setShowInstructions] = useState(() => {
        const saved = lsGetString(LS.SHOW_INSTRUCTIONS);
        return saved === null ? true : saved === 'true';
    }); // Показывать ли подсказки инструкций
    const [bubbleBackgroundEnabled, setBubbleBackgroundEnabled] = useState(() => {
        const saved = lsGetString(LS.BACKGROUND_ENABLED);
        return saved === null ? true : saved === 'true';
    }); // Включен ли фон пузырей
    const [mainView, setMainView] = useState(() => {
        return lsGetString(LS.MAIN_VIEW) === 'tasks' ? 'tasks' : 'bubbles';
    }); // Режим главного окна: 'bubbles' (canvas) | 'tasks' (список задач)

    // Состояние поиска для Bubbles View
    const [bubblesSearchQuery, setBubblesSearchQuery] = useState('');
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);

    // Позиция FAB (перетаскиваемая), сохраняется в localStorage
    const {
        fabRef,
        fabPosition,
        isDraggingFab,
        suppressNextClickRef,
        getDefaultFabPosition,
        onFabPointerDown,
    } = useDraggableFab({ isMobile });

    // Константа скорости падения пузырей (максимальная скорость)
    const dropSpeed = 1.0;

    // bubbleSize/editBubbleSize now live in useBubbleCrud (Task 5/6 of #38).

    // Function to get button styles based on theme
    const getButtonStyles = () => {
        return theme.custom?.buttonStyles || {};
    };

    const getOutlinedButtonStyles = () => {
        return theme.custom?.outlinedButtonStyles || {};
    };

    const getDialogPaperStyles = () => {
        return theme.custom?.dialogPaper || {
            backgroundColor: theme.palette.background.paper,
            color: theme.palette.text.primary
        };
    };

    // Note: Functions moved to firestoreService.js for better organization

    // Function to get bubble fill style based on theme
    const getBubbleFillStyle = (tagColor = null) => {
        // Если фон отключен, возвращаем прозрачный
        if (!bubbleBackgroundEnabled) {
            return 'transparent';
        }

        if (tagColor) {
            return withAlpha(tagColor, theme.custom?.bubble?.fill?.tagAlpha ?? 0.10);
        }
        return theme.custom?.bubble?.fill?.defaultFill ?? 'rgba(255, 255, 255, 0.06)';
    };

    // Keep the bridge to useTags fresh: tag handlers read these at call-time.
    tagPageDepsRef.current = {
        setBubbles,
        setFilterTags,
        setListFilterTags,
        getBubbleFillStyle
    };

    // Function to get canvas dimensions depending on screen size
    // Размер канваса вычисляется через утилиту, учитывая панель категорий
    const getCanvasSize = () => computeCanvasSize({ isMobile, categoriesPanelEnabled });



    // Notification + overdue-pulse state, refs and the rAF pulse loop
    // extracted into useBubbleNotifications (Task 4/6 of #38). Declared here so
    // useMatterEngine and the dialogs below can consume the state/refs.
    const {
        dueDate,
        setDueDate,
        editDueDate,
        setEditDueDate,
        editNotifications,
        setEditNotifications,
        editRecurrence,
        setEditRecurrence,
        createNotifications,
        setCreateNotifications,
        createRecurrence,
        setCreateRecurrence,
        notifDialogOpen,
        setNotifDialogOpen,
        notifValue,
        setNotifValue,
        stickyPulseRef,
        lastDueRef,
        manuallyStoppedPulsingRef,
        notifiedBubblesRef,
        notifiedBubbleNotificationsRef
    } = useBubbleNotifications({
        bubbles,
        tags,
        engineRef,
        getBubbleFillStyle,
        selectedBubble,
        editDialog,
        t,
        i18nLanguage: i18n.language
    });

    // Keep the bridge to useBubbleCrud fresh: its handlers read these at call-time.
    crudDepsRef.current = {
        tags,
        selectedTagId,
        setSelectedTagId,
        selectedCategory,
        getBubbleFillStyle,
        canvasSize,
        dueDate,
        setDueDate,
        createNotifications,
        setCreateNotifications,
        createRecurrence,
        editDueDate,
        setEditDueDate,
        editNotifications,
        editRecurrence,
        manuallyStoppedPulsingRef
    };

    // Physics engine — initialised once on mount via hook
    useMatterEngine({
        canvasRef,
        engineRef,
        renderRef,
        wallsRef,
        stickyPulseRef,
        lastDueRef,
        manuallyStoppedPulsingRef,
        editDialog,
        selectedBubble,
        liveEditRef,
        setBubbles,
        setCanvasSize,
        setSelectedBubble,
        setSelectedTagId,
        setEditBubbleSize,
        setEditDialog,
        setEditDueDate,
        setEditNotifications,
        setEditRecurrence,
        isMobile,
        themeMode,
        tags,
        dropSpeed,
        getBubbleFillStyle,
        getCanvasSize,
        parseLocalDateTime,
        theme,
    });

    // Перестраиваем размеры канваса и границы мира при ресайзе окна
    // и при переключении панели категорий — без перезагрузки страницы
    useMatterResize({
        engineRef,
        renderRef,
        wallsRef,
        isMobile,
        categoriesPanelEnabled,
        setCanvasSize,
        matterReady: Boolean(engineRef.current && renderRef.current),
    });

    // Separate useEffect for theme change - update background and bubble fill styles
    useEffect(() => {
        if (renderRef.current && renderRef.current.canvas) {
            const canvas = renderRef.current.canvas;

            // Canvas is now transparent; background is on the container (updated via sx)
            renderRef.current.options.background = 'transparent';
            canvas.style.background = 'transparent';
        }

        // Update existing bubbles fill style and stroke width based on theme
        if (engineRef.current) {
            bubbles.forEach(bubble => {
                if (bubble.body && bubble.body.render) {
                    let tagColor = null;
                    if (bubble.tagId) {
                        const tag = tags.find(t => t.id === bubble.tagId);
                        if (tag) {
                            tagColor = tag.color;
                        }
                    }
                    applyBubbleFill(bubble, { tagColor }, getBubbleFillStyle);
                    bubble.body.render.lineWidth = theme.custom?.bubble?.strokeWidth ?? 1.5;
                }
            });
        }
    }, [theme, bubbles, tags]);

    // Reconcile filter selections + recolor bubbles whenever the tag set changes.
    // Seam (Task 2/6 of #38): the live `setTags` half of the old
    // subscribeToTagsUpdates effect now lives in useTags; this [tags] effect keeps
    // the filter-reconciliation + bubble-recolor half here. Reconciliation must
    // not run until tags have actually loaded: every empty `tags` snapshot before
    // the first real one (initial mount, StrictMode's double-invoke, empty
    // intermediate Firestore emits) would otherwise treat every saved filter id as
    // "deleted" and wipe `bubbles-filter-tags` to [] — silently clearing the
    // user's selected category on every page reload. Skip until the first
    // non-empty snapshot flips the guard, matching the original
    // subscription-driven timing.
    const tagsReconcileInitRef = useRef(false);
    useEffect(() => {
        if (!tagsReconcileInitRef.current) {
            if (tags.length === 0) return;
            tagsReconcileInitRef.current = true;
        }
        const existingTagIds = tags.map(tag => tag.id);

        // Update filter tags to remove deleted tags
        setFilterTags(currentFilterTags => {
            const validFilterTags = currentFilterTags.filter(id => existingTagIds.includes(id));
            // Не записываем ключ впервые, чтобы не блокировать первичную инициализацию фильтра
            const hadFilterKey = lsGet(LS.FILTER_TAGS) !== null;
            if (hadFilterKey) {
                lsSet(LS.FILTER_TAGS, validFilterTags);
            }
            return validFilterTags;
        });

        // Update list filter tags to remove deleted tags
        setListFilterTags(currentListFilterTags => {
            const validListFilterTags = currentListFilterTags.filter(id => existingTagIds.includes(id));
            const hadListFilterKey = lsGet(LS.LIST_FILTER_TAGS) !== null;
            if (hadListFilterKey) {
                lsSet(LS.LIST_FILTER_TAGS, validListFilterTags);
            }
            return validListFilterTags;
        });

        // Update bubble colors and fill styles when tags change
        setBubbles(currentBubbles => {
            return currentBubbles.map(bubble => {
                if (bubble.tagId) {
                    const tag = tags.find(t => t.id === bubble.tagId);
                    if (tag && bubble.body) {
                        applyBubbleFill(bubble, { tagColor: tag.color, stroke: tag.color }, getBubbleFillStyle);
                    }
                } else if (bubble.body) {
                    applyBubbleFill(bubble, { tagColor: null, stroke: '#B0B0B0' }, getBubbleFillStyle);
                }
                return bubble;
            });
        });
    }, [tags]);

    // List-filter init-effect (settings after tags load) now lives in useListFilters
    // (Task C of #67).

    // При включении панели категорий оставляем текущие фильтры и выбранную категорию как есть
    // Выбор в панели определяется текущими filterTags/showNoTag

    // Функция для фильтрации пузырей по категории (тегу)
    const getBubblesByCategory = (categoryId) => {
        return bubbles.filter(bubble => {
            if (bubble.status !== BUBBLE_STATUS.ACTIVE) return false;
            return bubble.tagId === categoryId;
        });
    };

    // Matter.js world sync (getFilteredBubbles + the world-fill / visibility-highlight
    // effects + the useSearch wiring + foundBubblesIds) now lives in useBubbleWorld
    // (Task E of #69). All inputs are page state defined above, so the hook takes plain
    // values — no pageDeps ref bridge needed (unlike useBubbleFilters / useListFilters).
    const {
        getFilteredBubbles,
        searchFoundBubbles,
        debouncedBubblesSearchQuery,
        foundBubblesIds,
    } = useBubbleWorld({
        engineRef,
        bubbles,
        tags,
        filterTags,
        showNoTag,
        bubbleViewPlannedTasksOnly,
        bubblesSearchQuery,
        theme,
    });

    // Keep the bridge to useBubbleFilters fresh: getBubbleCountByTagForBubblesView
    // reads these at call-time (defined after the hook runs).
    filterPageDepsRef.current = {
        bubbles,
        searchFoundBubbles,
        debouncedSearchQuery: debouncedBubblesSearchQuery
    };

    // Keep the bridge to useListFilters fresh: getBubbleCountByTagForListView /
    // getFilteredBubblesForList read these at call-time (defined after the hook runs).
    listFilterPageDepsRef.current = {
        bubbles,
        listFilter,
        listSearchQuery
    };

    // Keep the bridge to useBubbleImportExport fresh: handleExportJson reads
    // bubbles + tags at call-time (export builder).
    importExportPageDepsRef.current = {
        bubbles,
        tags
    };

    // foundBubblesIds + the search-state sync effect + the visibility/highlight effect
    // now live in useBubbleWorld (Task E of #69); foundBubblesIds is returned above.



    // Bubble CRUD (createBubble/openCreateDialog/createNewBubble/handleSaveBubble/
    // handleDeleteBubble/handleMarkAsDone/handleCloseDialog/clearAllBubbles/
    // handleToggleEditUseRichText + the open-bubble deep-link listener) live in
    // useBubbleCrud (Task 5/6 of #38).

    // getFilteredBubblesForList now lives in useListFilters (Task C of #67); its
    // late-bound deps (bubbles + listFilter) are fed via listFilterPageDepsRef below.

    // Tag dialog/CRUD + color helpers live in useTags (Task 2/6 of #38).

    // Bubbles-view filter callbacks (handleTagFilterChange, handleNoTagFilterChange,
    // clearAllFilters, selectAllFilters, isAllSelected) now live in useBubbleFilters
    // (Task B of #66).

    // List-view filter callbacks (handleListTagFilterChange, handleListNoTagFilterChange,
    // clearAllListFilters, selectAllListFilters, isAllListFiltersSelected) and
    // getBubbleCountByTagForListView now live in useListFilters (Task C of #67);
    // their late-bound deps are fed via listFilterPageDepsRef below.

    // getBubbleCountByTagForBubblesView now lives in useBubbleFilters (Task B of #66);
    // its late-bound deps are fed via filterPageDepsRef below.

    // Функции для работы с категориями (тегами)
    const getCategoryBubbleCounts = () => {
        const counts = {};
        tags.forEach(tag => {
            counts[tag.id] = bubbles.filter(bubble =>
                bubble.status === BUBBLE_STATUS.ACTIVE && bubble.tagId === tag.id
            ).length;
        });
        return counts;
    };

    const plannedTasksBubbleCount = useMemo(() => {
        const now = new Date();
        return bubbles.filter((bubble) => (
            bubble.dueDate &&
            new Date(bubble.dueDate) > now &&
            bubble.status !== BUBBLE_STATUS.DELETED &&
            bubble.status !== BUBBLE_STATUS.DONE
        )).length;
    }, [bubbles]);

    // isOverdue moved to utils/notifications.js (Task 3/6 of #38).

    // Функция выхода
    const handleLogout = () => {
        setLogoutDialog(true);
    };

    // Функция подтверждения выхода
    const confirmLogout = async () => {
        const result = await logoutUser();
        // if (result.success) {
        // console.log('User logged out successfully');
        // }
        setLogoutDialog(false);
    };

    // Функция для сохранения настроек шрифта
    const handleFontSizeChange = (newSize) => {
        setFontSize(newSize);
        lsSet(LS.FONT_SIZE, newSize.toString());
    };

    // Функция для закрытия подсказок
    const handleCloseInstructions = () => {
        setShowInstructions(false);
        lsSet(LS.SHOW_INSTRUCTIONS, 'false');
    };

    const handleToggleMainView = () => {
        const next = mainView === 'tasks' ? 'bubbles' : 'tasks';
        setMainView(next);
        lsSet(LS.MAIN_VIEW, next);
    };

    const handleToggleBubbleBackground = () => {
        const newValue = !bubbleBackgroundEnabled;
        setBubbleBackgroundEnabled(newValue);
        lsSet(LS.BACKGROUND_ENABLED, newValue.toString());

        // Обновляем фон всех пузырей
        setBubbles(prev => {
            const updatedBubbles = prev.map(bubble => {
                const tagColor = bubble.tagId ? tags.find(t => t.id === bubble.tagId)?.color : null;
                applyBubbleFill(bubble, { tagColor }, getBubbleFillStyle);
                return bubble;
            });
            return updatedBubbles;
        });
    };

    // Optimized component for displaying text over bubbles

    // Notification refs + the rAF pulse loop now live in useBubbleNotifications.

    // --- Сброс пульсации при удалении уведомления ---
    // Для editNotifications
    const handleDeleteNotification = useCallback((idx) => {
        setEditNotifications(prev => {
            // Не удаляем ключ из notifiedBubbleNotificationsRef.current
            return prev.filter((_, i) => i !== idx);
        });
    }, []);
    // Для createNotifications
    const handleDeleteCreateNotification = useCallback((idx) => {
        setCreateNotifications(prev => {
            // Не удаляем ключ из notifiedBubbleNotificationsRef.current
            return prev.filter((_, i) => i !== idx);
        });
    }, []);

    // При открытии диалога редактирования подставлять все поля (title/description/tag/size/dueDate/notifications)
    useEffect(() => {
        if (editDialog && selectedBubble) {
            // notifications
            setEditNotifications(Array.isArray(selectedBubble.notifications) ? selectedBubble.notifications : []);
            setEditRecurrence(selectedBubble.recurrence || null);
            // due date
            let val = selectedBubble.dueDate;
            if (val) {
                if (typeof val === 'string') {
                    const parsed = parseLocalDateTime(val);
                    setEditDueDate(parsed);
                } else if (val instanceof Date) {
                    setEditDueDate(val);
                } else {
                    setEditDueDate(null);
                }
            } else {
                setEditDueDate(null);
            }
            // basic fields for Save button logic
            setSelectedTagId(selectedBubble.tagId || '');
            if (typeof selectedBubble.radius === 'number') {
                setEditBubbleSize(selectedBubble.radius);
            }
            setEditRecurrence(selectedBubble.recurrence || null);
            setUseRichTextEdit(!!selectedBubble.useRichText);
        }
    }, [editDialog, selectedBubble]);

    // handleToggleEditUseRichText now lives in useBubbleCrud (Task 5/6 of #38).

    // Notification dialog/create state + language-reset effect now live in
    // useBubbleNotifications (Task 4/6 of #38).
    const [aboutOpen, setAboutOpen] = useState(false);

    // Stable callbacks for recurrence setters
    const handleSetCreateRecurrence = useCallback((value) => {
        setCreateRecurrence(value);
    }, []);

    const handleSetEditRecurrence = useCallback((value) => {
        setEditRecurrence(value);
    }, []);

    // JSON import/export (handleExportJson / handleImportJson) now lives in
    // useBubbleImportExport (Task D of #68); sourced from the hook above.

    // open-bubble deep-link listener now lives in useBubbleCrud (Task 5/6 of #38).

    // Авто-открытие по URL-параметру (?bubbleId=...) даже если событие было пропущено
    const deepLinkHandledRef = React.useRef(false);
    useEffect(() => {
        if (deepLinkHandledRef.current) return;
        try {
            const params = new URLSearchParams(window.location.search);
            const bubbleId = params.get('bubbleId');
            if (!bubbleId) return;
            const found = bubbles.find(b => String(b.id) === String(bubbleId));
            if (found) {
                deepLinkHandledRef.current = true;
                setSelectedBubble(found);
                setEditDialog(true);
            }
        } catch (e) {
            // ignore
        }
        // Intentional: setSelectedBubble/setEditDialog are stable useState setters; deepLinkHandledRef
        // is a ref — neither needs to be listed. bubbles is listed so the effect retries until loaded.
    }, [bubbles]);

    // Stop-pulsing handler for the edit dialog. Clears the local pulse refs for
    // the selected task, marks it as manually stopped, persists the suppressed
    // overdue flags and closes the dialog. Lives here (not in BubblesDialogs)
    // because it touches the page-owned bubble state and notification refs.
    const handleStopPulsing = async () => {
        try {
            if (!selectedBubble) return;

            // Очищаем локальные ссылки на пульсацию
            stickyPulseRef.current.delete(selectedBubble.id);
            notifiedBubblesRef.current.delete(selectedBubble.id);

            // Добавляем задачу в список вручную остановленных
            manuallyStoppedPulsingRef.current.add(selectedBubble.id);

            // Очищаем все уведомления для этой задачи
            const keysToDelete = [];
            notifiedBubbleNotificationsRef.current.forEach(key => {
                if (key.startsWith(notificationKeyPrefix(selectedBubble.id))) {
                    keysToDelete.push(key);
                }
            });
            keysToDelete.forEach(key => {
                notifiedBubbleNotificationsRef.current.delete(key);
            });

            // Персистим намерение «остановлено вручную» + сбрасываем серверный sticky-флаг
            const updatedBubble = {
                ...selectedBubble,
                overduePulseSuppressed: true,
                overdueSticky: false,
                overdueAt: null,
                updatedAt: new Date().toISOString()
            };

            setBubbles(prev => prev.map(b => b.id === selectedBubble.id ? updatedBubble : b));
            updateBubbleFields(selectedBubble.id, {
                overduePulseSuppressed: true, overdueSticky: false, overdueAt: null, updatedAt: updatedBubble.updatedAt
            }).catch(e => logger.error('Error stopping pulsing:', e));

            // Close edit dialog after stop pulsing
            setEditDialog(false);
            setSelectedBubble(null);
        } catch (e) {
            logger.error('Error stopping pulsing:', e);
        }
    };

    // Whether the edit dialog should show the "stop pulsing" button: active task
    // with a valid recurrence that is currently inside a notification window,
    // overdue, or flagged sticky. Computed each render from selectedBubble.
    const editDialogShowStopPulsing = shouldShowStopPulsing(
        selectedBubble, Date.now(), stickyPulseRef.current
    );

    return (
        <Box sx={{
            width: (!isMobile && categoriesPanelEnabled && mainView === 'bubbles') ? 'calc(100vw - 320px)' : '100vw',
            height: '100vh',
            overflow: 'hidden',
            position: 'relative',
            background: theme.custom?.canvasBackground || theme.palette.background.bubbleView,
            marginLeft: (!isMobile && categoriesPanelEnabled && mainView === 'bubbles') ? '320px' : '0px',
            transition: 'margin-left 0.3s ease, width 0.3s ease'
        }}>
            {/* Полоса хедера за плавающими контролами */}
            {mainView === 'bubbles' && theme.custom?.headerStrip?.show !== false && (
                <Box sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: isMobile ? 56 : 72,
                    zIndex: 999,
                    backgroundColor: alpha(theme.palette.background.paper, themeMode === 'light' ? 0.75 : 0.65),
                    backdropFilter: 'blur(10px)',
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    pointerEvents: 'none',
                    ...theme.custom?.headerStrip?.sx
                }} />
            )}
            {/* Заголовок и кнопки - адаптивный */}
            {mainView === 'bubbles' && (
                <BubbleViewHeader
                    isMobile={isMobile}
                    categoriesPanelEnabled={categoriesPanelEnabled}
                    t={t}
                    getButtonStyles={getButtonStyles}
                    onOpenMenu={setMenuDrawerOpen}
                    onAddBubble={openCreateDialog}
                />
            )}



            {/* Мобильный селектор категорий */}
            {mainView === 'bubbles' && isMobile && categoriesPanelEnabled && (
                <Box sx={{
                    position: 'absolute',
                    top: 70,
                    left: 20,
                    right: 20,
                    zIndex: 1000,
                    transition: 'all 0.3s ease'
                }}>
                    <MobileCategorySelector
                        tags={tags}
                        selectedCategory={selectedCategory}
                        onCategorySelect={handleCategorySelect}
                        themeMode={themeMode}
                        bubbleCounts={getCategoryBubbleCounts()}
                        bubbles={bubbles}
                        plannedTasksCount={plannedTasksBubbleCount}
                    />
                </Box>
            )}

            {/* Плавающие кнопки для мобильных устройств */}
            {mainView === 'bubbles' && isMobile && (
                <BubbleViewFab
                    t={t}
                    fabRef={fabRef}
                    onFabPointerDown={onFabPointerDown}
                    fabPosition={fabPosition}
                    getDefaultFabPosition={getDefaultFabPosition}
                    isDraggingFab={isDraggingFab}
                    suppressNextClickRef={suppressNextClickRef}
                    onAddBubble={openCreateDialog}
                />
            )}

            {/* Селектор языка и инструкции */}
            {mainView === 'bubbles' && (
                <BubbleViewToolbar
                    isMobile={isMobile}
                    isSmallScreen={isSmallScreen}
                    t={t}
                    themeMode={themeMode}
                    bubblesSearchQuery={bubblesSearchQuery}
                    setBubblesSearchQuery={setBubblesSearchQuery}
                    searchFoundBubbles={searchFoundBubbles}
                    showInstructions={showInstructions}
                    categoriesPanelEnabled={categoriesPanelEnabled}
                    setListViewDialog={setListViewDialog}
                    setFilterDrawerOpen={setFilterDrawerOpen}
                    isAllSelected={isAllSelected}
                    getOutlinedButtonStyles={getOutlinedButtonStyles}
                    getButtonStyles={getButtonStyles}
                    handleCloseInstructions={handleCloseInstructions}
                />
            )}

            {/* Decorative backdrop layer (behind canvas) */}
            <DesignBackdrop />

            {/* Canvas for physics - transparent so backdrop shows through */}
            <div ref={canvasRef} style={{
                width: '100vw',
                height: '100vh',
                position: 'absolute',
                top: 0,
                left: 0,
                zIndex: 2
            }} />
            {/* Текст поверх пузырей */}
            <TextOverlay
              bubbles={bubbles}
              getFilteredBubbles={getFilteredBubbles}
              foundBubblesIds={foundBubblesIds}
              debouncedBubblesSearchQuery={debouncedBubblesSearchQuery}
              isMobile={isMobile}
              fontSize={fontSize}
              themeMode={themeMode}
              tags={tags}
              engineRef={engineRef}
            />

            {/* Полноэкранный режим списка задач (canvas остаётся смонтированным под панелью) */}
            {mainView === 'tasks' && (
                <TasksFullScreenView
                    t={t}
                    onOpenMenu={setMenuDrawerOpen}
                    onAddBubble={openCreateDialog}
                    taskListProps={{
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
                        setSelectedTagId,
                        setEditDialog,
                        handleListTagFilterChange,
                        handleListNoTagFilterChange,
                        clearAllListFilters,
                        selectAllListFilters,
                        getBubbleCountByTagForListView,
                        themeMode,
                        isAllListFiltersSelected: isAllListFiltersSelected(),
                        onOpenFilterMenu: () => setFilterDrawerOpen(true)
                    }}
                />
            )}

            {/* Все диалоги и дроверы (Task A of #64) */}
            <BubblesDialogs
                t={t}
                isMobile={isMobile}
                isSmallScreen={isSmallScreen}
                themeMode={themeMode}
                getDialogPaperStyles={getDialogPaperStyles}
                tags={tags}
                setTags={setTags}
                bubbles={bubbles}
                setBubbles={setBubbles}
                editDialog={editDialog}
                handleCloseDialog={handleCloseDialog}
                selectedBubble={selectedBubble}
                setSelectedBubble={setSelectedBubble}
                setEditDialog={setEditDialog}
                editDueDate={editDueDate}
                setEditDueDate={setEditDueDate}
                notifDialogOpen={notifDialogOpen}
                setNotifDialogOpen={setNotifDialogOpen}
                notifValue={notifValue}
                setNotifValue={setNotifValue}
                editNotifications={editNotifications}
                setEditNotifications={setEditNotifications}
                handleDeleteNotification={handleDeleteNotification}
                selectedTagId={selectedTagId}
                setSelectedTagId={setSelectedTagId}
                editBubbleSize={editBubbleSize}
                setEditBubbleSize={setEditBubbleSize}
                handleDeleteBubble={handleDeleteBubble}
                handleMarkAsDone={handleMarkAsDone}
                handleSaveBubble={handleSaveBubble}
                onStopPulsing={handleStopPulsing}
                showStopPulsing={editDialogShowStopPulsing}
                editRecurrence={editRecurrence}
                handleSetEditRecurrence={handleSetEditRecurrence}
                useRichTextEdit={useRichTextEdit}
                handleToggleEditUseRichText={handleToggleEditUseRichText}
                handleOpenTagDialog={handleOpenTagDialog}
                handleDeleteTag={handleDeleteTag}
                tagDialog={tagDialog}
                handleCloseTagDialog={handleCloseTagDialog}
                COLOR_PALETTE={COLOR_PALETTE}
                editingTag={editingTag}
                tagName={tagName}
                setTagName={setTagName}
                tagColor={tagColor}
                setTagColor={setTagColor}
                isColorAvailable={isColorAvailable}
                canCreateMoreTags={canCreateMoreTags}
                handleSaveTag={handleSaveTag}
                menuDrawerOpen={menuDrawerOpen}
                setMenuDrawerOpen={setMenuDrawerOpen}
                themeToggleProps={themeToggleProps}
                toggleTheme={toggleTheme}
                bubbleBackgroundEnabled={bubbleBackgroundEnabled}
                handleToggleBubbleBackground={handleToggleBubbleBackground}
                mainView={mainView}
                handleToggleMainView={handleToggleMainView}
                categoriesPanelEnabled={categoriesPanelEnabled}
                handleToggleCategoriesPanel={handleToggleCategoriesPanel}
                setCategoriesDialog={setCategoriesDialog}
                setFontSettingsDialog={setFontSettingsDialog}
                setAppearanceDialogOpen={setAppearanceDialogOpen}
                setChangePasswordOpen={setChangePasswordOpen}
                onOpenMindMap={onOpenMindMap}
                setAboutOpen={setAboutOpen}
                handleLogout={handleLogout}
                handleExportJson={handleExportJson}
                handleImportJson={handleImportJson}
                aboutOpen={aboutOpen}
                filterDrawerOpen={filterDrawerOpen}
                setFilterDrawerOpen={setFilterDrawerOpen}
                filterTags={filterTags}
                showNoTag={showNoTag}
                handleNoTagFilterChange={handleNoTagFilterChange}
                handleTagFilterChange={handleTagFilterChange}
                selectAllFilters={selectAllFilters}
                clearAllFilters={clearAllFilters}
                isAllSelected={isAllSelected}
                getBubbleCountByTagForBubblesView={getBubbleCountByTagForBubblesView}
                createDialog={createDialog}
                setCreateDialog={setCreateDialog}
                dueDate={dueDate}
                setDueDate={setDueDate}
                createNotifications={createNotifications}
                setCreateNotifications={setCreateNotifications}
                createRecurrence={createRecurrence}
                handleSetCreateRecurrence={handleSetCreateRecurrence}
                handleDeleteCreateNotification={handleDeleteCreateNotification}
                bubbleSize={bubbleSize}
                setBubbleSize={setBubbleSize}
                createNewBubble={createNewBubble}
                useRichTextCreate={useRichTextCreate}
                setUseRichTextCreate={setUseRichTextCreate}
                categoriesDialog={categoriesDialog}
                deletingTags={deletingTags}
                handleUndoDeleteTag={handleUndoDeleteTag}
                getBubbleCountByTag={getBubbleCountByTag}
                fontSettingsDialog={fontSettingsDialog}
                fontSize={fontSize}
                handleFontSizeChange={handleFontSizeChange}
                appearanceDialogOpen={appearanceDialogOpen}
                themeModeState={themeModeState}
                setThemeMode={setThemeMode}
                design={design}
                setDesign={setDesign}
                designs={designs}
                changePasswordOpen={changePasswordOpen}
                logoutDialog={logoutDialog}
                setLogoutDialog={setLogoutDialog}
                confirmLogout={confirmLogout}
                listViewDialog={listViewDialog}
                setListViewDialog={setListViewDialog}
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
                handleListTagFilterChange={handleListTagFilterChange}
                handleListNoTagFilterChange={handleListNoTagFilterChange}
                clearAllListFilters={clearAllListFilters}
                selectAllListFilters={selectAllListFilters}
                getBubbleCountByTagForListView={getBubbleCountByTagForListView}
                isAllListFiltersSelected={isAllListFiltersSelected}
            />

            {/* Панель категорий - только для десктопа */}
            {mainView === 'bubbles' && !isMobile && (
                <TasksCategoriesPanel
                    open={categoriesPanelEnabled}
                    onClose={() => setCategoriesPanelEnabled(false)}
                    tags={tags}
                    selectedCategory={selectedCategory}
                    onCategorySelect={handleCategorySelect}
                    themeMode={themeMode}
                    bubbleCounts={getCategoryBubbleCounts()}
                    plannedTasksCount={plannedTasksBubbleCount}
                    onOpenTagDialog={() => setCategoriesDialog(true)}
                    bubbles={bubbles}
                    isPermanent={categoriesPanelEnabled}
                    onReorderTags={(updated) => {
                        setTags(updated);
                        saveTagsToFirestore(updated);
                    }}
                />
            )}

        </Box>
    );
};

export default BubblesPage;