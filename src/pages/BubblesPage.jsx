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
import { useBubblesData } from '../state/BubblesDataStore';
import { useBubblesUi } from '../state/BubblesUiStore';


const BubblesPage = ({ user, themeMode }) => {
    const { t, i18n } = useTranslation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md')); // 768px and below
    const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm')); // 600px and below

    const canvasRef = useRef(null);
    const engineRef = useRef(null);
    const renderRef = useRef(null);
    const wallsRef = useRef([]);
    const { bubbles, setBubbles } = useBubblesData();
    const {
        setSelectedTagId,
        register,
        setSearchFoundBubbles: storeSetSearchFoundBubbles,
        setDebouncedSearchQuery: storeSetDebouncedSearchQuery,
        listFilter,
        setListFilter,
        listSearchQuery,
        setListSearchQuery,
        listSortBy,
        setListSortBy,
        listSortOrder,
        setListSortOrder,
        // Form state (create/edit bubble dialogs) — migrated into the store in
        // Stage E of 010d; consumed here by the form handlers, the save/create
        // wrappers, and passed through to useMatterEngine.
        dueDate,
        setDueDate,
        editDueDate,
        setEditDueDate,
        createNotifications,
        setCreateNotifications,
        editNotifications,
        setEditNotifications,
        createRecurrence,
        setCreateRecurrence,
        editRecurrence,
        setEditRecurrence,
        setEditBubbleSize,
        // Dialog open-flags + settings values — migrated into the store in Stage F
        // of 010d; consumed here by header buttons and the page-local handlers.
        setMenuDrawerOpen,
        setFilterDrawerOpen,
        setLogoutDialog,
        setListViewDialog,
        bubbleBackgroundEnabled,
        setBubbleBackgroundEnabled,
        mainView,
        setMainView,
        fontSize,
        setFontSize,
        // categoriesDialog is store-owned as of Stage H of 010d; the page still
        // opens it from the desktop categories panel below.
        setCategoriesDialog,
    } = useBubblesUi();

    // Bubble CRUD + dialog state extracted into useBubbleCrud (Task 5/6 of #38).
    // Called early because it owns selectedBubble/editDialog, which liveEditRef,
    // useMatterEngine and useBubbleNotifications all consume. Values defined by
    // later hooks reach its handlers via the store (shared domain) or explicit
    // call-time args (page-local UI) — see the hook's doc comment.
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
        openCreateDialog,
        createNewBubble,
        handleSaveBubble,
        handleDeleteBubble,
        handleMarkAsDone,
        handleCloseDialog,
        clearAllBubbles,
        handleToggleEditUseRichText
    } = useBubbleCrud({ engineRef, renderRef, bubbles, setBubbles, theme, isMobile });

    // Live mirror of edit-dialog state for the Matter mount-effect subscription
    // (its closure captures editDialog/selectedBubble once and stays stale).
    const liveEditRef = useRef({ editDialog: false, selectedBubbleId: null });
    useEffect(() => {
        liveEditRef.current = { editDialog, selectedBubbleId: selectedBubble?.id ?? null };
    }, [editDialog, selectedBubble]);
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

    // Tag state + behaviour extracted into useTags (Task 2/6 of #38).
    // Cross-hook deps (setBubbles, setFilterTags, setListFilterTags,
    // getBubbleFillStyle) now come from BubblesStore, so no page-owned ref bridge
    // is needed.
    const {
        tags,
        setTags,
        tagsRef,
        deleteTimers,
        handleOpenTagDialog,
        handleSaveTag,
        handleDeleteTag,
        handleUndoDeleteTag,
        handleCloseTagDialog,
        getNextAvailableColor,
    } = useTags({ user });

    // Filter / category state extracted into hook.
    // All deps now come from BubblesStore.
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
        isAllSelected,
    } = useBubbleFilters({ tags });

    // List-view filter / count state extracted into useListFilters (Task C of #67).
    // All deps now come from BubblesStore.
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
    } = useListFilters({ tags });

    // JSON import/export handlers extracted into useBubbleImportExport (Task D of #68).
    // Now uses BubblesStore directly for bubbles/tags state.
    const {
        handleExportJson,
        handleImportJson,
    } = useBubbleImportExport();

    const [categoriesDrawerOpen, setCategoriesDrawerOpen] = useState(false); // Состояние панели категорий
    // categoriesDialog moved to BubblesStore (Stage H of 010d).
    // Dialog open-flags (filter/menu/font/appearance/change-password/logout/list-view)
    // + fontSize now live in BubblesStore (Stage F of 010d).

    const [showInstructions, setShowInstructions] = useState(() => {
        const saved = lsGetString(LS.SHOW_INSTRUCTIONS);
        return saved === null ? true : saved === 'true';
    }); // Показывать ли подсказки инструкций
    // bubbleBackgroundEnabled + mainView now live in BubblesStore (Stage F of 010d).

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

    // bubbleSize/editBubbleSize now live in the BubblesStore (Stage E of 010d;
    // originally moved out of BubblesPage into useBubbleCrud in Task 5/6 of #38).

    // Function to get button styles based on theme
    const getButtonStyles = () => {
        return theme.custom?.buttonStyles || {};
    };

    const getOutlinedButtonStyles = () => {
        return theme.custom?.outlinedButtonStyles || {};
    };

    // getDialogPaperStyles moved into BubblesDialogs (Stage G of 010d) — it was
    // only forwarded to the dialogs, which now derive it from useTheme() directly.

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

    // Register a stable getBubbleFillStyle wrapper into the store so useTags can
    // recolor bubbles when a tag is deleted. getBubbleFillStyle is intentionally
    // NOT memoized (useBubbleNotifications relies on its per-render identity to
    // re-subscribe its rAF loop), so we register a stable wrapper that reads the
    // latest impl via a ref — keeping bubbleBackgroundEnabled/theme fresh without
    // triggering a re-render loop.
    const getBubbleFillStyleRef = useRef(getBubbleFillStyle);
    getBubbleFillStyleRef.current = getBubbleFillStyle;
    useEffect(() => {
        register({ getBubbleFillStyle: (...args) => getBubbleFillStyleRef.current(...args) });
    }, [register]);

    // Register selectedCategory (owned by the later useBubbleFilters hook) so
    // useBubbleCrud can read it at call-time — useBubbleCrud runs first, so it
    // can't be a plain prop. selectedTagId/setSelectedTagId now live in the store
    // directly and no longer need this bridge. Re-registers only when
    // selectedCategory changes, so there is no render loop.
    useEffect(() => {
        register({ selectedCategory });
    }, [selectedCategory, register]);

    // Function to get canvas dimensions depending on screen size
    // Размер канваса вычисляется через утилиту, учитывая панель категорий
    const getCanvasSize = () => computeCanvasSize({ isMobile, categoriesPanelEnabled });



    // Overdue-pulse refs and the rAF pulse loop live in useBubbleNotifications
    // (Task 4/6 of #38). The create/edit form state it used to own moved to the
    // BubblesStore in Stage E of 010d; only the refs are consumed here.
    const {
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

    // openCreateDialog needs the create-form setters (page-local, owned by
    // useBubbleNotifications); supply them explicitly at the call site.
    const handleOpenCreateDialog = () => openCreateDialog({ setDueDate, setCreateNotifications });

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
    // values — no store registration or ref bridge needed.
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

    // Sync search/list state to BubblesStore so hooks can read them
    useEffect(() => {
        storeSetSearchFoundBubbles(searchFoundBubbles);
    }, [searchFoundBubbles, storeSetSearchFoundBubbles]);

    useEffect(() => {
        storeSetDebouncedSearchQuery(debouncedBubblesSearchQuery);
    }, [debouncedBubblesSearchQuery, storeSetDebouncedSearchQuery]);

    // foundBubblesIds + the search-state sync effect + the visibility/highlight effect
    // now live in useBubbleWorld (Task E of #69); foundBubblesIds is returned above.



    // Bubble CRUD (createBubble/openCreateDialog/createNewBubble/handleSaveBubble/
    // handleDeleteBubble/handleMarkAsDone/handleCloseDialog/clearAllBubbles/
    // handleToggleEditUseRichText + the open-bubble deep-link listener) live in
    // useBubbleCrud (Task 5/6 of #38).

    // getFilteredBubblesForList now lives in useListFilters (Task C of #67).

    // Tag dialog/CRUD + color helpers live in useTags (Task 2/6 of #38).

    // Bubbles-view filter callbacks (handleTagFilterChange, handleNoTagFilterChange,
    // clearAllFilters, selectAllFilters, isAllSelected) now live in useBubbleFilters
    // (Task B of #66).

    // List-view filter callbacks (handleListTagFilterChange, handleListNoTagFilterChange,
    // clearAllListFilters, selectAllListFilters, isAllListFiltersSelected) and
    // getBubbleCountByTagForListView now live in useListFilters (Task C of #67).

    // getBubbleCountByTagForBubblesView now lives in useBubbleFilters (Task B of #66).

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
    // aboutOpen now lives in BubblesStore (Stage F of 010d).

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
                    onAddBubble={handleOpenCreateDialog}
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
                    onAddBubble={handleOpenCreateDialog}
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
                    onAddBubble={handleOpenCreateDialog}
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
                editDialog={editDialog}
                handleCloseDialog={handleCloseDialog}
                selectedBubble={selectedBubble}
                setSelectedBubble={setSelectedBubble}
                setEditDialog={setEditDialog}
                handleDeleteNotification={handleDeleteNotification}
                handleDeleteBubble={handleDeleteBubble}
                handleMarkAsDone={handleMarkAsDone}
                handleSaveBubble={(payload) => handleSaveBubble({ ...payload, editDueDate, editNotifications, editRecurrence, manuallyStoppedPulsingRef, setEditDueDate })}
                onStopPulsing={handleStopPulsing}
                showStopPulsing={editDialogShowStopPulsing}
                handleSetEditRecurrence={handleSetEditRecurrence}
                useRichTextEdit={useRichTextEdit}
                handleToggleEditUseRichText={handleToggleEditUseRichText}
                handleOpenTagDialog={handleOpenTagDialog}
                handleDeleteTag={handleDeleteTag}
                handleCloseTagDialog={handleCloseTagDialog}
                handleSaveTag={handleSaveTag}
                handleToggleBubbleBackground={handleToggleBubbleBackground}
                handleToggleMainView={handleToggleMainView}
                categoriesPanelEnabled={categoriesPanelEnabled}
                handleToggleCategoriesPanel={handleToggleCategoriesPanel}
                handleLogout={handleLogout}
                handleExportJson={handleExportJson}
                handleImportJson={handleImportJson}
                createDialog={createDialog}
                setCreateDialog={setCreateDialog}
                handleSetCreateRecurrence={handleSetCreateRecurrence}
                handleDeleteCreateNotification={handleDeleteCreateNotification}
                createNewBubble={(payload) => createNewBubble({ ...payload, canvasSize, dueDate, createNotifications, createRecurrence, setDueDate })}
                useRichTextCreate={useRichTextCreate}
                setUseRichTextCreate={setUseRichTextCreate}
                handleUndoDeleteTag={handleUndoDeleteTag}
                handleFontSizeChange={handleFontSizeChange}
                confirmLogout={confirmLogout}
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