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

} from '@mui/material';
import {
    CloseOutlined, DeleteOutlined, Add, FilterList, Menu as MenuIcon, ViewList,
} from '@mui/icons-material';
import Matter from 'matter-js';
import { useTranslation } from 'react-i18next';
import MainMenuDrawer from '../components/MainMenuDrawer';
import AboutDialog from '../components/AboutDialog';
import FontSettingsDialog from '../components/FontSettingsDialog';
import LogoutConfirmDialog from '../components/LogoutConfirmDialog';
import { logoutUser } from '../services/authService';
import {
    saveBubblesToFirestore,
    loadBubblesFromFirestore,
    clearBubblesFromFirestore,
    saveTagsToFirestore,
    subscribeToTagsUpdates,
    subscribeToBubblesUpdates,
    BUBBLE_STATUS,
    markBubbleAsDone,
    markBubbleAsDeleted,
    getBubblesByStatus,
    cleanupOldDeletedBubbles
} from '../services/firestoreService';

import TaskListDrawer from '../components/ListViewDrawer';
import ResponsiveSearch from '../components/ResponsiveSearch';
import TasksCategoriesPanel from '../components/TasksCategoriesPanel';
import MobileCategorySelector from '../components/MobileCategorySelector';
import useSearch from '../hooks/useSearch';
import EditBubbleDialog from '../components/EditBubbleDialog';
import TasksCategoriesDialog from '../components/TasksCategoriesDialog';
import TaskFilterDrawer from '../components/TaskFilterDrawer';
import CreateBubbleDialog from '../components/CreateBubbleDialog';
import TagEditorDialog from '../components/TagEditorDialog';
import { useMatterResize } from '../hooks/useMatterResize';
import { computeCanvasSize, createWorldBounds } from '../utils/physicsUtils';


const BubblesPage = ({ user, themeMode, toggleTheme, themeToggleProps }) => {
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
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
    const [tags, setTags] = useState([]);
    const [selectedTagId, setSelectedTagId] = useState('');
    const [tagDialog, setTagDialog] = useState(false);
    const [tagName, setTagName] = useState('');
    const [tagColor, setTagColor] = useState('#3B7DED');
    const [editingTag, setEditingTag] = useState(null);
    const [tagMenuAnchor, setTagMenuAnchor] = useState(null);
    const [filterTags, setFilterTags] = useState(() => {
        const saved = localStorage.getItem('bubbles-filter-tags');
        return saved ? JSON.parse(saved) : [];
    }); // Массив ID выбранных тегов для фильтрации  
    const [showNoTag, setShowNoTag] = useState(() => {
        const saved = localStorage.getItem('bubbles-show-no-tag');
        return saved ? JSON.parse(saved) : true;
    }); // Показывать ли пузыри без тегов
    const [createDialog, setCreateDialog] = useState(false); // Диалог создания нового пузыря
    const [filterDrawerOpen, setFilterDrawerOpen] = useState(false); // Состояние бокового меню фильтров
    const [menuDrawerOpen, setMenuDrawerOpen] = useState(false); // Состояние левого бокового меню
    const [categoriesDrawerOpen, setCategoriesDrawerOpen] = useState(false); // Состояние панели категорий
    const [selectedCategory, setSelectedCategory] = useState(() => {
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
    const [categoriesDialog, setCategoriesDialog] = useState(false); // Диалог управления категориями
    const [fontSettingsDialog, setFontSettingsDialog] = useState(false); // Диалог настроек шрифта
    const [fontSize, setFontSize] = useState(() => {
        const savedFontSize = localStorage.getItem('bubbles-font-size');
        return savedFontSize ? parseInt(savedFontSize) : 12;
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

    // Состояние поиска для Bubbles View
    const [bubblesSearchQuery, setBubblesSearchQuery] = useState('');
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);

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
        return {
            backgroundColor: themeMode === 'light' ? 'rgba(59, 125, 237, 0.15)' : 'rgba(255, 255, 255, 0.2)',
            color: themeMode === 'light' ? '#3B7DED' : 'white',
            '&:hover': {
                backgroundColor: themeMode === 'light' ? 'rgba(59, 125, 237, 0.25)' : 'rgba(255, 255, 255, 0.3)'
            }
        };
    };

    const getOutlinedButtonStyles = () => {
        return {
            color: themeMode === 'light' ? '#3B7DED' : 'white',
            borderColor: themeMode === 'light' ? 'rgba(59, 125, 237, 0.5)' : 'rgba(255, 255, 255, 0.5)',
            backgroundColor: themeMode === 'light' ? 'rgba(59, 125, 237, 0.08)' : 'transparent',
            '&:hover': {
                borderColor: themeMode === 'light' ? 'rgba(59, 125, 237, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                backgroundColor: themeMode === 'light' ? 'rgba(59, 125, 237, 0.15)' : 'rgba(255, 255, 255, 0.1)'
            }
        };
    };

    const getDialogPaperStyles = () => {
        return {
            backgroundColor: themeMode === 'light' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(30, 30, 30, 0.95)',
            color: themeMode === 'light' ? '#000000' : '#ffffff'
        };
    };

    // Note: Functions moved to firestoreService.js for better organization

    // Function to get bubble fill style based on theme
    const getBubbleFillStyle = (tagColor = null) => {
        // Если фон отключен, возвращаем прозрачный
        if (!bubbleBackgroundEnabled) {
            return 'transparent';
        }

        if (themeMode === 'light') {
            // В светлой теме добавляем легкий фон
            if (tagColor) {
                // Используем цвет тега с низкой прозрачностью
                return tagColor + '15'; // добавляем 15 для 8% прозрачности
            }
            return 'rgba(59, 125, 237, 0.08)'; // легкий синий фон по умолчанию
        } else {
            // В темной теме также добавляем фон
            if (tagColor) {
                // Используем цвет тега с низкой прозрачностью
                return tagColor + '20'; // добавляем 20 для 12% прозрачности в темной теме
            }
            return 'rgba(255, 255, 255, 0.05)'; // легкий белый фон по умолчанию для темной темы
        }
    };

    // Function to get canvas dimensions depending on screen size
    // Размер канваса вычисляется через утилиту, учитывая панель категорий
    const getCanvasSize = () => computeCanvasSize({ isMobile, categoriesPanelEnabled });



    // Используем утилиту createWorldBounds

    useEffect(() => {
        const canvas = canvasRef.current;
        const { Engine, Render, Runner, Bodies, World, Mouse, MouseConstraint, Events, Query } = Matter;

        // Creating a Physics Engine
        const engine = Engine.create();
        engineRef.current = engine;

        // Disable default gravity to customize yours
        engine.world.gravity.y = dropSpeed;

        // Getting adaptive canvas sizes
        const canvasSize = getCanvasSize();
        setCanvasSize(canvasSize);

        // Create renderer
        const bubbleViewBackground = themeMode === 'light'
            ? '#ffffff'
            : 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)';

        const render = Render.create({
            element: canvas,
            engine,
            options: {
                width: canvasSize.width,
                height: canvasSize.height,
                wireframes: false,
                background: bubbleViewBackground,
                showAngleIndicator: false,
                showVelocity: false,
            }
        });
        renderRef.current = render;

        // Create world boundaries
        const walls = createWorldBounds(canvasSize.width, canvasSize.height);
        wallsRef.current = walls;

        // Add walls to the world
        World.add(engine.world, walls);

        // Load bubbles from Firestore
        const loadInitialBubbles = async () => {
            try {
                const storedBubbles = await loadBubblesFromFirestore();
                const initialBubbles = [];

                if (storedBubbles.length > 0) {
                    // Auto-cleanup old deleted bubbles
                    const cleanedBubbles = await cleanupOldDeletedBubbles(storedBubbles);

                    // Restore bubbles from Firestore with random positions
                    const margin = isMobile ? 50 : 100;
                    cleanedBubbles.forEach(storedBubble => {
                        // Create bubbles with random coordinates
                        const x = Math.random() * (canvasSize.width - margin * 2) + margin;
                        const y = Math.random() * (canvasSize.height - margin * 2) + margin;

                        // Определяем цвет тега для правильного fillStyle
                        let tagColor = null;
                        if (storedBubble.tagId) {
                            const tag = tags.find(t => t.id === storedBubble.tagId);
                            if (tag) {
                                tagColor = tag.color;
                            }
                        }

                        const bubble = {
                            id: storedBubble.id,
                            body: Matter.Bodies.circle(x, y, storedBubble.radius, {
                                restitution: 0.8,
                                frictionAir: 0.01,
                                render: {
                                    fillStyle: getBubbleFillStyle(tagColor),
                                    strokeStyle: storedBubble.strokeStyle || '#3B7DED',
                                    lineWidth: 3
                                }
                            }),
                            radius: storedBubble.radius,
                            title: storedBubble.title || '',
                            description: storedBubble.description || '',
                            tagId: storedBubble.tagId || null,
                            status: storedBubble.status || BUBBLE_STATUS.ACTIVE,
                            createdAt: storedBubble.createdAt || new Date().toISOString(),
                            updatedAt: storedBubble.updatedAt || new Date().toISOString(),
                            deletedAt: storedBubble.deletedAt || null,
                            dueDate: storedBubble.dueDate || null, // ← добавлено поле dueDate
                            notifications: storedBubble.notifications || [],
                            recurrence: storedBubble.recurrence || null
                        };
                        initialBubbles.push(bubble);
                    });
                    // Убираем добавление всех пузырей в физический мир - они будут добавлены после фильтрации
                }

                setBubbles(initialBubbles);
                // Не добавляем пузыри в физический мир сразу - они будут добавлены после применения фильтров
            } catch (error) {
                console.error('Error loading initial bubbles:', error);
                setBubbles([]);
            }
        };

        loadInitialBubbles();
        // Subscribe to live bubbles updates (dueDate changes from server)
        const unsubscribeBubbles = subscribeToBubblesUpdates((serverBubbles) => {
            setBubbles(prev => {
                const map = new Map(prev.map(b => [b.id, b]));
                const merged = serverBubbles.map(sb => {
                    const ex = map.get(sb.id);
                    return ex ? { ...ex, ...sb, body: ex.body } : sb;
                });
                return merged;
            });
        });

        // Create mouse and constraints for drag and drop
        const mouse = Mouse.create(render.canvas);
        const mouseConstraint = MouseConstraint.create(engine, {
            mouse,
            constraint: {
                stiffness: 0.2,
                render: {
                    visible: false
                }
            }
        });

        World.add(engine.world, mouseConstraint);

        // Click / tap handler for bubbles (robust against short drags)
        let clickStartTime = 0;
        let clickStartPos = { x: 0, y: 0 };
        let downBodyId = null;

        Events.on(mouseConstraint, 'mousedown', (event) => {
            clickStartTime = Date.now();
            clickStartPos = { ...event.mouse.position };
            const bodies = engine.world.bodies.filter(b => b.label === 'Circle Body');
            const hits = Query.point(bodies, clickStartPos);
            downBodyId = hits && hits.length > 0 ? hits[0].id : null;
        });

        Events.on(mouseConstraint, 'mouseup', (event) => {
            const clickDuration = Date.now() - clickStartTime;
            const mousePosition = event.mouse.position;

            const dx = mousePosition.x - clickStartPos.x;
            const dy = mousePosition.y - clickStartPos.y;
            const moveDistSq = dx * dx + dy * dy;

            const durationThresholdMs = 450;
            const moveThresholdSq = 100; // ~10px

            if (clickDuration <= durationThresholdMs && moveDistSq <= moveThresholdSq) {
                const bodies = engine.world.bodies.filter(b => b.label === 'Circle Body');
                const upHits = Query.point(bodies, mousePosition);
                const upBody = upHits && upHits.length > 0 ? upHits[0] : null;

                const targetBodyId = upBody ? upBody.id : null;
                if (targetBodyId && (!downBodyId || downBodyId === targetBodyId)) {
                    setBubbles(currentBubblesState => {
                        const clickedBubble = currentBubblesState.find(b => b.body.id === targetBodyId);
                        if (clickedBubble) {
                            setSelectedBubble(clickedBubble);
                            setTitle(clickedBubble.title || '');
                            setDescription(clickedBubble.description || '');
                            setSelectedTagId(clickedBubble.tagId || '');
                            setEditBubbleSize(clickedBubble.radius);
                            setEditDialog(true);
                        }
                        return currentBubblesState;
                    });
                }
            }
            downBodyId = null;
        });

        // Start render and engine
        Render.run(render);
        const runner = Runner.create();
        Runner.run(runner, engine);

        // Resize sync is handled by useMatterResize hook

        return () => {
            // cleanup handled below; resize listeners removed by hook
            Render.stop(render);
            World.clear(engine.world);
            Engine.clear(engine);
            render.canvas.remove();
            render.textures = {};
            if (typeof unsubscribeBubbles === 'function') unsubscribeBubbles();
        };
    }, []); // Убираем themeMode из зависимостей

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

            if (themeMode === 'light') {
                // Для светлой темы - белый фон
                renderRef.current.options.background = '#ffffff';
                canvas.style.background = '#ffffff';
            } else {
                // Для темной темы - градиент фон
                renderRef.current.options.background = '#2c3e50';
                canvas.style.background = 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)';
            }
        }

        // Update existing bubbles fill style based on theme
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
                }
            });
        }
    }, [themeMode, bubbles, tags]);

    // Force TextOverlay re-render on theme change to update text opacity
    const [textOverlayKey, setTextOverlayKey] = useState(0);
    useEffect(() => {
        // Force TextOverlay re-render when theme changes
        setTextOverlayKey(prev => prev + 1);
    }, [themeMode]);

    // Real-time tags synchronization
    useEffect(() => {
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
    }, []);

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

            // Тоже самое для настроек фильтра в списке задач
            let savedListFilterTags = localStorage.getItem('bubbles-list-filter-tags');
            let savedListShowNoTag = localStorage.getItem('bubbles-list-show-no-tag');
            if (savedListFilterTags === null && savedListShowNoTag === null) {
                const allTagIds = tags.map(tag => tag.id);
                setListFilterTags(allTagIds);
                setListShowNoTag(true);
                localStorage.setItem('bubbles-list-filter-tags', JSON.stringify(allTagIds));
                localStorage.setItem('bubbles-list-show-no-tag', JSON.stringify(true));
            }

            if (savedFilterTags && savedShowNoTag) {
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
    }, [tags]);

    // Синхронизация selectedCategory при изменении фильтров
    useEffect(() => {
        if (tags.length > 0) {
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
    }, [filterTags, showNoTag, tags]);



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

        if (allTagsSelected) {
            return filteredByStatus;
        }

        return filteredByStatus.filter(bubble => {
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
    }, [bubbles, tags, filterTags, showNoTag]);

    // Применение фильтрации при загрузке пузырей
    useEffect(() => {
        if (bubbles.length > 0 && engineRef.current) {
            // Применяем фильтрацию сразу после загрузки пузырей
            const filteredIds = new Set(getFilteredBubbles.map(b => b.id));

            bubbles.forEach(bubble => {
                if (bubble.body) {
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

    // Используем хук поиска только для определения найденных пузырей (не для фильтрации)
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
            if (bubble.body) {
                const isVisible = filteredIds.has(bubble.id);
                const isCurrentlyInWorld = engineRef.current.world.bodies.includes(bubble.body);
                const isFound = foundBubblesIds.has(bubble.id);
                const hasSearchQuery = debouncedBubblesSearchQuery && debouncedBubblesSearchQuery.trim();

                if (isVisible && !isCurrentlyInWorld) {
                    // Add bubble to physical world if it's visible and not already there
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
                        bubble.body.render.lineWidth = 4;
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
                        bubble.body.render.lineWidth = 3;
                        // Убираем свечение
                        bubble.body.render.shadowColor = 'transparent';
                        bubble.body.render.shadowBlur = 0;
                    }
                } else if (!isVisible && isCurrentlyInWorld) {
                    // Remove bubble from the physical world
                    Matter.World.remove(engineRef.current.world, bubble.body);
                } else if (isVisible && isCurrentlyInWorld) {
                    // Update styles for visible bubbles based on search
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
                        bubble.body.render.lineWidth = 4;
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
                        bubble.body.render.lineWidth = 3;
                        // Убираем свечение
                        bubble.body.render.shadowColor = 'transparent';
                        bubble.body.render.shadowBlur = 0;
                    }
                }
            }
        });
    }, [getFilteredBubbles, bubbles, tags, foundBubblesIds, debouncedBubblesSearchQuery]);



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
                lineWidth: 3
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
        setTitle('');
        setDescription('');
        setSelectedTagId('');
        setBubbleSize(45); // Сброс размера к значению по умолчанию
        setDueDate(null); // Сброс даты
        setCreateNotifications([]); // сброс уведомлений
        setCreateDialog(true);
    };

    // Function for creating a new bubble
    const createNewBubble = () => {
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
        newBubble.dueDate = dueDate ? new Date(dueDate).toISOString() : null;
        newBubble.notifications = createNotifications;
        newBubble.recurrence = createRecurrence;

        Matter.World.add(engineRef.current.world, newBubble.body);
        setBubbles(prev => {
            const updatedBubbles = [...prev, newBubble];
            saveBubblesToFirestore(updatedBubbles);
            return updatedBubbles;
        });

        // Close dialog and reset form
        setCreateDialog(false);
        setTitle('');
        setDescription('');
        setSelectedTagId('');
        setDueDate(null);
    };

    // Save bubble changes
    const handleSaveBubble = () => {
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
                        lineWidth: 3
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
            setBubbles(prev => {
                const updatedBubbles = prev.map(bubble => {
                    if (bubble.id === selectedBubble.id) {
                        return {
                            ...bubble,
                            title,
                            description,
                            tagId: selectedTagId || null,
                            radius: editBubbleSize,
                            body: newBody, // Используем новое тело
                            updatedAt: new Date().toISOString(),
                            dueDate: editDueDate ? new Date(editDueDate).toISOString() : null,
                            notifications: editNotifications,
                            recurrence: editRecurrence
                        };
                    }
                    return bubble;
                });
                saveBubblesToFirestore(updatedBubbles);
                return updatedBubbles;
            });
        }

        setEditDialog(false);
        setSelectedBubble(null);
        setTitle('');
        setDescription('');
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
                console.error('Error deleting bubble:', error);
            }
        }
        setEditDialog(false);
        setSelectedBubble(null);
        setTitle('');
        setDescription('');
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
                    const popAudio = new window.Audio('/to-round-react/pop.mp3');
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
                            markBubbleAsDone(selectedBubble.id, bubbles).then(updatedBubbles => {
                                setBubbles(updatedBubbles);
                            });
                        }
                    };
                    animatePop();
                } else {
                    // Если нет тела, просто удаляем
                    Matter.World.remove(engineRef.current.world, selectedBubble.body);
                    const updatedBubbles = await markBubbleAsDone(selectedBubble.id, bubbles);
                    setBubbles(updatedBubbles);
                }
            } catch (error) {
                console.error('Error marking bubble as done:', error);
            }
        }
        setEditDialog(false);
        setSelectedBubble(null);
        setTitle('');
        setDescription('');
        // Не сбрасываем размер - он будет установлен при следующем открытии диалога
    };

    // Close dialog without saving
    const handleCloseDialog = () => {
        setEditDialog(false);
        setSelectedBubble(null);
        setTitle('');
        setDescription('');
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
            setTagColor(getNextAvailableColor() || '#3B7DED');
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
        saveTagsToFirestore(updatedTags);

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
        setTagColor(getNextAvailableColor() || '#3B7DED');

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

            const updatedTags = tags.filter(tag => tag.id !== tagId);
            setTags(updatedTags);
            saveTagsToFirestore(updatedTags);

            // Удаляем ссылки на этот тег из пузырей
            setBubbles(prev => {
                const updatedBubbles = prev.map(bubble => {
                    if (bubble.tagId === tagId) {
                        // Сбрасываем цвет пузыря на светло-серый и обновляем fillStyle
                        bubble.body.render.strokeStyle = '#B0B0B0';
                        bubble.body.render.fillStyle = getBubbleFillStyle(null);
                        return { ...bubble, tagId: null };
                    }
                    return bubble;
                });
                saveBubblesToFirestore(updatedBubbles);
                return updatedBubbles;
            });

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
        setTagColor(getNextAvailableColor() || '#3B7DED');

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
        setShowNoTag(prev => {
            const newShowNoTag = !prev;
            localStorage.setItem('bubbles-show-no-tag', JSON.stringify(newShowNoTag));
            return newShowNoTag;
        });

        // Сбрасываем выбранную категорию при ручном изменении фильтров
        setSelectedCategory(null);
    }, []);

    const clearAllFilters = useCallback(() => {
        setFilterTags([]);
        setShowNoTag(false);
        setSelectedCategory(null); // Сбрасываем выбранную категорию
        localStorage.setItem('bubbles-filter-tags', JSON.stringify([]));
        localStorage.setItem('bubbles-show-no-tag', JSON.stringify(false));
    }, []);

    const selectAllFilters = useCallback(() => {
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
            const descriptionMatch = (task.description || '').toLowerCase().includes(query);

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

    // Функция для проверки просроченности due date
    const isOverdue = (dueDate) => {
        if (!dueDate) return false;
        return new Date(dueDate) < new Date();
    };

    const handleCategorySelect = (categoryId) => {
        setSelectedCategory(categoryId);
        // Панель не закрывается при выборе категории, если она постоянно включена

        if (categoryId === 'all') {
            // Показываем все пузыри - устанавливаем все теги
            const allTagIds = tags.map(tag => tag.id);
            setFilterTags(allTagIds);
            setShowNoTag(true);
            localStorage.setItem('bubbles-filter-tags', JSON.stringify(allTagIds));
            localStorage.setItem('bubbles-show-no-tag', JSON.stringify(true));
        } else if (categoryId === 'no-tags') {
            // Показываем только пузыри без тегов
            setFilterTags([]);
            setShowNoTag(true);
            localStorage.setItem('bubbles-filter-tags', JSON.stringify([]));
            localStorage.setItem('bubbles-show-no-tag', JSON.stringify(true));
        } else {
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
    const TextOverlay = useCallback(() => {
        const [positions, setPositions] = useState([]);
        const bubblesRef = useRef(bubbles);
        const filteredBubblesRef = useRef([]);

        // Обновляем ref при изменении bubbles - мемоизируем
        const updateRefs = useCallback(() => {
            bubblesRef.current = bubbles;
            filteredBubblesRef.current = getFilteredBubbles;
        }, [bubbles, getFilteredBubbles]);

        useEffect(() => {
            updateRefs();
        }, [updateRefs]);

        useEffect(() => {
            if (!engineRef.current) return undefined;

            const updatePositions = () => {
                const filteredBubbles = filteredBubblesRef.current;
                const newPositions = filteredBubbles.map(bubble => ({
                    id: bubble.id,
                    x: bubble.body.position.x,
                    y: bubble.body.position.y,
                    radius: bubble.radius,
                    title: bubble.title
                }));
                setPositions(newPositions);
            };

            // Увеличиваем интервал до 33мс (~30fps) для лучшей производительности
            const intervalId = setInterval(updatePositions, 33);
            return () => clearInterval(intervalId);
        }, []);

        // Мемоизируем рендер функцию для каждого пузыря
        const renderBubbleText = useCallback((bubble) => {
            // Функция для ограничения длины текста в зависимости от размера пузыря и шрифта
            const getMaxTitleLength = (radius, currentFontSize) => {
                // Базовые значения для шрифта 12px
                let baseLength;
                if (radius < 30) baseLength = 8;   // очень маленький пузырь
                else if (radius < 40) baseLength = 12;  // маленький пузырь
                else if (radius < 50) baseLength = 16;  // средний пузырь
                else baseLength = 20;                   // большой пузырь

                // Корректируем количество символов в зависимости от размера шрифта
                // Чем меньше шрифт, тем больше символов помещается (квадратичная зависимость)
                const fontSizeRatio = Math.pow(12 / currentFontSize, 1.5); // Более агрессивное увеличение
                return Math.round(baseLength * fontSizeRatio);
            };

            // Проверяем, найден ли пузырь в поиске
            const isFound = foundBubblesIds.has(bubble.id);
            const hasSearchQuery = debouncedBubblesSearchQuery && debouncedBubblesSearchQuery.trim();

            // Вычисляем текущий размер шрифта с учетом мобильности
            const currentFontSize = isMobile ? fontSize * 0.75 : fontSize;
            const maxLength = getMaxTitleLength(bubble.radius, currentFontSize);
            const truncatedTitle = bubble.title && bubble.title.length > maxLength
                ? bubble.title.substring(0, maxLength) + '...'
                : bubble.title;

            // Определяем стили в зависимости от поиска
            const textOpacity = hasSearchQuery ? (isFound ? 1 : 0.4) : 1;
            const textColor = themeMode === 'light' ? '#2C3E50' : 'white';   // Обычный цвет для всех

            const textShadow = themeMode === 'light'
                ? '1px 1px 2px rgba(255,255,255,0.8)'
                : '1px 1px 2px rgba(0,0,0,0.8)';

            return bubble.title ? (
                <Box
                    key={bubble.id}
                    sx={{
                        position: 'absolute',
                        left: bubble.x,
                        top: bubble.y,
                        transform: 'translate(-50%, -50%)',
                        textAlign: 'center',
                        color: textColor,
                        textShadow: textShadow,
                        maxWidth: Math.max(bubble.radius * 1.6, 50),
                        overflow: 'hidden',
                        opacity: textOpacity,
                        transition: 'opacity 0.3s ease'
                    }}
                >
                    <Typography
                        sx={{
                            fontSize: Math.max(
                                isMobile ? fontSize * 0.75 : fontSize,
                                Math.min(bubble.radius / (isMobile ? 2.2 : 3), isMobile ? fontSize * 1.2 : fontSize * 1.3)
                            ),
                            fontWeight: 'bold',
                            lineHeight: 1.1,
                            wordBreak: 'break-word'
                        }}
                    >
                        {truncatedTitle}
                    </Typography>
                </Box>
            ) : null;
        }, [isMobile, fontSize, themeMode, foundBubblesIds, debouncedBubblesSearchQuery]);

        return (
            <Box sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 10
            }}>
                {positions.map(renderBubbleText)}
            </Box>
        );
    }, [getFilteredBubbles, bubbles, isMobile, fontSize, themeMode, foundBubblesIds, debouncedBubblesSearchQuery]);

    // В начале компонента:
    const notifiedBubblesRef = useRef(new Set());
    const notifiedBubbleNotificationsRef = useRef(new Set()); // bubbleId:idx

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
                const due = new Date(bubble.dueDate).getTime();
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
                if (now >= due) {
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
                    setEditDueDate(new Date(val));
                } else if (val instanceof Date) {
                    setEditDueDate(val);
                } else {
                    setEditDueDate(null);
                }
            } else {
                setEditDueDate(null);
            }
            // basic fields for Save button logic
            setTitle(selectedBubble.title || '');
            setDescription(selectedBubble.description || '');
            setSelectedTagId(selectedBubble.tagId || '');
            if (typeof selectedBubble.radius === 'number') {
                setEditBubbleSize(selectedBubble.radius);
            }
            setEditRecurrence(selectedBubble.recurrence || null);
        }
        // eslint-disable-next-line
    }, [editDialog, selectedBubble?.id]);

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
    const [editNotifications, setEditNotifications] = useState([]); // для редактирования
    const [createRecurrence, setCreateRecurrence] = useState(null); // { every, unit }
    const [editRecurrence, setEditRecurrence] = useState(null);

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
    }, [bubbles]);

    // Вспомогательная функция для вычисления offset в миллисекундах
    function getOffsetMs(notification) {
        if (typeof notification === 'string') {
            if (notification.endsWith('m')) return parseInt(notification) * 60 * 1000;
            if (notification.endsWith('h')) return parseInt(notification) * 60 * 60 * 1000;
            if (notification.endsWith('d')) return parseInt(notification) * 24 * 60 * 60 * 1000;
        }
        if (notification.type === 'custom') {
            const v = Number(notification.value);
            switch (notification.unit) {
                case 'minutes': return v * 60 * 1000;
                case 'hours': return v * 60 * 60 * 1000;
                case 'days': return v * 24 * 60 * 60 * 1000;
                case 'weeks': return v * 7 * 24 * 60 * 60 * 1000;
                default: return 0;
            }
        }
        return 0;
    }

    return (
        <Box sx={{
            width: (!isMobile && categoriesPanelEnabled) ? 'calc(100vw - 320px)' : '100vw',
            height: '100vh',
            overflow: 'hidden',
            position: 'relative',
            background: theme.palette.background.bubbleView,
            marginLeft: (!isMobile && categoriesPanelEnabled) ? '320px' : '0px',
            transition: 'margin-left 0.3s ease, width 0.3s ease'
        }}>
            {/* Заголовок и кнопки - адаптивный */}
            {!isMobile ? (
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
                                src="/to-round-react/bubbles.png"
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
                            sx={{
                                background: themeMode === 'light'
                                    ? 'rgba(59, 125, 237, 0.9)'
                                    : 'rgba(255,255,255,0.2)',
                                backdropFilter: 'blur(10px)',
                                border: themeMode === 'light'
                                    ? '1px solid rgba(59, 125, 237, 0.5)'
                                    : '1px solid rgba(255,255,255,0.3)',
                                color: themeMode === 'light' ? 'white' : 'white',
                                height: 36,
                                '&:hover': {
                                    background: themeMode === 'light'
                                        ? 'rgba(59, 125, 237, 1)'
                                        : 'rgba(255,255,255,0.3)'
                                }
                            }}
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
                    padding: '0 10px'
                }}>
                    <IconButton
                        onClick={() => setMenuDrawerOpen(true)}
                        sx={getButtonStyles()}
                    >
                        <MenuIcon />
                    </IconButton>
                </Box>
            )}



            {/* Мобильный селектор категорий */}
            {isMobile && categoriesPanelEnabled && (
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
                    />
                </Box>
            )}

            {/* Плавающие кнопки для мобильных устройств */}
            {isMobile && (
                <>
                    <Tooltip title={t('bubbles.addBubble')}>
                        <Fab
                            color="primary"
                            onClick={openCreateDialog}
                            sx={{
                                position: 'absolute',
                                bottom: 100, // Увеличен отступ для навигационной панели
                                right: 20,
                                zIndex: 1000,
                                backgroundColor: 'rgba(59, 125, 237, 0.9)',
                                '&:hover': {
                                    backgroundColor: 'rgba(59, 125, 237, 1)'
                                }
                            }}
                        >
                            <Add />
                        </Fab>
                    </Tooltip>
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
            {!isMobile ? (
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

                        {/* View Mode Toggle */}
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            {/* Иконка поиска теперь инкапсулирована внутри ResponsiveSearch */}
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
                                            backgroundColor: !isAllSelected()
                                                ? (themeMode === 'light' ? 'rgba(59, 125, 237, 0.15)' : 'rgba(255, 255, 255, 0.2)')
                                                : (themeMode === 'light' ? 'rgba(59, 125, 237, 0.08)' : 'transparent'),
                                            opacity: categoriesPanelEnabled ? 0.5 : 1,
                                            '&:disabled': {
                                                backgroundColor: themeMode === 'light' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)',
                                                color: themeMode === 'light' ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.3)'
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

                        {/* View Mode Toggle for Mobile */}
                        <IconButton
                            onClick={() => setListViewDialog(true)}
                            sx={getButtonStyles()}
                        >
                            <ViewList />
                        </IconButton>
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
                                        backgroundColor: !isAllSelected()
                                            ? (themeMode === 'light' ? 'rgba(59, 125, 237, 0.25)' : 'rgba(255, 255, 255, 0.3)')
                                            : (themeMode === 'light' ? 'rgba(59, 125, 237, 0.15)' : 'rgba(255, 255, 255, 0.2)'),
                                        opacity: categoriesPanelEnabled ? 0.5 : 1,
                                        '&:disabled': {
                                            backgroundColor: themeMode === 'light' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)',
                                            color: themeMode === 'light' ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.3)'
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
                            backgroundColor: 'rgba(0, 0, 0, 0.4)',
                            padding: 1.5,
                            borderRadius: 2,
                            textAlign: 'center'
                        }}>
                            <IconButton
                                onClick={handleCloseInstructions}
                                sx={{
                                    position: 'absolute',
                                    top: 2,
                                    right: 2,
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
                            <Typography variant="caption" sx={{ color: 'white', fontSize: 12, paddingRight: 3 }}>
                                {t('bubbles.mobileClickInstruction')}
                            </Typography>
                        </Box>
                    )}
                </>
            )}

            {/* Canvas for physics */}
            <div ref={canvasRef} style={{
                width: '100vw',
                height: '100vh',
                position: 'absolute',
                top: 0,
                left: 0,
                zIndex: 1
            }} />
            {/* Текст поверх пузырей */}
            <TextOverlay key={textOverlayKey} />

            {/* Диалог редактирования */}
            <EditBubbleDialog
                open={editDialog}
                onClose={handleCloseDialog}
                t={t}
                isSmallScreen={isSmallScreen}
                isMobile={isMobile}
                themeMode={themeMode}
                getDialogPaperStyles={getDialogPaperStyles}
                title={title}
                setTitle={setTitle}
                description={description}
                setDescription={setDescription}
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
                editRecurrence={editRecurrence}
                setEditRecurrence={setEditRecurrence}
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
                categoriesPanelEnabled={categoriesPanelEnabled}
                onToggleCategoriesPanel={handleToggleCategoriesPanel}
                onOpenCategoriesDialog={() => setCategoriesDialog(true)}
                onOpenFontSettingsDialog={() => setFontSettingsDialog(true)}
                onAbout={() => setAboutOpen(true)}
                onLogout={handleLogout}
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
                title={title}
                setTitle={setTitle}
                description={description}
                setDescription={setDescription}
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
                setCreateRecurrence={setCreateRecurrence}
                handleDeleteCreateNotification={handleDeleteCreateNotification}
                tags={tags}
                selectedTagId={selectedTagId}
                setSelectedTagId={setSelectedTagId}
                bubbleSize={bubbleSize}
                setBubbleSize={setBubbleSize}
                onCreate={createNewBubble}
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
                onReset={() => handleFontSizeChange(12)}
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
                setTitle={setTitle}
                setDescription={setDescription}
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
            {!isMobile && (
                <TasksCategoriesPanel
                    open={categoriesPanelEnabled}
                    onClose={() => setCategoriesPanelEnabled(false)}
                    tags={tags}
                    selectedCategory={selectedCategory}
                    onCategorySelect={handleCategorySelect}
                    themeMode={themeMode}
                    bubbleCounts={getCategoryBubbleCounts()}
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