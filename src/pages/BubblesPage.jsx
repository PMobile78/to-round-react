import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
    Box,
    IconButton,
    useMediaQuery,
    useTheme,
    MenuItem,
    Menu,
    ListItemIcon,
    ListItemText,

} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
    DeleteOutlined, Menu as MenuIcon,
} from '@mui/icons-material';
import Matter from 'matter-js';
import { useTranslation } from 'react-i18next';
import MainMenuDrawer from '../components/MainMenuDrawer';
import AboutDialog from '../components/AboutDialog';
import FontSettingsDialog from '../components/FontSettingsDialog';
import AppearanceDialog from '../components/AppearanceDialog';
import ChangePasswordDialog from '../components/ChangePasswordDialog';
import LogoutConfirmDialog from '../components/LogoutConfirmDialog';
import TextOverlay from '../components/TextOverlay';
import { logoutUser } from '../services/authService';
import {
    saveBubblesToFirestore,
    loadBubblesFromFirestore,
    saveTagsToFirestore,
    subscribeToBubblesUpdates,
    BUBBLE_STATUS,
    getBubblesByStatus,
    cleanupOldDeletedBubbles,
    updateBubbleFields,
    deleteBubbleDoc
} from '../services/firestoreService';

import TaskListDrawer from '../components/ListViewDrawer';
import TasksCategoriesPanel from '../components/TasksCategoriesPanel';
import MobileCategorySelector from '../components/MobileCategorySelector';
import BubbleViewHeader from '../components/BubbleViewHeader';
import BubbleViewToolbar from '../components/BubbleViewToolbar';
import BubbleViewFab from '../components/BubbleViewFab';
import TasksFullScreenView from '../components/TasksFullScreenView';
import { DesignBackdrop } from '../components/DesignBackdrop';
import useSearch from '../hooks/useSearch';
import EditBubbleDialog from '../components/EditBubbleDialog';
import TasksCategoriesDialog from '../components/TasksCategoriesDialog';
import TaskFilterDrawer from '../components/TaskFilterDrawer';
import CreateBubbleDialog from '../components/CreateBubbleDialog';
import logger from '../utils/logger';
import TagEditorDialog from '../components/TagEditorDialog';
import { useMatterResize } from '../hooks/useMatterResize';
import { computeCanvasSize, createWorldBounds } from '../utils/physicsUtils';
import { useMatterEngine } from '../hooks/useMatterEngine';
import { useDraggableFab } from '../hooks/useDraggableFab';
import { useBubbleFilters } from '../hooks/useBubbleFilters';
import { useTags } from '../hooks/useTags';
import { useBubbleNotifications } from '../hooks/useBubbleNotifications';
import { useBubbleCrud } from '../hooks/useBubbleCrud';
import { withAlpha } from '../utils/colorUtils';
import { parseLocalDateTime } from '../utils/dateTime';
import { isOverdue, notificationKeyPrefix } from '../utils/notifications';
import { stripHtml } from '../utils/stripHtml';
import { exportJsonFile } from '../utils/exportJson';
import {
    sanitizeBubble,
    sanitizeTag,
    sanitizeBubblesForExport,
    readBubbleViewPlannedTasksFromLS,
    BUBBLES_PLANNED_TASKS_VIEW_LS_KEY
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
        tagMenuAnchor,
        setTagMenuAnchor,
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

    // Filter / category state extracted into hook
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
    } = useBubbleFilters({ tags });

    const [filterDrawerOpen, setFilterDrawerOpen] = useState(false); // Состояние бокового меню фильтров
    const [menuDrawerOpen, setMenuDrawerOpen] = useState(false); // Состояние левого бокового меню
    const [categoriesDrawerOpen, setCategoriesDrawerOpen] = useState(false); // Состояние панели категорий
    const [categoriesDialog, setCategoriesDialog] = useState(false); // Диалог управления категориями
    const [fontSettingsDialog, setFontSettingsDialog] = useState(false); // Диалог настроек шрифта
    const [appearanceDialogOpen, setAppearanceDialogOpen] = useState(false); // Диалог оформления
    const [changePasswordOpen, setChangePasswordOpen] = useState(false); // Диалог смены пароля
    const [fontSize, setFontSize] = useState(() => {
        const savedFontSize = localStorage.getItem('bubbles-font-size');
        return savedFontSize ? parseInt(savedFontSize) : 8;
    }); // Размер шрифта для надписей в пузырях
    const [logoutDialog, setLogoutDialog] = useState(false); // Диалог подтверждения выхода
    const [listViewDialog, setListViewDialog] = useState(false); // Диалог списка задач
    const [listFilter, setListFilter] = useState('active'); // 'active', 'done', 'postpone', 'deleted'
    const [listSortBy, setListSortBy] = useState(() => {
        const saved = localStorage.getItem('bubbles-list-sort-by');
        return saved ? saved : 'updatedAt';
    }); // 'createdAt', 'updatedAt', 'title', 'tag'
    const [listSortOrder, setListSortOrder] = useState(() => {
        const saved = localStorage.getItem('bubbles-list-sort-order');
        return saved ? saved : 'desc';
    }); // 'asc', 'desc'
    const [listFilterTags, setListFilterTags] = useState(() => {
        const saved = localStorage.getItem('bubbles-list-filter-tags');
        return saved ? JSON.parse(saved) : [];
    }); // Массив ID выбранных тегов для фильтрации в списке
    const [listShowNoTag, setListShowNoTag] = useState(() => {
        const saved = localStorage.getItem('bubbles-list-show-no-tag');
        return saved ? JSON.parse(saved) : true;
    }); // Показывать ли задачи без тегов в списке
    const [listSearchQuery, setListSearchQuery] = useState(''); // Поисковый запрос для списка задач

    const [showInstructions, setShowInstructions] = useState(() => {
        const saved = localStorage.getItem('bubbles-show-instructions');
        return saved === null ? true : saved === 'true';
    }); // Показывать ли подсказки инструкций
    const [bubbleBackgroundEnabled, setBubbleBackgroundEnabled] = useState(() => {
        const saved = localStorage.getItem('bubbles-background-enabled');
        return saved === null ? true : saved === 'true';
    }); // Включен ли фон пузырей
    const [mainView, setMainView] = useState(() => {
        return localStorage.getItem('bubbles-main-view') === 'tasks' ? 'tasks' : 'bubbles';
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
        getBubbleFillStyle,
        setCategoriesDialog
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
                    bubble.body.render.fillStyle = getBubbleFillStyle(tagColor);
                    bubble.body.render.lineWidth = theme.custom?.bubble?.strokeWidth ?? 1.5;
                }
            });
        }
    }, [theme, bubbles, tags]);

    // Reconcile filter selections + recolor bubbles whenever the tag set changes.
    // Seam (Task 2/6 of #38): the live `setTags` half of the old
    // subscribeToTagsUpdates effect now lives in useTags; this [tags] effect keeps
    // the filter-reconciliation + bubble-recolor half here. The very first run
    // (initial empty `tags` on mount) is skipped so saved filters aren't wiped
    // before tags load — matching the original subscription-driven timing.
    const tagsReconcileInitRef = useRef(false);
    useEffect(() => {
        if (!tagsReconcileInitRef.current) {
            tagsReconcileInitRef.current = true;
            return;
        }
        const existingTagIds = tags.map(tag => tag.id);

        // Update filter tags to remove deleted tags
        setFilterTags(currentFilterTags => {
            const validFilterTags = currentFilterTags.filter(id => existingTagIds.includes(id));
            // Не записываем ключ впервые, чтобы не блокировать первичную инициализацию фильтра
            const hadFilterKey = localStorage.getItem('bubbles-filter-tags') !== null;
            if (hadFilterKey) {
                localStorage.setItem('bubbles-filter-tags', JSON.stringify(validFilterTags));
            }
            return validFilterTags;
        });

        // Update list filter tags to remove deleted tags
        setListFilterTags(currentListFilterTags => {
            const validListFilterTags = currentListFilterTags.filter(id => existingTagIds.includes(id));
            const hadListFilterKey = localStorage.getItem('bubbles-list-filter-tags') !== null;
            if (hadListFilterKey) {
                localStorage.setItem('bubbles-list-filter-tags', JSON.stringify(validListFilterTags));
            }
            return validListFilterTags;
        });

        // Update bubble colors and fill styles when tags change
        setBubbles(currentBubbles => {
            return currentBubbles.map(bubble => {
                if (bubble.tagId) {
                    const tag = tags.find(t => t.id === bubble.tagId);
                    if (tag && bubble.body) {
                        bubble.body.render.strokeStyle = tag.color;
                        bubble.body.render.fillStyle = getBubbleFillStyle(tag.color);
                    }
                } else if (bubble.body) {
                    bubble.body.render.strokeStyle = '#B0B0B0';
                    bubble.body.render.fillStyle = getBubbleFillStyle(null);
                }
                return bubble;
            });
        });
    }, [tags]);

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

    // При включении панели категорий оставляем текущие фильтры и выбранную категорию как есть
    // Выбор в панели определяется текущими filterTags/showNoTag

    // Функция для фильтрации пузырей по категории (тегу)
    const getBubblesByCategory = (categoryId) => {
        return bubbles.filter(bubble => {
            if (bubble.status !== BUBBLE_STATUS.ACTIVE) return false;
            return bubble.tagId === categoryId;
        });
    };

    // Memoized function for filtering bubbles (for physics world - only active)
    const getFilteredBubbles = useMemo(() => {
        // Always show only active bubbles in physics world
        const filteredByStatus = bubbles.filter(bubble => bubble.status === BUBBLE_STATUS.ACTIVE);

        // Apply tag filters
        // Check if all tags are selected and showNoTag is true - show all bubbles
        const allTagsSelected = tags.length > 0 && filterTags.length === tags.length && showNoTag;

        let tagFiltered;
        if (allTagsSelected) {
            tagFiltered = filteredByStatus;
        } else {
            tagFiltered = filteredByStatus.filter(bubble => {
                // Проверяем, существует ли тег для пузыря
                const tagExists = bubble.tagId ? tags.find(t => t.id === bubble.tagId) : null;

                // Если выбраны теги и пузырь имеет один из выбранных тегов (который существует)
                if (filterTags.length > 0 && bubble.tagId && tagExists && filterTags.includes(bubble.tagId)) {
                    return true;
                }
                // Если включен фильтр "No Tag" и у пузыря нет тега или тег был удален
                if (showNoTag && (!bubble.tagId || !tagExists)) {
                    return true;
                }
                return false;
            });
        }

        if (!bubbleViewPlannedTasksOnly) {
            return tagFiltered;
        }

        // Как в TaskList для вкладки «Запланированные»: dueDate строго в будущем, не выполнены и не удалены
        const now = new Date();
        return tagFiltered.filter((bubble) => (
            bubble.dueDate &&
            new Date(bubble.dueDate) > now &&
            bubble.status !== BUBBLE_STATUS.DELETED &&
            bubble.status !== BUBBLE_STATUS.DONE
        ));
    }, [bubbles, tags, filterTags, showNoTag, bubbleViewPlannedTasksOnly]);
    // Применение фильтрации при загрузке пузырей
    useEffect(() => {
        if (bubbles.length > 0 && engineRef.current) {
            // Применяем фильтрацию сразу после загрузки пузырей
            const filteredIds = new Set(getFilteredBubbles.map(b => b.id));

            bubbles.forEach(bubble => {
                if (bubble && bubble.body) {
                    const isVisible = filteredIds.has(bubble.id);
                    const isCurrentlyInWorld = engineRef.current.world.bodies.includes(bubble.body);

                    if (isVisible && !isCurrentlyInWorld) {
                        // Добавляем пузырь в физический мир только если он проходит фильтрацию
                        Matter.World.add(engineRef.current.world, bubble.body);
                    }
                }
            });
        }
    }, [bubbles, getFilteredBubbles]);

    // Use the search hook only to determine which bubbles are found (not to filter)
    const {
        filteredItems: searchFoundBubbles,
        searchQuery: currentBubblesSearchQuery,
        setSearchQuery: setCurrentBubblesSearchQuery,
        debouncedSearchQuery: debouncedBubblesSearchQuery
    } = useSearch(getFilteredBubbles, tags);

    // Создаем Set ID найденных пузырей для быстрого поиска
    const foundBubblesIds = useMemo(() => {
        return new Set(searchFoundBubbles.map(bubble => bubble.id));
    }, [searchFoundBubbles]);

    // Синхронизируем состояние поиска
    React.useEffect(() => {
        setCurrentBubblesSearchQuery(bubblesSearchQuery);
    }, [bubblesSearchQuery, setCurrentBubblesSearchQuery]);

    // Filter bubbles visibility and highlight search results
    useEffect(() => {
        if (!engineRef.current) return;

        const filteredIds = new Set(getFilteredBubbles.map(b => b.id));

        bubbles.forEach(bubble => {
            if (bubble && bubble.body) {
                const isVisible = filteredIds.has(bubble.id);
                const isCurrentlyInWorld = engineRef.current.world.bodies.includes(bubble.body);
                const isFound = foundBubblesIds.has(bubble.id);
                const hasSearchQuery = debouncedBubblesSearchQuery && debouncedBubblesSearchQuery.trim();

                if (isVisible && !isCurrentlyInWorld) {
                    // Add bubble to physical world if it's visible and not already there
                    // Ensure body size matches logical radius (fix for restored bubbles after pop animation)
                    if (bubble.body && Math.abs(bubble.body.circleRadius - bubble.radius) > 0.5) {
                        const scale = bubble.radius / bubble.body.circleRadius;
                        Matter.Body.scale(bubble.body, scale, scale);
                    }
                    Matter.World.add(engineRef.current.world, bubble.body);

                    // Update styles for the bubble
                    bubble.body.render.opacity = hasSearchQuery ? (isFound ? 1 : 0.3) : 1;

                    // Обновляем обводку
                    if (hasSearchQuery && isFound) {
                        // Определяем цвет подсветки на основе тега
                        let highlightColor = '#B0B0B0'; // Серый цвет для пузырей без тегов
                        if (bubble.tagId) {
                            const tag = tags.find(t => t.id === bubble.tagId);
                            if (tag) {
                                highlightColor = tag.color;
                            }
                        }
                        bubble.body.render.strokeStyle = highlightColor;
                        bubble.body.render.lineWidth = theme.custom?.bubble?.highlightStrokeWidth ?? 2.5;
                        // Добавляем свечение цветом тега
                        bubble.body.render.shadowColor = highlightColor;
                        bubble.body.render.shadowBlur = 15;
                        bubble.body.render.shadowOffsetX = 0;
                        bubble.body.render.shadowOffsetY = 0;
                    } else {
                        // Возвращаем оригинальный цвет обводки
                        let originalStrokeColor = '#B0B0B0';
                        if (bubble.tagId) {
                            const tag = tags.find(t => t.id === bubble.tagId);
                            if (tag) {
                                originalStrokeColor = tag.color;
                            }
                        }
                        bubble.body.render.strokeStyle = originalStrokeColor;
                        bubble.body.render.lineWidth = theme.custom?.bubble?.strokeWidth ?? 1.5;
                        // Убираем свечение
                        bubble.body.render.shadowColor = 'transparent';
                        bubble.body.render.shadowBlur = 0;
                    }
                } else if (!isVisible && isCurrentlyInWorld) {
                    // Remove bubble from the physical world
                    Matter.World.remove(engineRef.current.world, bubble.body);
                } else if (isVisible && isCurrentlyInWorld) {
                    // Update styles for visible bubbles based on search
                    // Also normalize radius if it diverged from the stored one
                    if (bubble.body && Math.abs(bubble.body.circleRadius - bubble.radius) > 0.5) {
                        const scale = bubble.radius / bubble.body.circleRadius;
                        Matter.Body.scale(bubble.body, scale, scale);
                    }
                    bubble.body.render.opacity = hasSearchQuery ? (isFound ? 1 : 0.3) : 1;

                    // Обновляем стили для найденных пузырей
                    if (hasSearchQuery && isFound) {
                        // Определяем цвет подсветки на основе тега
                        let highlightColor = '#B0B0B0'; // Серый цвет для пузырей без тегов
                        if (bubble.tagId) {
                            const tag = tags.find(t => t.id === bubble.tagId);
                            if (tag) {
                                highlightColor = tag.color;
                            }
                        }
                        bubble.body.render.strokeStyle = highlightColor;
                        bubble.body.render.lineWidth = theme.custom?.bubble?.highlightStrokeWidth ?? 2.5;
                        // Добавляем свечение цветом тега
                        bubble.body.render.shadowColor = highlightColor;
                        bubble.body.render.shadowBlur = 15;
                        bubble.body.render.shadowOffsetX = 0;
                        bubble.body.render.shadowOffsetY = 0;
                    } else {
                        // Возвращаем оригинальный цвет обводки
                        let originalStrokeColor = '#B0B0B0';
                        if (bubble.tagId) {
                            const tag = tags.find(t => t.id === bubble.tagId);
                            if (tag) {
                                originalStrokeColor = tag.color;
                            }
                        }
                        bubble.body.render.strokeStyle = originalStrokeColor;
                        bubble.body.render.lineWidth = theme.custom?.bubble?.strokeWidth ?? 1.5;
                        // Убираем свечение
                        bubble.body.render.shadowColor = 'transparent';
                        bubble.body.render.shadowBlur = 0;
                    }
                }
            }
        });
    }, [getFilteredBubbles, bubbles, tags, foundBubblesIds, debouncedBubblesSearchQuery, theme]);



    // Bubble CRUD (createBubble/openCreateDialog/createNewBubble/handleSaveBubble/
    // handleDeleteBubble/handleMarkAsDone/handleCloseDialog/clearAllBubbles/
    // handleToggleEditUseRichText + the open-bubble deep-link listener) live in
    // useBubbleCrud (Task 5/6 of #38).

    // Function for filtering bubbles for list view (supports all statuses) - memoized
    const getFilteredBubblesForList = useMemo(() => {
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
    }, [bubbles, tags, listFilter, listFilterTags, listShowNoTag]);

    // Tag dialog/CRUD + color helpers live in useTags (Task 2/6 of #38).

    // Memoized functions for filter management
    const handleTagFilterChange = useCallback((tagId) => {
        setBubbleViewPlannedTasksOnly(false);
        localStorage.setItem(BUBBLES_PLANNED_TASKS_VIEW_LS_KEY, JSON.stringify(false));
        setFilterTags(prev => {
            const newFilterTags = prev.includes(tagId)
                ? prev.filter(id => id !== tagId)
                : [...prev, tagId];
            localStorage.setItem('bubbles-filter-tags', JSON.stringify(newFilterTags));
            return newFilterTags;
        });

        // Сбрасываем выбранную категорию при ручном изменении фильтров
        setSelectedCategory(null);
    }, []);

    const handleNoTagFilterChange = useCallback(() => {
        setBubbleViewPlannedTasksOnly(false);
        localStorage.setItem(BUBBLES_PLANNED_TASKS_VIEW_LS_KEY, JSON.stringify(false));
        setShowNoTag(prev => {
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
        const allTagIds = tags.map(tag => tag.id);
        setFilterTags(allTagIds);
        setShowNoTag(true);
        setSelectedCategory(null); // Сбрасываем выбранную категорию
        localStorage.setItem('bubbles-filter-tags', JSON.stringify(allTagIds));
        localStorage.setItem('bubbles-show-no-tag', JSON.stringify(true));
    }, [tags]);

    const isAllSelected = useCallback(() => {
        return tags.length > 0 && filterTags.length === tags.length && showNoTag;
    }, [tags, filterTags, showNoTag]);

    // Memoized functions for list filter management
    const handleListTagFilterChange = useCallback((tagId) => {
        setListFilterTags(prev => {
            const newListFilterTags = prev.includes(tagId)
                ? prev.filter(id => id !== tagId)
                : [...prev, tagId];
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
        return tags.length > 0 && listFilterTags.length === tags.length && listShowNoTag;
    }, [tags, listFilterTags, listShowNoTag]);

    // Memoized function to count bubbles by category for Bubbles View (always shows total count, regardless of filters)
    const getBubbleCountByTagForBubblesView = useCallback((tagId) => {
        // Всегда показываем общее количество пузырей для каждого тега, независимо от фильтров
        // Но учитываем поиск - если есть поиск, показываем только найденные пузыри
        const bubblesForCount = debouncedBubblesSearchQuery && debouncedBubblesSearchQuery.trim()
            ? searchFoundBubbles
            : bubbles.filter(bubble => bubble.status === BUBBLE_STATUS.ACTIVE); // Только активные пузыри

        if (tagId === null) {
            // Count bubbles without tags or with deleted tags
            return bubblesForCount.filter(bubble => {
                if (!bubble.tagId) return true;
                const tagExists = tags.find(t => t.id === bubble.tagId);
                return !tagExists; // Включаем пузыри с удаленными тегами
            }).length;
        }
        return bubblesForCount.filter(bubble => bubble.tagId === tagId).length;
    }, [bubbles, tags, searchFoundBubbles, debouncedBubblesSearchQuery]);

    // Function to count bubbles by category for List View (based on selected status and search) - memoized
    const getBubbleCountByTagForListView = useCallback((tagId) => {
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
        if (!listSearchQuery.trim()) {
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
    }, [bubbles, tags, listFilter, listSearchQuery]);

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
        localStorage.setItem('bubbles-font-size', newSize.toString());
    };

    // Функция для закрытия подсказок
    const handleCloseInstructions = () => {
        setShowInstructions(false);
        localStorage.setItem('bubbles-show-instructions', 'false');
    };

    const handleToggleMainView = () => {
        const next = mainView === 'tasks' ? 'bubbles' : 'tasks';
        setMainView(next);
        localStorage.setItem('bubbles-main-view', next);
    };

    const handleToggleBubbleBackground = () => {
        const newValue = !bubbleBackgroundEnabled;
        setBubbleBackgroundEnabled(newValue);
        localStorage.setItem('bubbles-background-enabled', newValue.toString());

        // Обновляем фон всех пузырей
        setBubbles(prev => {
            const updatedBubbles = prev.map(bubble => {
                const tagColor = bubble.tagId ? tags.find(t => t.id === bubble.tagId)?.color : null;
                bubble.body.render.fillStyle = getBubbleFillStyle(tagColor);
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

    // Export current data to JSON
    const handleExportJson = useCallback(() => {
        const pad = (n) => String(n).padStart(2, '0');
        const now = new Date();
        const filename = `todo-round-export-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}.json`;
        const data = {
            version: 1,
            exportedAt: now.toISOString(),
            bubbles: sanitizeBubblesForExport(bubbles),
            tags
        };
        exportJsonFile(data, filename);
    }, [bubbles, tags]);

    // Import data from JSON (replace existing)
    const handleImportJson = useCallback(async (data) => {
        try {
            const importedTags = Array.isArray(data?.tags)
                ? data.tags.map(sanitizeTag).filter(Boolean)
                : [];
            const importedBubbles = Array.isArray(data?.bubbles)
                ? data.bubbles.map(sanitizeBubble).filter(Boolean)
                : [];

            setTags(importedTags);
            await saveTagsToFirestore(importedTags);

            setBubbles(importedBubbles);
            await saveBubblesToFirestore(importedBubbles);

            // TODO: replace with proper React state + Matter.js reinit to avoid full page reload.
            // Imported bubbles are plain objects without Matter.js .body references; the physics
            // engine initialisation useEffect runs only once on mount, so a reload is required
            // to reattach physics bodies to the freshly imported bubbles.
            window.location.reload();
        } catch (e) {
            logger.error('Import JSON failed', e);
        }
    }, []);

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
        // eslint-disable-next-line
        // Intentional: setSelectedBubble/setEditDialog are stable useState setters; deepLinkHandledRef
        // is a ref — neither needs to be listed. bubbles is listed so the effect retries until loaded.
    }, [bubbles]);

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

            {/* Диалог редактирования */}
            <EditBubbleDialog
                open={editDialog}
                onClose={handleCloseDialog}
                t={t}
                isSmallScreen={isSmallScreen}
                isMobile={isMobile}
                themeMode={themeMode}
                getDialogPaperStyles={getDialogPaperStyles}
                initialTitle={selectedBubble?.title || ''}
                initialDescription={selectedBubble?.description || ''}
                editDueDate={editDueDate}
                setEditDueDate={setEditDueDate}
                isOverdue={isOverdue}
                notifDialogOpen={notifDialogOpen}
                setNotifDialogOpen={setNotifDialogOpen}
                notifValue={notifValue}
                setNotifValue={setNotifValue}
                editNotifications={editNotifications}
                setEditNotifications={setEditNotifications}
                handleDeleteNotification={handleDeleteNotification}
                tags={tags}
                selectedTagId={selectedTagId}
                setSelectedTagId={setSelectedTagId}
                editBubbleSize={editBubbleSize}
                setEditBubbleSize={setEditBubbleSize}
                handleDeleteBubble={handleDeleteBubble}
                handleMarkAsDone={handleMarkAsDone}
                handleSaveBubble={handleSaveBubble}
                onStopPulsing={async () => {
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
                }}
                showStopPulsing={(() => {
                    try {
                        if (!selectedBubble || selectedBubble.status !== BUBBLE_STATUS.ACTIVE) return false;

                        const rec = selectedBubble.recurrence;
                        const every = rec && typeof rec === 'object' ? Number(rec.every) : NaN;
                        if (!Number.isFinite(every) || every < 1) return false;

                        const now = Date.now();

                        // Проверяем наличие dueDate и просроченность
                        if (selectedBubble.dueDate) {
                            const parsedDue = parseLocalDateTime(selectedBubble.dueDate);
                            if (!parsedDue) return false;
                            const due = parsedDue.getTime();

                            // active notification window
                            if (Array.isArray(selectedBubble.notifications) && selectedBubble.notifications.length > 0) {
                                for (const notif of selectedBubble.notifications) {
                                    let offsetMs = 0;
                                    if (typeof notif === 'string') {
                                        const m = notif.match(/^(\d+)([mhdw])$/i);
                                        if (m) {
                                            const val = Number(m[1]);
                                            const u = m[2].toLowerCase();
                                            offsetMs = u === 'm' ? val * 60 * 1000 : u === 'h' ? val * 60 * 60 * 1000 : u === 'd' ? val * 24 * 60 * 60 * 1000 : val * 7 * 24 * 60 * 60 * 1000;
                                        }
                                    } else if (typeof notif === 'object') {
                                        const v = Number(notif.value);
                                        const unit = notif.unit;
                                        if (Number.isFinite(v) && v > 0) {
                                            offsetMs = unit === 'minutes' ? v * 60 * 1000 : unit === 'hours' ? v * 60 * 60 * 1000 : unit === 'days' ? v * 24 * 60 * 60 * 1000 : unit === 'weeks' ? v * 7 * 24 * 60 * 60 * 1000 : 0;
                                        }
                                    }
                                    const targetTime = due - offsetMs;
                                    if (Number.isFinite(targetTime) && now >= targetTime && now < due) return true;
                                }
                            }

                            if (now >= due) return true;
                        }

                        // Показываем кнопку Stop для задач с overdueSticky или в stickyPulseRef
                        if (selectedBubble.overdueSticky || stickyPulseRef.current.has(selectedBubble.id)) {
                            return true;
                        }

                        return false;
                    } catch (_) { return false; }
                })()}
                editRecurrence={editRecurrence}
                setEditRecurrence={handleSetEditRecurrence}
                useRichText={useRichTextEdit}
                onToggleUseRichText={handleToggleEditUseRichText}
            />
            {/* Меню управления тегами */}
            {/* Меню управления тегами */}
            <Menu
                anchorEl={tagMenuAnchor}
                open={Boolean(tagMenuAnchor)}
                onClose={() => setTagMenuAnchor(null)}
            >
                {tags.map(tag => (
                    <MenuItem key={tag.id} onClick={() => {
                        setTagMenuAnchor(null);
                        handleOpenTagDialog(tag);
                    }}>
                        <ListItemIcon>
                            <Box
                                sx={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: '50%',
                                    backgroundColor: tag.color,
                                    border: '1px solid #ccc'
                                }}
                            />
                        </ListItemIcon>
                        <ListItemText primary={tag.name} />
                        <IconButton
                            size="small"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTag(tag.id);
                                setTagMenuAnchor(null);
                            }}
                        >
                            <DeleteOutlined fontSize="small" />
                        </IconButton>
                    </MenuItem>
                ))}
            </Menu>

            {/* Диалог создания/редактирования тега */}
            <TagEditorDialog
                open={tagDialog}
                onClose={handleCloseTagDialog}
                isSmallScreen={isSmallScreen}
                isMobile={isMobile}
                colorPalette={COLOR_PALETTE}
                editingTag={editingTag}
                tagName={tagName}
                setTagName={setTagName}
                tagColor={tagColor}
                setTagColor={setTagColor}
                isColorAvailable={isColorAvailable}
                canCreateMoreTags={canCreateMoreTags}
                onSave={handleSaveTag}
            />

            {/* Левое главное меню */}
            <MainMenuDrawer
                open={menuDrawerOpen}
                onClose={() => setMenuDrawerOpen(false)}
                isMobile={isMobile}
                themeMode={themeMode}
                themeToggleProps={themeToggleProps}
                toggleTheme={toggleTheme}
                bubbleBackgroundEnabled={bubbleBackgroundEnabled}
                onToggleBubbleBackground={handleToggleBubbleBackground}
                mainView={mainView}
                onToggleMainView={handleToggleMainView}
                categoriesPanelEnabled={categoriesPanelEnabled}
                onToggleCategoriesPanel={handleToggleCategoriesPanel}
                onOpenCategoriesDialog={() => setCategoriesDialog(true)}
                onOpenFontSettingsDialog={() => setFontSettingsDialog(true)}
                onOpenAppearanceDialog={() => setAppearanceDialogOpen(true)}
                onOpenChangePasswordDialog={() => setChangePasswordOpen(true)}
                onOpenMindMap={onOpenMindMap}
                onAbout={() => setAboutOpen(true)}
                onLogout={handleLogout}
                onExportJson={handleExportJson}
                onImportJson={handleImportJson}
            />

            <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} t={t} />

            {/* Боковое меню фильтрации (вынесено в компонент) */}
            <TaskFilterDrawer
                open={filterDrawerOpen}
                onClose={() => setFilterDrawerOpen(false)}
                isMobile={isMobile}
                themeMode={themeMode}
                tags={tags}
                filterTags={filterTags}
                showNoTag={showNoTag}
                onToggleNoTag={handleNoTagFilterChange}
                onToggleTag={handleTagFilterChange}
                onSelectAll={selectAllFilters}
                onClearAll={clearAllFilters}
                isAllSelected={isAllSelected()}
                getBubbleCountByTagForBubblesView={getBubbleCountByTagForBubblesView}
            />

            {/* Диалог создания нового пузыря */}
            <CreateBubbleDialog
                open={createDialog}
                onClose={() => setCreateDialog(false)}
                t={t}
                isSmallScreen={isSmallScreen}
                isMobile={isMobile}
                themeMode={themeMode}
                getDialogPaperStyles={getDialogPaperStyles}
                dueDate={dueDate}
                setDueDate={setDueDate}
                isOverdue={isOverdue}
                notifDialogOpen={notifDialogOpen}
                setNotifDialogOpen={setNotifDialogOpen}
                notifValue={notifValue}
                setNotifValue={setNotifValue}
                createNotifications={createNotifications}
                setCreateNotifications={setCreateNotifications}
                createRecurrence={createRecurrence}
                setCreateRecurrence={handleSetCreateRecurrence}
                handleDeleteCreateNotification={handleDeleteCreateNotification}
                tags={tags}
                selectedTagId={selectedTagId}
                setSelectedTagId={setSelectedTagId}
                bubbleSize={bubbleSize}
                setBubbleSize={setBubbleSize}
                onCreate={createNewBubble}
                useRichText={useRichTextCreate}
                onToggleUseRichText={setUseRichTextCreate}
            />
            {/* Диалог управления категориями задач - вынесен в отдельный компонент с поддержкой DnD */}
            <TasksCategoriesDialog
                open={categoriesDialog}
                onClose={() => setCategoriesDialog(false)}
                tags={tags}
                deletingTags={deletingTags}
                canCreateMoreTags={canCreateMoreTags}
                onAddTag={() => {
                    if (canCreateMoreTags()) {
                        setCategoriesDialog(false);
                        handleOpenTagDialog();
                    }
                }}
                onEditTag={(tag) => {
                    setCategoriesDialog(false);
                    handleOpenTagDialog(tag);
                }}
                onDeleteTag={(tagId) => handleDeleteTag(tagId)}
                onUndoDeleteTag={(tagId) => handleUndoDeleteTag(tagId)}
                getBubbleCountByTag={getBubbleCountByTag}
                themeMode={themeMode}
                isMobile={isMobile}
                isSmallScreen={isSmallScreen}
                getDialogPaperStyles={getDialogPaperStyles}
                onReorderTags={(updated) => {
                    setTags(updated);
                    saveTagsToFirestore(updated);
                }}
            />

            {/* Диалог настроек шрифта */}
            <FontSettingsDialog
                open={fontSettingsDialog}
                onClose={() => setFontSettingsDialog(false)}
                isSmallScreen={isSmallScreen}
                isMobile={isMobile}
                themeMode={themeMode}
                getDialogPaperStyles={getDialogPaperStyles}
                fontSize={fontSize}
                onFontSizeChange={handleFontSizeChange}
                onReset={() => handleFontSizeChange(8)}
            />

            {/* Диалог оформления */}
            <AppearanceDialog
                open={appearanceDialogOpen}
                onClose={() => setAppearanceDialogOpen(false)}
                isSmallScreen={isSmallScreen}
                isMobile={isMobile}
                themeMode={themeModeState}
                setThemeMode={setThemeMode}
                design={design}
                setDesign={setDesign}
                designs={designs}
                getDialogPaperStyles={getDialogPaperStyles}
            />

            {/* Диалог смены пароля */}
            <ChangePasswordDialog
                open={changePasswordOpen}
                onClose={() => setChangePasswordOpen(false)}
                isSmallScreen={isSmallScreen}
                isMobile={isMobile}
                getDialogPaperStyles={getDialogPaperStyles}
            />

            {/* Диалог подтверждения выхода */}
            <LogoutConfirmDialog
                open={logoutDialog}
                onClose={() => setLogoutDialog(false)}
                isMobile={isMobile}
                getDialogPaperStyles={getDialogPaperStyles}
                onConfirm={confirmLogout}
            />

            {/* Боковая панель списка задач */}
            <TaskListDrawer
                open={listViewDialog}
                onClose={() => setListViewDialog(false)}
                isMobile={isMobile}
                themeMode={themeMode}
                bubbles={bubbles}
                setBubbles={setBubbles}
                tags={tags}
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
                setSelectedBubble={setSelectedBubble}
                setSelectedTagId={setSelectedTagId}
                setEditDialog={setEditDialog}
                handleListTagFilterChange={handleListTagFilterChange}
                handleListNoTagFilterChange={handleListNoTagFilterChange}
                clearAllListFilters={clearAllListFilters}
                selectAllListFilters={selectAllListFilters}
                getBubbleCountByTagForListView={getBubbleCountByTagForListView}
                isAllListFiltersSelected={isAllListFiltersSelected()}
                onOpenFilterMenu={() => setFilterDrawerOpen(true)}
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