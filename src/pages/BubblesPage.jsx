import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
    Box,
    Typography,
    Button,
    IconButton,
    useMediaQuery,
    useTheme,
    Fab,
    Tooltip,
    MenuItem,
    Menu,
    ListItemIcon,
    ListItemText,
    Paper,

} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
    CloseOutlined, DeleteOutlined, Add, FilterList, Menu as MenuIcon, ViewList, Refresh,
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
    clearBubblesFromFirestore,
    saveTagsToFirestore,
    upsertTagInFirestore,
    deleteTagFromFirestore,
    subscribeToTagsUpdates,
    subscribeToBubblesUpdates,
    BUBBLE_STATUS,
    markBubbleAsDeleted,
    getBubblesByStatus,
    cleanupOldDeletedBubbles,
    upsertBubble,
    updateBubbleFields,
    deleteBubbleDoc,
    buildStatusFields
} from '../services/firestoreService';

import TaskListDrawer from '../components/ListViewDrawer';
import TaskList from '../components/TaskList';
import ResponsiveSearch from '../components/ResponsiveSearch';
import TasksCategoriesPanel from '../components/TasksCategoriesPanel';
import MobileCategorySelector from '../components/MobileCategorySelector';
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
import { withAlpha } from '../utils/colorUtils';
import { formatLocalDateTime, getUserTimeZone, parseLocalDateTime, getOffsetMs } from '../utils/dateTime';
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

    // Predefined color palette
    // const COLOR_PALETTE = [
    //     '#FF6B6B', '#FF8E8E', '#FFA07A', '#FFD700', '#C5E063',
    //     '#98FB98', '#90EE90', '#20B2AA', '#7FFFD4', '#4682B4',
    //     '#87CEEB', '#6495ED', '#4169E1', '#6A5ACD', '#8A2BE2',
    //     '#DA70D6', '#C71585', '#FF69B4', '#696969', '#A9A9A9'
    // ];

    // My palette
    const COLOR_PALETTE = [
        '#da3833', '#ee603c', '#fd8b2b', '#e9be00', '#b7be00',
        '#7db44e', '#46a549', '#00a47a', '#34c09d', '#007771',
        '#00a5cf', '#0089b5', '#005ea4', '#6179cf', '#434d82',
        '#b14dd1', '#c04097', '#f25e6a', '#4d697e', '#86a49c'
    ];
    const canvasRef = useRef(null);
    const engineRef = useRef(null);
    const renderRef = useRef(null);
    const wallsRef = useRef([]);
    const [bubbles, setBubbles] = useState([]);
    const [selectedBubble, setSelectedBubble] = useState(null);
    const [editDialog, setEditDialog] = useState(false);
    // Live mirror of edit-dialog state for the Matter mount-effect subscription
    // (its closure captures editDialog/selectedBubble once and stays stale).
    const liveEditRef = useRef({ editDialog: false, selectedBubbleId: null });
    useEffect(() => {
        liveEditRef.current = { editDialog, selectedBubbleId: selectedBubble?.id ?? null };
    }, [editDialog, selectedBubble]);
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
    const [tags, setTags] = useState([]);
    const tagsRef = useRef(tags);
    useEffect(() => { tagsRef.current = tags; }, [tags]);
    const [selectedTagId, setSelectedTagId] = useState('');
    const [tagDialog, setTagDialog] = useState(false);
    const [tagName, setTagName] = useState('');
    const [tagColor, setTagColor] = useState('#2f6bdb');
    const [editingTag, setEditingTag] = useState(null);
    const [tagMenuAnchor, setTagMenuAnchor] = useState(null);

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

    const [createDialog, setCreateDialog] = useState(false); // Диалог создания нового пузыря
    const [filterDrawerOpen, setFilterDrawerOpen] = useState(false); // Состояние бокового меню фильтров
    const [menuDrawerOpen, setMenuDrawerOpen] = useState(false); // Состояние левого бокового меню
    // Режим редактора для создания и редактирования
    const [useRichTextCreate, setUseRichTextCreate] = useState(false);
    const [useRichTextEdit, setUseRichTextEdit] = useState(false);
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
    const [deletingTags, setDeletingTags] = useState(new Set()); // Теги в процессе удаления
    const [deleteTimers, setDeleteTimers] = useState(new Map()); // Таймеры удаления тегов
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

    // Состояние размера пузыря при создании
    const [bubbleSize, setBubbleSize] = useState(45); // Размер по умолчанию

    // Состояние размера пузыря при редактировании
    const [editBubbleSize, setEditBubbleSize] = useState(45); // Размер при редактировании

    const [dueDate, setDueDate] = useState(null); // Для создания
    const [editDueDate, setEditDueDate] = useState(null); // Для редактирования

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

    // Function to get canvas dimensions depending on screen size
    // Размер канваса вычисляется через утилиту, учитывая панель категорий
    const getCanvasSize = () => computeCanvasSize({ isMobile, categoriesPanelEnabled });



    // Refs for overdue/sticky pulse tracking — declared here so useMatterEngine can use them
    const stickyPulseRef = useRef(new Set()); // keep pulsing after repeat-every reschedule
    const lastDueRef = useRef(new Map());
    const manuallyStoppedPulsingRef = useRef(new Set()); // задачи, которые пользователь остановил вручную

    // Edit dialog notification/recurrence state — declared here so useMatterEngine can use them
    const [editNotifications, setEditNotifications] = useState([]); // для редактирования
    const [editRecurrence, setEditRecurrence] = useState(null);

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

    // Real-time tags synchronization (wait for auth user)
    useEffect(() => {
        if (!user) return;
        const unsubscribe = subscribeToTagsUpdates((updatedTags) => {
            // Ensure updatedTags is always an array
            const tagsArray = Array.isArray(updatedTags) ? updatedTags : [];
            setTags(tagsArray);

            // Update filter tags to remove deleted tags
            setFilterTags(currentFilterTags => {
                const existingTagIds = tagsArray.map(tag => tag.id);
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
                const existingTagIds = tagsArray.map(tag => tag.id);
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
                        const tag = tagsArray.find(t => t.id === bubble.tagId);
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
        });

        return () => unsubscribe();
    }, [user]);

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



    // Bubble creation function
    const createBubble = (x, y, radius, tagId = null) => {
        let strokeColor = '#B0B0B0'; // light gray color by default
        let tagColor = null;

        if (tagId) {
            const tag = tags.find(t => t.id === tagId);
            if (tag) {
                strokeColor = tag.color;
                tagColor = tag.color;
            }
        }

        const body = Matter.Bodies.circle(x, y, radius, {
            restitution: 0.8,
            frictionAir: 0.01,
            render: {
                fillStyle: getBubbleFillStyle(tagColor),
                strokeStyle: strokeColor,
                lineWidth: theme.custom?.bubble?.strokeWidth ?? 1.5
            }
        });

        return {
            id: Math.random().toString(36).substr(2, 9),
            body,
            radius,
            title: '',
            description: '',
            tagId,
            status: BUBBLE_STATUS.ACTIVE,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            deletedAt: null,
        };
    };

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

    // Function for opening create bubble dialog
    const openCreateDialog = () => {
        const categoryReserved = new Set(['all', 'no-tags', 'planned-tasks']);
        const tagFromPanel =
            selectedCategory &&
                !categoryReserved.has(selectedCategory) &&
                tags.some((t) => t.id === selectedCategory)
                ? selectedCategory
                : '';
        setSelectedTagId(tagFromPanel);
        setBubbleSize(45); // Сброс размера к значению по умолчанию
        setDueDate(null); // Сброс даты
        setCreateNotifications([]); // сброс уведомлений
        setUseRichTextCreate(false); // новая задача: по умолчанию обычный текст
        setCreateDialog(true);
    };

    // Function for creating a new bubble
    const createNewBubble = ({ title, description }) => {
        if (!engineRef.current || !renderRef.current || !title.trim()) {
            return;
        }

        const margin = isMobile ? 50 : 100;

        const newBubble = createBubble(
            Math.random() * (canvasSize.width - margin * 2) + margin,
            50,
            bubbleSize, // Используем выбранный размер
            selectedTagId || null
        );

        // Set title, description, dueDate, recurrence
        newBubble.title = title;
        newBubble.description = description;
        newBubble.dueDate = formatLocalDateTime(dueDate);
        newBubble.tz = getUserTimeZone();
        newBubble.notifications = createNotifications;
        newBubble.recurrence = createRecurrence;
        // persist editor mode per task
        newBubble.useRichText = !!useRichTextCreate;

        Matter.World.add(engineRef.current.world, newBubble.body);
        setBubbles(prev => [...prev, newBubble]);
        upsertBubble(newBubble).catch(e => logger.error('Error saving new bubble:', e));

        // Close dialog and reset form
        setCreateDialog(false);
        setSelectedTagId('');
        setDueDate(null);
    };

    // Save bubble changes
    const handleSaveBubble = ({ title, description }) => {
        if (!title.trim()) return;
        if (selectedBubble && engineRef.current) {
            // Сначала обновляем физическое тело
            const { Bodies } = Matter;

            // Определяем стили для тела
            let strokeColor = '#B0B0B0';
            let fillStyle = getBubbleFillStyle(null);

            if (selectedTagId) {
                const tag = tags.find(t => t.id === selectedTagId);
                if (tag) {
                    strokeColor = tag.color;
                    fillStyle = getBubbleFillStyle(tag.color);
                }
            }

            // Создаем новое тело с обновленными параметрами
            const newBody = Bodies.circle(
                selectedBubble.body.position.x,
                selectedBubble.body.position.y,
                editBubbleSize,
                {
                    restitution: 0.8,
                    frictionAir: 0.01,
                    render: {
                        fillStyle: fillStyle,
                        strokeStyle: strokeColor,
                        lineWidth: theme.custom?.bubble?.strokeWidth ?? 1.5
                    }
                }
            );

            // Удаляем старое тело и добавляем новое
            const worldBodies = engineRef.current.world.bodies;
            const bodyExists = worldBodies.some(body => body.id === selectedBubble.body.id);

            if (bodyExists) {
                Matter.World.remove(engineRef.current.world, selectedBubble.body);
            }
            Matter.World.add(engineRef.current.world, newBody);

            // Теперь обновляем состояние
            const newDueDate = formatLocalDateTime(editDueDate);

            // Проверяем, изменилась ли дата на будущую и нужно ли отключить пульсацию
            const shouldDisablePulsing = newDueDate &&
                parseLocalDateTime(newDueDate) > new Date();

            // Отключаем пульсацию при удалении даты
            const shouldDisablePulsingOnDelete = !newDueDate && selectedBubble.dueDate;

            // Дата изменилась на будущую или удалена — начинаем новый цикл:
            // сбрасываем и in-memory флаг, и персистентный overduePulseSuppressed.
            const dateChanged = shouldDisablePulsing || shouldDisablePulsingOnDelete;
            if (dateChanged) {
                manuallyStoppedPulsingRef.current.delete(selectedBubble.id);
            }

            const updatedBubble = {
                ...selectedBubble,
                title,
                description,
                tagId: selectedTagId || null,
                radius: editBubbleSize,
                body: newBody,
                updatedAt: new Date().toISOString(),
                dueDate: newDueDate,
                tz: getUserTimeZone(),
                notifications: editNotifications,
                recurrence: editRecurrence,
                overdueSticky: dateChanged ? false : selectedBubble.overdueSticky,
                overdueAt: dateChanged ? null : selectedBubble.overdueAt,
                overduePulseSuppressed: dateChanged ? false : selectedBubble.overduePulseSuppressed
            };

            setBubbles(prev => prev.map(b => (b.id === selectedBubble.id ? updatedBubble : b)));
            upsertBubble(updatedBubble).catch(e => logger.error('Error saving bubble edit:', e));
        }

        setEditDialog(false);
        setSelectedBubble(null);
        setEditDueDate(null);
        // Не сбрасываем размер - он будет установлен при следующем открытии диалога
    };

    // Delete bubble (mark as deleted)
    const handleDeleteBubble = async () => {
        if (selectedBubble && engineRef.current) {
            try {
                // Remove from Matter.js world
                Matter.World.remove(engineRef.current.world, selectedBubble.body);

                // Mark as deleted in Firestore
                const updatedBubbles = await markBubbleAsDeleted(selectedBubble.id, bubbles);
                setBubbles(updatedBubbles);
            } catch (error) {
                logger.error('Error deleting bubble:', error);
            }
        }
        setEditDialog(false);
        setSelectedBubble(null);
        // Не сбрасываем размер - он будет установлен при следующем открытии диалога
    };

    // Mark bubble as done
    const handleMarkAsDone = async () => {
        if (selectedBubble && engineRef.current) {
            try {
                // Анимация лопания с брызгами и звуком
                const bubble = selectedBubble;
                const body = bubble.body;
                // Воспроизвести звук лопанья
                try {
                    const popAudio = new window.Audio(`${import.meta.env.BASE_URL}pop.mp3`);
                    popAudio.currentTime = 0;
                    popAudio.play();
                } catch (e) { /* ignore */ }
                if (body) {
                    // Быстрое увеличение радиуса и исчезновение
                    let frame = 0;
                    const totalFrames = 15;
                    const initialRadius = body.circleRadius;
                    const maxRadius = initialRadius * 2.2;
                    const initialOpacity = body.render.opacity !== undefined ? body.render.opacity : 1;
                    const center = { x: body.position.x, y: body.position.y };
                    const splashParticles = [];
                    const splashCount = 12;
                    // Цвет брызг совпадает с цветом тега, если есть тег, иначе красный
                    let splashColor = 'rgba(255,0,0,0.7)';
                    if (bubble.tagId) {
                        const tag = tags.find(t => t.id === bubble.tagId);
                        if (tag) {
                            // Преобразуем hex в rgba
                            const hex = tag.color;
                            const rgb = hex.length === 7
                                ? [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]
                                : [255, 0, 0];
                            splashColor = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.7)`;
                        }
                    }
                    const splashMinSpeed = 6;
                    const splashMaxSpeed = 11;
                    const splashRadius = Math.max(3, Math.min(7, Math.round(initialRadius * 0.18)));

                    // Создать брызги
                    for (let i = 0; i < splashCount; i++) {
                        const angle = (2 * Math.PI * i) / splashCount + Math.random() * 0.2;
                        const speed = splashMinSpeed + Math.random() * (splashMaxSpeed - splashMinSpeed);
                        const vx = Math.cos(angle) * speed;
                        const vy = Math.sin(angle) * speed;
                        const particle = Matter.Bodies.circle(center.x, center.y, splashRadius, {
                            isSensor: true,
                            render: {
                                fillStyle: splashColor,
                                strokeStyle: splashColor,
                                opacity: 1,
                                lineWidth: 0
                            }
                        });
                        Matter.Body.setVelocity(particle, { x: vx, y: vy });
                        splashParticles.push(particle);
                    }
                    Matter.World.add(engineRef.current.world, splashParticles);

                    // Анимация пузыря
                    const animatePop = () => {
                        frame++;
                        // Увеличиваем радиус
                        const newRadius = initialRadius + (maxRadius - initialRadius) * (frame / totalFrames);
                        const scale = newRadius / body.circleRadius;
                        Matter.Body.scale(body, scale, scale);
                        // Уменьшаем прозрачность
                        body.render.opacity = initialOpacity * (1 - frame / totalFrames);
                        // Анимация брызг: fade out
                        splashParticles.forEach(p => {
                            if (p.render) {
                                p.render.opacity = 1 - frame / totalFrames;
                            }
                        });
                        if (frame < totalFrames) {
                            requestAnimationFrame(animatePop);
                        } else {
                            // После анимации удаляем из мира пузырь и брызги
                            Matter.World.remove(engineRef.current.world, body);
                            Matter.World.remove(engineRef.current.world, splashParticles);
                            // Обновляем статус в Firestore
                            const fields = buildStatusFields(selectedBubble, BUBBLE_STATUS.DONE);
                            updateBubbleFields(selectedBubble.id, fields)
                                .then(() => {
                                    setBubbles(prev => prev.map(b => b.id === selectedBubble.id ? { ...b, ...fields } : b));
                                })
                                .catch(e => logger.error('Error marking bubble as done:', e));
                        }
                    };
                    animatePop();
                } else {
                    // Если нет тела, просто удаляем
                    Matter.World.remove(engineRef.current.world, selectedBubble.body);
                    const fields = buildStatusFields(selectedBubble, BUBBLE_STATUS.DONE);
                    await updateBubbleFields(selectedBubble.id, fields);
                    setBubbles(prev => prev.map(b => b.id === selectedBubble.id ? { ...b, ...fields } : b));
                }
            } catch (error) {
                logger.error('Error marking bubble as done:', error);
            }
        }
        setEditDialog(false);
        setSelectedBubble(null);
        // Не сбрасываем размер - он будет установлен при следующем открытии диалога
    };

    // Close dialog without saving
    const handleCloseDialog = () => {
        setEditDialog(false);
        setSelectedBubble(null);
        setSelectedTagId('');
        // Не сбрасываем размер - он будет установлен при следующем открытии диалога
    };

    // Clear all bubbles
    const clearAllBubbles = () => {
        if (engineRef.current) {
            // Remove all bubbles from the physics world
            bubbles.forEach(bubble => {
                Matter.World.remove(engineRef.current.world, bubble.body);
            });

            // Clear state and Firestore
            setBubbles([]);
            clearBubblesFromFirestore();
        }
    };

    // Functions for working with tags
    const handleOpenTagDialog = (tag = null) => {
        if (tag) {
            setEditingTag(tag);
            setTagName(tag.name);
            setTagColor(tag.color);
        } else {
            if (!canCreateMoreTags()) {
                return; // Не открываем диалог, если нет доступных цветов
            }
            setEditingTag(null);
            setTagName('');
            setTagColor(getNextAvailableColor() || '#2f6bdb');
        }
        setTagDialog(true);
    };

    const handleSaveTag = () => {
        // Проверяем, что цвет доступен (если это новый тег или изменился цвет)
        if (!editingTag && !isColorAvailable(tagColor)) {
            return; // Цвет уже занят
        }

        if (editingTag && editingTag.color !== tagColor && !isColorAvailable(tagColor)) {
            return; // Цвет уже занят при редактировании
        }

        const newTag = {
            id: editingTag ? editingTag.id : Math.random().toString(36).substr(2, 9),
            name: tagName.trim(),
            color: tagColor
        };

        let updatedTags;
        if (editingTag) {
            updatedTags = tags.map(tag => tag.id === editingTag.id ? newTag : tag);
        } else {
            updatedTags = [...tags, newTag];
        }

        setTags(updatedTags);
        // Transactional single-tag write: avoids clobbering concurrent tag edits
        // from another device. onSnapshot reconciles local state afterwards.
        upsertTagInFirestore(newTag).catch(e => logger.error('Error saving tag:', e));

        // Автоматически активируем новый тег в фильтрах (только для создания, не для редактирования)
        if (!editingTag) {
            // Активируем в фильтрах Bubbles View
            setFilterTags(prev => {
                const newFilterTags = [...prev, newTag.id];
                localStorage.setItem('bubbles-filter-tags', JSON.stringify(newFilterTags));
                return newFilterTags;
            });

            // Активируем в фильтрах List View
            setListFilterTags(prev => {
                const newListFilterTags = [...prev, newTag.id];
                localStorage.setItem('bubbles-list-filter-tags', JSON.stringify(newListFilterTags));
                return newListFilterTags;
            });
        }

        setTagDialog(false);
        setEditingTag(null);
        setTagName('');
        setTagColor(getNextAvailableColor() || '#2f6bdb');

        // Открываем обратно диалог категорий (и для создания, и для редактирования)
        setTimeout(() => {
            setCategoriesDialog(true);
        }, 100);
    };

    const handleDeleteTag = (tagId) => {
        // Добавляем тег в состояние удаления
        setDeletingTags(prev => new Set([...prev, tagId]));

        // Создаем таймер и сохраняем его
        const timer = setTimeout(() => {
            setDeletingTags(prev => {
                const newSet = new Set(prev);
                newSet.delete(tagId);
                return newSet;
            });

            const updatedTags = tagsRef.current.filter(tag => tag.id !== tagId);
            setTags(updatedTags);
            // Transactional single-tag delete: reads fresh server state so a tag
            // added/edited on another device is not overwritten by a stale array.
            deleteTagFromFirestore(tagId).catch(e => logger.error('Error deleting tag:', e));

            // Удаляем ссылки на этот тег из пузырей
            const affectedIds = new Set();
            setBubbles(prev => prev.map(bubble => {
                if (bubble.tagId === tagId) {
                    affectedIds.add(bubble.id);
                    // Сбрасываем цвет пузыря на светло-серый и обновляем fillStyle
                    bubble.body.render.strokeStyle = '#B0B0B0';
                    bubble.body.render.fillStyle = getBubbleFillStyle(null);
                    return { ...bubble, tagId: null };
                }
                return bubble;
            }));
            affectedIds.forEach(id =>
                updateBubbleFields(id, { tagId: null }).catch(e => logger.error('Error clearing tag from bubble:', e))
            );

            // Удаляем таймер из Map
            setDeleteTimers(prev => {
                const newMap = new Map(prev);
                newMap.delete(tagId);
                return newMap;
            });
        }, 7000);

        // Сохраняем таймер
        setDeleteTimers(prev => new Map(prev).set(tagId, timer));
    };

    const handleCloseTagDialog = () => {
        setTagDialog(false);
        setEditingTag(null);
        setTagName('');
        setTagColor(getNextAvailableColor() || '#2f6bdb');

        // Открываем обратно диалог категорий при отмене
        setTimeout(() => {
            setCategoriesDialog(true);
        }, 100);
    };

    const handleUndoDeleteTag = (tagId) => {
        // Очищаем таймер удаления
        const timer = deleteTimers.get(tagId);
        if (timer) {
            clearTimeout(timer);
            setDeleteTimers(prev => {
                const newMap = new Map(prev);
                newMap.delete(tagId);
                return newMap;
            });
        }

        // Убираем тег из состояния удаления
        setDeletingTags(prev => {
            const newSet = new Set(prev);
            newSet.delete(tagId);
            return newSet;
        });
    };

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

    // Function to count all bubbles by category (for category management dialog)
    const getBubbleCountByTag = (tagId) => {
        if (tagId === null) {
            // Count bubbles without tags or with deleted tags
            return bubbles.filter(bubble => {
                if (!bubble.tagId) return true;
                const tagExists = tags.find(t => t.id === bubble.tagId);
                return !tagExists; // Включаем пузыри с удаленными тегами
            }).length;
        }
        return bubbles.filter(bubble => bubble.tagId === tagId).length;
    };

    // Функции для работы с цветами
    const getUsedColors = () => {
        return tags.map(tag => tag.color);
    };

    const getAvailableColors = () => {
        const usedColors = getUsedColors();
        return COLOR_PALETTE.filter(color => !usedColors.includes(color));
    };

    const getNextAvailableColor = () => {
        const availableColors = getAvailableColors();
        return availableColors.length > 0 ? availableColors[0] : null;
    };

    const isColorAvailable = (color) => {
        const usedColors = getUsedColors();
        // Если редактируем тег, его текущий цвет всегда доступен
        if (editingTag && editingTag.color === color) {
            return true;
        }
        return !usedColors.includes(color);
    };

    const canCreateMoreTags = () => {
        return getAvailableColors().length > 0;
    };

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

    // Функция для проверки просроченности due date
    const isOverdue = (dueDate) => {
        if (!dueDate) return false;
        const parsed = parseLocalDateTime(dueDate);
        return parsed ? parsed < new Date() : false;
    };

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

    const notifiedBubblesRef = useRef(new Set());
    const notifiedBubbleNotificationsRef = useRef(new Set()); // bubbleId:idx

    // Keep pulsing even if editor opened; stop only by explicit Stop button

    // --- Пульсация для просроченных задач и уведомлений ---
    useEffect(() => {
        if (!engineRef.current) return;

        let animationFrame;
        let pulsePhase = 0;

        // Temporarily disabled local notifications to test FCM only
        // const showNotificationAndVibrate = (bubble) => {
        //     // if (navigator.vibrate) {
        //     //     navigator.vibrate([200, 100, 200]);
        //     // }
        //     if (typeof window !== 'undefined' && 'Notification' in window) {
        //         try {
        //             console.log('[NOTIFY] Notification.permission:', Notification.permission);
        //             if ('serviceWorker' in navigator) {
        //                 navigator.serviceWorker.getRegistrations().then(regs => {
        //                     console.log('[NOTIFY] ServiceWorker registrations:', regs);
        //                 });
        //             }
        //             const title = t('bubbles.overdueNotificationTitle');
        //             let body = '';
        //             if (bubble.title) {
        //                 body = t('bubbles.overdueNotificationBodyWithTitle', { title: bubble.title });
        //             } else {
        //                 body = t('bubbles.overdueNotificationBody');
        //             }
        //             if (Notification.permission === "granted") {
        //                 try {
        //                     if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
        //                         console.log('[NOTIFY] Trying to show notification via ServiceWorker:', title, body);
        //                         navigator.serviceWorker.ready.then(function (registration) {
        //                             registration.showNotification(title, { body })
        //                                 .then(() => console.log('[NOTIFY] showNotification success'))
        //                                 .catch(e => console.error('[NOTIFY] showNotification error:', e));
        //                         }).catch(e => console.error('[NOTIFY] navigator.serviceWorker.ready error:', e));
        //                     } else {
        //                         console.warn('[NOTIFY] ServiceWorker not supported');
        //                     }
        //                 } catch (e) {
        //                     console.error('[NOTIFY] Exception in showNotification:', e);
        //                 }
        //             } else if (Notification.permission !== "denied") {
        //                 console.log('[NOTIFY] Requesting notification permission...');
        //                 Notification.requestPermission().then(permission => {
        //                     console.log('[NOTIFY] Permission result:', permission);
        //                     if (permission === "granted") {
        //                         try {
        //                             if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
        //                                 console.log('[NOTIFY] Trying to show notification via ServiceWorker (after permission):', title, body);
        //                                 navigator.serviceWorker.ready.then(function (registration) {
        //                                     registration.showNotification(title, { body })
        //                                         .then(() => console.log('[NOTIFY] showNotification success'))
        //                                         .catch(e => console.error('[NOTIFY] showNotification error:', e));
        //                                 }).catch(e => console.error('[NOTIFY] navigator.serviceWorker.ready error:', e));
        //                             } else {
        //                                 console.warn('[NOTIFY] ServiceWorker not supported');
        //                             }
        //                         } catch (e) {
        //                             console.error('[NOTIFY] Exception in showNotification (after permission):', e);
        //                         }
        //                     }
        //                 }).catch(e => console.error('[NOTIFY] requestPermission error:', e));
        //             }
        //         } catch (e) {
        //             console.error('[NOTIFY] Outer catch:', e);
        //         }
        //     }
        // };

        const animate = () => {
            const now = Date.now();
            pulsePhase += 0.12;
            bubbles.forEach(bubble => {
                if (!bubble.body || bubble.status !== BUBBLE_STATUS.ACTIVE || !bubble.dueDate) return;
                const parsedDue = parseLocalDateTime(bubble.dueDate);
                if (!parsedDue) return;
                const due = parsedDue.getTime();

                // Если открыт редактор этой бульбашки и включён Repeat — не мерцать
                if (editDialog && selectedBubble && selectedBubble.id === bubble.id && bubble.recurrence) {
                    if (Math.abs(bubble.body.circleRadius - bubble.radius) > 0.5) {
                        const scale = bubble.radius / bubble.body.circleRadius;
                        Matter.Body.scale(bubble.body, scale, scale);
                    }
                    const tagColor = bubble.tagId ? tags.find(t => t.id === bubble.tagId)?.color : null;
                    bubble.body.render.fillStyle = getBubbleFillStyle(tagColor);
                    return;
                }
                // 0. Пользователь остановил пульсацию вручную — не мерцать,
                // пока не изменится/не перенесётся dueDate (флаг сбрасывается отдельно).
                if (bubble.overduePulseSuppressed || manuallyStoppedPulsingRef.current.has(bubble.id)) {
                    if (Math.abs(bubble.body.circleRadius - bubble.radius) > 0.5) {
                        const scale = bubble.radius / bubble.body.circleRadius;
                        Matter.Body.scale(bubble.body, scale, scale);
                    }
                    const tagColor = bubble.tagId ? tags.find(t => t.id === bubble.tagId)?.color : null;
                    bubble.body.render.fillStyle = getBubbleFillStyle(tagColor);
                    return;
                }
                // 1. Найти ближайшее сработавшее уведомление, которое не удалено
                let activeNotifIdx = null;
                let activeNotifTargetTime = null;
                if (Array.isArray(bubble.notifications) && bubble.notifications.length > 0) {
                    // Сортируем по времени срабатывания (от ближайшего к дальнему)
                    const notifWithTime = bubble.notifications.map((notif, idx) => {
                        const offset = getOffsetMs(notif);
                        return { idx, targetTime: due - offset, notif };
                    }).sort((a, b) => a.targetTime - b.targetTime);
                    for (const { idx, targetTime } of notifWithTime) {
                        if (now >= targetTime && now < due) {
                            activeNotifIdx = idx;
                            activeNotifTargetTime = targetTime;
                            break;
                        }
                    }
                }
                // 2. Если есть активное уведомление — пульсируем только по нему
                if (activeNotifIdx !== null) {
                    const key = `${bubble.id}:${activeNotifTargetTime}`;
                    if (!notifiedBubbleNotificationsRef.current.has(key)) {
                        // showNotificationAndVibrate(bubble); // disabled for FCM testing
                        notifiedBubbleNotificationsRef.current.add(key);
                    }
                    // Пульсация
                    const baseRadius = bubble.radius;
                    const pulse = 1 + 0.13 * Math.sin(pulsePhase + bubble.body.id % 10);
                    const newRadius = baseRadius * pulse;
                    const currentRadius = bubble.body.circleRadius;
                    const scale = newRadius / currentRadius;
                    if (Math.abs(scale - 1) > 0.01) {
                        Matter.Body.scale(bubble.body, scale, scale);
                    }
                    const pulseValue = Math.abs(Math.sin(pulsePhase + bubble.body.id % 10));
                    if (pulseValue > 0.7) {
                        bubble.body.render.fillStyle = 'rgba(255,0,0,0.5)';
                    } else {
                        const tagColor = bubble.tagId ? tags.find(t => t.id === bubble.tagId)?.color : null;
                        bubble.body.render.fillStyle = getBubbleFillStyle(tagColor);
                    }
                    return; // не пульсируем по dueDate, если есть активное уведомление
                }
                // 3. Если нет активных уведомлений, но dueDate просрочен — пульсация по dueDate
                const shouldPulseOverdue = now >= due || stickyPulseRef.current.has(bubble.id);
                if (shouldPulseOverdue || bubble.overdueSticky) {
                    if (!notifiedBubblesRef.current.has(bubble.id)) {
                        // showNotificationAndVibrate(bubble); // disabled for FCM testing
                        notifiedBubblesRef.current.add(bubble.id);
                    }
                    const baseRadius = bubble.radius;
                    const pulse = 1 + 0.13 * Math.sin(pulsePhase + bubble.body.id % 10);
                    const newRadius = baseRadius * pulse;
                    const currentRadius = bubble.body.circleRadius;
                    const scale = newRadius / currentRadius;
                    if (Math.abs(scale - 1) > 0.01) {
                        Matter.Body.scale(bubble.body, scale, scale);
                    }
                    const pulseValue = Math.abs(Math.sin(pulsePhase + bubble.body.id % 10));
                    if (pulseValue > 0.7) {
                        bubble.body.render.fillStyle = 'rgba(255,0,0,0.5)';
                    } else {
                        const tagColor = bubble.tagId ? tags.find(t => t.id === bubble.tagId)?.color : null;
                        bubble.body.render.fillStyle = getBubbleFillStyle(tagColor);
                    }
                } else if (bubble.body && Math.abs(bubble.body.circleRadius - bubble.radius) > 0.5) {
                    // Сбросить радиус, если не пульсируем
                    const scale = bubble.radius / bubble.body.circleRadius;
                    Matter.Body.scale(bubble.body, scale, scale);
                    const tagColor = bubble.tagId ? tags.find(t => t.id === bubble.tagId)?.color : null;
                    bubble.body.render.fillStyle = getBubbleFillStyle(tagColor);
                }
            });
            animationFrame = requestAnimationFrame(animate);
        };
        animate();
        return () => cancelAnimationFrame(animationFrame);
    }, [bubbles, tags, getBubbleFillStyle, t, i18n.language]);

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

    const handleToggleEditUseRichText = (enabled) => {
        setUseRichTextEdit(!!enabled);
        if (!selectedBubble) return;
        // Обновляем выбранный пузырь и сохраняем в БД
        setSelectedBubble(prev => prev ? { ...prev, useRichText: !!enabled } : prev);
        const fields = { useRichText: !!enabled, updatedAt: new Date().toISOString() };
        setBubbles(prev => prev.map(b => b.id === selectedBubble.id ? { ...b, ...fields } : b));
        updateBubbleFields(selectedBubble.id, fields).catch(e => logger.error('Error toggling rich text:', e));
    };

    // Сброс уведомлений при смене языка
    useEffect(() => {
        notifiedBubblesRef.current = new Set();
    }, [i18n.language]);

    // Состояния для диалога уведомлений
    const [notifDialogOpen, setNotifDialogOpen] = useState(false);
    const [notifValue, setNotifValue] = useState(null);
    const [aboutOpen, setAboutOpen] = useState(false);

    // Внутри компонента:
    const [createNotifications, setCreateNotifications] = useState([]); // для создания
    const [createRecurrence, setCreateRecurrence] = useState(null); // { every, unit }

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

    // Открытие конкретного бабла по deep-link событию из index.js
    useEffect(() => {
        function handleOpenBubble(e) {
            const bubbleId = e?.detail?.bubbleId;
            if (!bubbleId) return;
            const found = bubbles.find(b => String(b.id) === String(bubbleId));
            if (found) {
                setSelectedBubble(found);
                setEditDialog(true);
            }
        }
        window.addEventListener('open-bubble', handleOpenBubble);
        return () => window.removeEventListener('open-bubble', handleOpenBubble);
        // eslint-disable-next-line
        // Intentional: setSelectedBubble/setEditDialog are stable useState setters and do not
        // need to be listed. bubbles is in the array so the handler always sees the latest list.
    }, [bubbles]);

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
            {mainView === 'bubbles' && (!isMobile ? (
                <>
                    <Box sx={{
                        position: 'absolute',
                        top: 20,
                        left: (!isMobile && categoriesPanelEnabled) ? 20 : 20,
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        transition: 'left 0.3s ease'
                    }}>
                        <IconButton
                            onClick={() => setMenuDrawerOpen(true)}
                            sx={{
                                ...getButtonStyles(),
                                marginRight: 1
                            }}
                        >
                            <MenuIcon />
                        </IconButton>
                        <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1
                        }}>
                            <img
                                src={`${import.meta.env.BASE_URL}bubbles.png`}
                                alt="Bubbles"
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    objectFit: 'contain'
                                }}
                            />
                            {/* <Typography variant="h4" sx={{
                                color: themeMode === 'light' ? '#2C3E50' : 'white',
                                fontWeight: 'bold'
                            }}>
                                {t('bubbles.title')}
                            </Typography> */}
                        </Box>
                        <Button
                            variant="contained"
                            onClick={openCreateDialog}
                            startIcon={<Add />}
                            sx={{ height: 36 }}
                        >
                            {t('bubbles.addBubble')}
                        </Button>
                        {/* <Button
                            variant="contained"
                            onClick={openCreateDialog}
                            sx={{
                                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                '&:hover': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.3)'
                                }
                            }}
                        >
                            {t('bubbles.addBubble')}
                        </Button> */}
                    </Box>
                </>
            ) : (
                // Mobile version without category selector
                <Box sx={{
                    position: 'absolute',
                    top: 10,
                    left: 0,
                    right: 0,
                    zIndex: 1000,
                    display: 'flex',
                    justifyContent: 'flex-start',
                    alignItems: 'center',
                    padding: '0 10px',
                    gap: 1
                }}>
                    <IconButton
                        onClick={() => setMenuDrawerOpen(true)}
                        sx={getButtonStyles()}
                    >
                        <MenuIcon />
                    </IconButton>
                    <Tooltip title={t('bubbles.reload')}>
                        <IconButton
                            onClick={() => window.location.reload()}
                            sx={{ ...getButtonStyles(), ml: 1 }}
                        >
                            <Refresh />
                        </IconButton>
                    </Tooltip>
                </Box>
            ))}



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
                <>
                    <Box
                        ref={fabRef}
                        onPointerDown={onFabPointerDown}
                        sx={{
                            position: 'fixed',
                            left: (fabPosition?.x ?? getDefaultFabPosition().x),
                            top: (fabPosition?.y ?? getDefaultFabPosition().y),
                            zIndex: 1000,
                            cursor: isDraggingFab ? 'grabbing' : 'grab',
                            touchAction: 'none',
                        }}
                    >
                        <Tooltip title={t('bubbles.addBubble')}>
                            <Fab
                                color="primary"
                                onClick={(e) => {
                                    if (suppressNextClickRef.current) {
                                        suppressNextClickRef.current = false;
                                        e.preventDefault();
                                        e.stopPropagation();
                                        return;
                                    }
                                    openCreateDialog();
                                }}
                            >
                                <Add />
                            </Fab>
                        </Tooltip>
                    </Box>
                    {/* <Tooltip title={t('bubbles.clearAll')}>
                        <Fab
                            color="secondary"
                            onClick={clearAllBubbles}
                            size="medium"
                            sx={{
                                position: 'absolute',
                                bottom: 100, // Увеличен отступ для навигационной панели
                                left: 20,
                                zIndex: 1000,
                                backgroundColor: 'rgba(255, 87, 87, 0.9)',
                                '&:hover': {
                                    backgroundColor: 'rgba(255, 87, 87, 1)'
                                }
                            }}
                        >
                            <Clear />
                        </Fab>
                    </Tooltip> */}

                </>
            )}

            {/* Селектор языка и инструкции */}
            {mainView === 'bubbles' && (!isMobile ? (
                <Box sx={{
                    position: 'absolute',
                    top: 20,
                    right: 20,
                    zIndex: 1000,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    alignItems: 'flex-end'
                }}>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                        <Tooltip title={t('bubbles.searchPlaceholder')} placement="bottom">
                            <Box sx={{ display: 'inline-flex' }}>
                                <ResponsiveSearch
                                    searchQuery={bubblesSearchQuery}
                                    setSearchQuery={setBubblesSearchQuery}
                                    themeMode={themeMode}
                                    placement="desktop"
                                    showInstructions={showInstructions}
                                    resultsCount={t('bubbles.searchResults', { count: searchFoundBubbles.length })}
                                    showResultsCount
                                    categoriesPanelEnabled={categoriesPanelEnabled}
                                />
                            </Box>
                        </Tooltip>

                        {/* View Mode Toggle */}
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            {/* Иконка поиска теперь инкапсулирована внутри ResponsiveSearch */}
                            <Tooltip title={t('bubbles.listView')} placement="bottom">
                                <span>
                                    <Button
                                        onClick={() => setListViewDialog(true)}
                                        variant="outlined"
                                        size="small"
                                        startIcon={<ViewList />}
                                        sx={{
                                            ...getOutlinedButtonStyles(),
                                            height: 36
                                        }}
                                    >
                                        {t('bubbles.listView')}
                                    </Button>
                                </span>
                            </Tooltip>
                            <Tooltip
                                title={categoriesPanelEnabled ? t('bubbles.filterDisabled') : t('bubbles.filterButton')}
                                placement="top"
                            >
                                <span>
                                    <Button
                                        onClick={() => {
                                            if (!categoriesPanelEnabled) {
                                                setFilterDrawerOpen(true);
                                            }
                                        }}
                                        variant="outlined"
                                        size="small"
                                        startIcon={<FilterList />}
                                        disabled={categoriesPanelEnabled}
                                        sx={{
                                            ...getOutlinedButtonStyles(),
                                            height: 36,
                                            backgroundColor: alpha(
                                                theme.palette.primary.main,
                                                !isAllSelected()
                                                    ? (themeMode === 'light' ? 0.15 : 0.2)
                                                    : (themeMode === 'light' ? 0.08 : 0)
                                            ),
                                            opacity: categoriesPanelEnabled ? 0.5 : 1,
                                            '&:disabled': {
                                                backgroundColor: theme.palette.action.disabledBackground,
                                                color: theme.palette.action.disabled
                                            }
                                        }}
                                    >
                                        {t('bubbles.filterButton')}
                                    </Button>
                                </span>
                            </Tooltip>
                        </Box>



                    </Box>
                    {/* Оверлей поиска для узких/мобильных в компоненте ResponsiveSearch не нужен отдельно */}

                    {showInstructions && (
                        <Box sx={{
                            backgroundColor: 'rgba(0, 0, 0, 0.3)',
                            padding: 2,
                            borderRadius: 2,
                            position: 'relative'
                        }}>
                            <IconButton
                                onClick={handleCloseInstructions}
                                sx={{
                                    position: 'absolute',
                                    top: 4,
                                    right: 4,
                                    color: 'white',
                                    padding: 0.5,
                                    '&:hover': {
                                        backgroundColor: 'rgba(255, 255, 255, 0.1)'
                                    }
                                }}
                                size="small"
                            >
                                <CloseOutlined fontSize="small" />
                            </IconButton>
                            <Typography variant="body2" sx={{ color: 'white', marginBottom: 1, paddingRight: 2 }}>
                                {t('bubbles.clickInstruction')}
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'white', paddingRight: 2 }}>
                                {t('bubbles.dragInstruction')}
                            </Typography>
                        </Box>
                    )}
                </Box>
            ) : (
                <>
                    <Box sx={{
                        position: 'absolute',
                        top: 10,
                        right: 10,
                        zIndex: 1000,
                        display: 'flex',
                        gap: 1,
                        alignItems: 'center'
                    }}>
                        <Tooltip title={t('bubbles.searchPlaceholder')} placement="bottom-start">
                            <Box sx={{ display: 'inline-flex' }}>
                                <ResponsiveSearch
                                    searchQuery={bubblesSearchQuery}
                                    setSearchQuery={setBubblesSearchQuery}
                                    themeMode={themeMode}
                                    placement="mobile"
                                    showInstructions={showInstructions}
                                    resultsCount={t('bubbles.searchResults', { count: searchFoundBubbles.length })}
                                    showResultsCount
                                    categoriesPanelEnabled={categoriesPanelEnabled}
                                />
                            </Box>
                        </Tooltip>

                        {/* View Mode Toggle for Mobile */}
                        <Tooltip title={t('bubbles.listView')} placement="bottom-start">
                            <span>
                                <IconButton
                                    onClick={() => setListViewDialog(true)}
                                    sx={getButtonStyles()}
                                >
                                    <ViewList />
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip
                            title={categoriesPanelEnabled ? t('bubbles.filterDisabled') : t('bubbles.filterButton')}
                            placement="top"
                        >
                            <span>
                                <IconButton
                                    onClick={() => {
                                        if (!categoriesPanelEnabled) {
                                            setFilterDrawerOpen(true);
                                        }
                                    }}
                                    disabled={categoriesPanelEnabled}
                                    sx={{
                                        ...getButtonStyles(),
                                        backgroundColor: alpha(
                                            theme.palette.primary.main,
                                            !isAllSelected()
                                                ? (themeMode === 'light' ? 0.22 : 0.3)
                                                : (themeMode === 'light' ? 0.12 : 0.18)
                                        ),
                                        opacity: categoriesPanelEnabled ? 0.5 : 1,
                                        '&:disabled': {
                                            backgroundColor: theme.palette.action.disabledBackground,
                                            color: theme.palette.action.disabled
                                        }
                                    }}
                                >
                                    <FilterList />
                                </IconButton>
                            </span>
                        </Tooltip>



                    </Box>

                    {/* Поле поиска для мобильной версии теперь инкапсулировано в ResponsiveSearch */}
                    {showInstructions && (
                        <Box sx={{
                            position: 'absolute',
                            top: isSmallScreen ? 60 : 70,
                            left: 10,
                            right: 10,
                            zIndex: 1000,
                            backgroundColor: alpha(theme.palette.background.paper, 0.55),
                            backdropFilter: 'blur(8px)',
                            padding: 1.5,
                            borderRadius: 3,
                            textAlign: 'center'
                        }}>
                            <IconButton
                                onClick={handleCloseInstructions}
                                sx={{
                                    position: 'absolute',
                                    top: 2,
                                    right: 2,
                                    color: theme.palette.text.primary,
                                    padding: 0.5,
                                    '&:hover': {
                                        backgroundColor: alpha(theme.palette.text.primary, 0.1)
                                    }
                                }}
                                size="small"
                            >
                                <CloseOutlined fontSize="small" />
                            </IconButton>
                            <Typography variant="caption" sx={{ color: theme.palette.text.primary, fontSize: 12, paddingRight: 3 }}>
                                {t('bubbles.mobileClickInstruction')}
                            </Typography>
                        </Box>
                    )}
                </>
            ))}

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
                <Paper elevation={16} square sx={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 1200,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                }}>
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        padding: '12px 16px',
                        color: 'text.primary',
                        flexShrink: 0
                    }}>
                        <IconButton onClick={() => setMenuDrawerOpen(true)} sx={{ color: 'text.primary' }}>
                            <MenuIcon />
                        </IconButton>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', flex: 1 }}>
                            {t('bubbles.listView')}
                        </Typography>
                        <Button
                            variant="contained"
                            onClick={openCreateDialog}
                            startIcon={<Add />}
                        >
                            {t('bubbles.addBubble')}
                        </Button>
                    </Box>
                    <Box sx={{ flex: 1, overflow: 'auto' }}>
                        <TaskList
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
                            themeMode={themeMode}
                            isAllListFiltersSelected={isAllListFiltersSelected()}
                            onOpenFilterMenu={() => setFilterDrawerOpen(true)}
                        />
                    </Box>
                </Paper>
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
                            if (key.startsWith(selectedBubble.id + ':')) {
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