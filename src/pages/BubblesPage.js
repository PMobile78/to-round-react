import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
    Box,
    Typography,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    IconButton,
    useMediaQuery,
    useTheme,
    Fab,
    Tooltip,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Chip,
    Stack,
    Switch,
    Menu,
    ListItemIcon,
    ListItemText,
    Drawer,
    Checkbox,
    FormControlLabel,
    List,
    ListItem,
    Divider,
    Slider,

} from '@mui/material';
import { CloseOutlined, DeleteOutlined, Add, Clear, Label, Edit, LocalOffer, Logout, FilterList, Check, Menu as MenuIcon, Settings, Info, Category, Sell, CheckCircle, ViewList, Restore, ViewModule, Sort, ArrowUpward, ArrowDownward, Search } from '@mui/icons-material';
import Matter from 'matter-js';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '../components/LanguageSelector';
import ThemeToggle from '../components/ThemeToggle';
import { logoutUser } from '../services/authService';
import {
    saveBubblesToFirestore,
    loadBubblesFromFirestore,
    clearBubblesFromFirestore,
    saveTagsToFirestore,
    loadTagsFromFirestore,
    subscribeToTagsUpdates,
    BUBBLE_STATUS,
    markBubbleAsDone,
    markBubbleAsDeleted,
    restoreBubble,
    getBubblesByStatus,
    cleanupOldDeletedBubbles
} from '../services/firestoreService';

import { FilterMenu } from '../components/FilterMenu';
import ListView from '../components/ListView';
import SearchField from '../components/SearchField';
import useSearch from '../hooks/useSearch';
import { DateTimePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import AddNotification from '../components/AddNotification';

// Auto-cleanup period for deleted tasks (30 days)
const DELETED_TASKS_CLEANUP_DAYS = 30;



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
        return saved ? saved : 'createdAt';
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
    const getCanvasSize = () => {
        return {
            width: window.innerWidth,
            height: window.innerHeight
        };
    };



    // Function for creating world boundaries
    const createWorldBounds = (width, height) => {
        const { Bodies } = Matter;
        return [
            Bodies.rectangle(width / 2, -25, width, 50, {
                isStatic: true,
                render: { fillStyle: 'transparent' }
            }),
            Bodies.rectangle(width / 2, height + 25, width, 50, {
                isStatic: true,
                render: { fillStyle: 'transparent' }
            }),
            Bodies.rectangle(-25, height / 2, 50, height, {
                isStatic: true,
                render: { fillStyle: 'transparent' }
            }),
            Bodies.rectangle(width + 25, height / 2, 50, height, {
                isStatic: true,
                render: { fillStyle: 'transparent' }
            })
        ];
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        const { Engine, Render, Runner, Bodies, World, Mouse, MouseConstraint, Events } = Matter;

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
                            notifications: storedBubble.notifications || []
                        };
                        initialBubbles.push(bubble);
                    });
                    World.add(engine.world, initialBubbles.map(b => b.body));
                }

                setBubbles(initialBubbles);
            } catch (error) {
                console.error('Error loading initial bubbles:', error);
                setBubbles([]);
            }
        };

        loadInitialBubbles();

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

        // Click handler for bubbles
        let clickStartTime = 0;
        let isDragging = false;

        Events.on(mouseConstraint, 'startdrag', () => {
            isDragging = true;
        });

        Events.on(mouseConstraint, 'enddrag', () => {
            setTimeout(() => {
                isDragging = false;
            }, 50);
        });

        Events.on(mouseConstraint, 'mousedown', (event) => {
            clickStartTime = Date.now();
            const mousePosition = event.mouse.position;

            setTimeout(() => {
                const clickDuration = Date.now() - clickStartTime;
                if (!isDragging && clickDuration < 200) {
                    const currentBubbles = engine.world.bodies.filter(body => body.label === 'Circle Body');
                    const clickedBody = currentBubbles.find(body => {
                        const distance = Math.sqrt(
                            (body.position.x - mousePosition.x) ** 2 +
                            (body.position.y - mousePosition.y) ** 2
                        );
                        return distance <= body.circleRadius;
                    });

                    if (clickedBody) {
                        setBubbles(currentBubbles => {
                            const clickedBubble = currentBubbles.find(bubble => bubble.body.id === clickedBody.id);
                            if (clickedBubble) {
                                setSelectedBubble(clickedBubble);
                                setTitle(clickedBubble.title || '');
                                setDescription(clickedBubble.description || '');
                                setSelectedTagId(clickedBubble.tagId || '');
                                setEditBubbleSize(clickedBubble.radius); // Устанавливаем текущий размер пузыря
                                setEditDialog(true);
                            }
                            return currentBubbles;
                        });
                    }
                }
            }, 150);
        });

        // Start render and engine
        Render.run(render);
        const runner = Runner.create();
        Runner.run(runner, engine);

        // Window resize handler
        const handleResize = () => {
            // Recalculate canvas size using current breakpoint values
            const newSize = {
                width: window.innerWidth,
                height: window.innerHeight
            };

            // Update renderer dimensions
            render.canvas.width = newSize.width;
            render.canvas.height = newSize.height;
            render.options.width = newSize.width;
            render.options.height = newSize.height;
            setCanvasSize(newSize);

            // Remove old boundaries
            if (wallsRef.current.length > 0) {
                World.remove(engine.world, wallsRef.current);
            }

            // Create new boundaries
            const newWalls = createWorldBounds(newSize.width, newSize.height);
            wallsRef.current = newWalls;
            World.add(engine.world, newWalls);

            // Correct bubble positions if they go beyond new boundaries
            const allBodies = engine.world.bodies.filter(body => body.label === 'Circle Body');
            allBodies.forEach(body => {
                const radius = body.circleRadius;
                let corrected = false;

                // Check and correct X position
                if (body.position.x - radius < 0) {
                    Matter.Body.setPosition(body, { x: radius, y: body.position.y });
                    corrected = true;
                } else if (body.position.x + radius > newSize.width) {
                    Matter.Body.setPosition(body, { x: newSize.width - radius, y: body.position.y });
                    corrected = true;
                }

                // Check and correct Y position
                if (body.position.y - radius < 0) {
                    Matter.Body.setPosition(body, { x: body.position.x, y: radius });
                    corrected = true;
                } else if (body.position.y + radius > newSize.height) {
                    Matter.Body.setPosition(body, { x: body.position.x, y: newSize.height - radius });
                    corrected = true;
                }

                // If position was corrected, reset velocity
                if (corrected) {
                    Matter.Body.setVelocity(body, { x: 0, y: 0 });
                }
            });
        };

        // Add debounce for resize event
        let resizeTimeout;
        const debouncedResize = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(handleResize, 100);
        };

        window.addEventListener('resize', debouncedResize);

        return () => {
            clearTimeout(resizeTimeout);
            window.removeEventListener('resize', debouncedResize);
            Render.stop(render);
            World.clear(engine.world);
            Engine.clear(engine);
            render.canvas.remove();
            render.textures = {};
        };
    }, []); // Убираем themeMode из зависимостей

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
                localStorage.setItem('bubbles-filter-tags', JSON.stringify(validFilterTags));
                return validFilterTags;
            });

            // Update list filter tags to remove deleted tags
            setListFilterTags(currentListFilterTags => {
                const existingTagIds = tagsArray.map(tag => tag.id);
                const validListFilterTags = currentListFilterTags.filter(id => existingTagIds.includes(id));
                localStorage.setItem('bubbles-list-filter-tags', JSON.stringify(validListFilterTags));
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
                    // Only create new physics body if the bubble doesn't already have one or it was removed
                    if (!bubble.body || !engineRef.current.world.bodies.includes(bubble.body)) {
                        // Create new physics body for restored bubbles to make them fall from top
                        const margin = isMobile ? 50 : 100;
                        const newX = Math.random() * (canvasSize.width - margin * 2) + margin;
                        const newY = 50; // Drop from top

                        // Determine stroke color and tag color based on tag
                        let strokeColor = '#B0B0B0';
                        let tagColor = null;
                        if (bubble.tagId) {
                            const tag = tags.find(t => t.id === bubble.tagId);
                            if (tag) {
                                strokeColor = tag.color;
                                tagColor = tag.color;
                            }
                        }

                        // Create new physics body with new position
                        // Определяем цвет подсветки для найденных пузырей
                        let highlightColor = '#B0B0B0'; // Серый цвет для пузырей без тегов
                        if (hasSearchQuery && isFound) {
                            if (bubble.tagId) {
                                const tag = tags.find(t => t.id === bubble.tagId);
                                if (tag) {
                                    highlightColor = tag.color;
                                }
                            }
                            // Если нет тега, highlightColor остается серым (#B0B0B0)
                        }

                        const newBody = Matter.Bodies.circle(newX, newY, bubble.radius, {
                            restitution: 0.8,
                            frictionAir: 0.01,
                            render: {
                                fillStyle: getBubbleFillStyle(tagColor),
                                strokeStyle: hasSearchQuery && isFound
                                    ? highlightColor  // Цвет тега для найденных
                                    : strokeColor,
                                lineWidth: hasSearchQuery && isFound ? 4 : 3,
                                // Прозрачность в зависимости от поиска
                                opacity: hasSearchQuery ? (isFound ? 1 : 0.3) : 1
                            }
                        });

                        // Добавляем эффект свечения для найденных пузырей
                        if (hasSearchQuery && isFound) {
                            newBody.render.shadowColor = highlightColor;
                            newBody.render.shadowBlur = 15;
                            newBody.render.shadowOffsetX = 0;
                            newBody.render.shadowOffsetY = 0;
                        }

                        // Update bubble with new physics body
                        bubble.body = newBody;

                        // Add new bubble to the physical world
                        Matter.World.add(engineRef.current.world, newBody);
                    } else {
                        // Update styles for existing bubbles
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
    }, [getFilteredBubbles, bubbles, canvasSize, isMobile, tags, foundBubblesIds, debouncedBubblesSearchQuery]);



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
        if (!engineRef.current || !renderRef.current) {
            return;
        }

        const margin = isMobile ? 50 : 100;

        const newBubble = createBubble(
            Math.random() * (canvasSize.width - margin * 2) + margin,
            50,
            bubbleSize, // Используем выбранный размер
            selectedTagId || null
        );

        // Set title, description, dueDate
        newBubble.title = title;
        newBubble.description = description;
        newBubble.dueDate = dueDate ? new Date(dueDate).toISOString() : null;
        newBubble.notifications = createNotifications;

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
                            notifications: editNotifications
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
    }, []);

    const handleNoTagFilterChange = useCallback(() => {
        setShowNoTag(prev => {
            const newShowNoTag = !prev;
            localStorage.setItem('bubbles-show-no-tag', JSON.stringify(newShowNoTag));
            return newShowNoTag;
        });
    }, []);

    const clearAllFilters = useCallback(() => {
        setFilterTags([]);
        setShowNoTag(false);
        localStorage.setItem('bubbles-filter-tags', JSON.stringify([]));
        localStorage.setItem('bubbles-show-no-tag', JSON.stringify(false));
    }, []);

    const selectAllFilters = useCallback(() => {
        const allTagIds = tags.map(tag => tag.id);
        setFilterTags(allTagIds);
        setShowNoTag(true);
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

        const showNotificationAndVibrate = (bubble) => {
            if (navigator.vibrate) {
                navigator.vibrate([200, 100, 200]);
            }
            if (window.Notification) {
                const title = t('bubbles.overdueNotificationTitle');
                let body = '';
                if (bubble.title) {
                    body = t('bubbles.overdueNotificationBodyWithTitle', { title: bubble.title });
                } else {
                    body = t('bubbles.overdueNotificationBody');
                }
                if (Notification.permission === "granted") {
                    new Notification(title, { body });
                } else if (Notification.permission !== "denied") {
                    Notification.requestPermission().then(permission => {
                        if (permission === "granted") {
                            new Notification(title, { body });
                        }
                    });
                }
            }
        };

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
                    const key = `${bubble.id}:${activeNotifIdx}`;
                    if (!notifiedBubbleNotificationsRef.current.has(key)) {
                        showNotificationAndVibrate(bubble);
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
                        showNotificationAndVibrate(bubble);
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
            // Удаляем ключ из notifiedBubbleNotificationsRef
            if (selectedBubble) {
                const key = `${selectedBubble.id}:${idx}`;
                notifiedBubbleNotificationsRef.current.delete(key);
            }
            return prev.filter((_, i) => i !== idx);
        });
    }, [selectedBubble]);
    // Для createNotifications
    const handleDeleteCreateNotification = useCallback((idx) => {
        setCreateNotifications(prev => {
            if (selectedBubble) {
                const key = `${selectedBubble.id}:${idx}`;
                notifiedBubbleNotificationsRef.current.delete(key);
            }
            return prev.filter((_, i) => i !== idx);
        });
    }, [selectedBubble]);

    // При открытии диалога редактирования подставлять dueDate
    useEffect(() => {
        if (editDialog && selectedBubble) {
            setEditNotifications(Array.isArray(selectedBubble.notifications) ? selectedBubble.notifications : []);
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

    // Внутри компонента:
    const [createNotifications, setCreateNotifications] = useState([]); // для создания
    const [editNotifications, setEditNotifications] = useState([]); // для редактирования

    return (
        <Box sx={{
            width: '100vw',
            height: '100vh',
            overflow: 'hidden',
            position: 'relative',
            background: theme.palette.background.bubbleView
        }}>
            {/* Заголовок и кнопки - адаптивный */}
            {!isMobile ? (
                <>
                    <Box sx={{
                        position: 'absolute',
                        top: 20,
                        left: 20,
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2
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
                        <Typography variant="h4" sx={{
                            color: themeMode === 'light' ? '#2C3E50' : 'white',
                            fontWeight: 'bold'
                        }}>
                            {/* 🫧 {t('bubbles.title')} */}
                            🫧
                        </Typography>
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
                // Mobile version without title
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
                        {/* Search field for desktop */}
                        <Box sx={{
                            maxWidth: 280,
                            minWidth: 200,
                            position: 'relative'
                        }}>
                            <SearchField
                                searchQuery={bubblesSearchQuery}
                                setSearchQuery={setBubblesSearchQuery}
                                size="small"
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        height: 36
                                    }
                                }}
                            />
                            {debouncedBubblesSearchQuery && debouncedBubblesSearchQuery.trim() && (
                                <Typography variant="caption" sx={{
                                    color: 'text.secondary',
                                    marginTop: 0.5,
                                    display: 'block',
                                    textAlign: 'center',
                                    position: 'absolute',
                                    left: 0,
                                    right: 0,
                                    fontSize: '11px'
                                }}>
                                    {t('bubbles.searchResults', { count: searchFoundBubbles.length })}
                                </Typography>
                            )}
                        </Box>

                        {/* View Mode Toggle */}
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
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
                            <Button
                                onClick={() => setFilterDrawerOpen(true)}
                                variant="outlined"
                                size="small"
                                startIcon={<FilterList />}
                                sx={{
                                    ...getOutlinedButtonStyles(),
                                    height: 36,
                                    backgroundColor: !isAllSelected()
                                        ? (themeMode === 'light' ? 'rgba(59, 125, 237, 0.15)' : 'rgba(255, 255, 255, 0.2)')
                                        : (themeMode === 'light' ? 'rgba(59, 125, 237, 0.08)' : 'transparent')
                                }}
                            >
                                {t('bubbles.filterButton')}
                            </Button>
                        </Box>



                    </Box>
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
                        {/* Search icon for Mobile */}
                        <IconButton
                            onClick={() => {
                                if (isSearchExpanded) {
                                    // Если строка поиска открыта, закрываем её и очищаем
                                    setBubblesSearchQuery('');
                                    setIsSearchExpanded(false);
                                } else {
                                    // Если строка поиска закрыта, открываем её
                                    setIsSearchExpanded(true);
                                }
                            }}
                            sx={{
                                ...getButtonStyles(),
                                backgroundColor: isSearchExpanded
                                    ? (themeMode === 'light' ? 'rgba(59, 125, 237, 0.25)' : 'rgba(255, 255, 255, 0.3)')
                                    : (themeMode === 'light' ? 'rgba(59, 125, 237, 0.15)' : 'rgba(255, 255, 255, 0.2)')
                            }}
                        >
                            <Search />
                        </IconButton>

                        {/* View Mode Toggle for Mobile */}
                        <IconButton
                            onClick={() => setListViewDialog(true)}
                            sx={getButtonStyles()}
                        >
                            <ViewList />
                        </IconButton>
                        <IconButton
                            onClick={() => setFilterDrawerOpen(true)}
                            sx={{
                                ...getButtonStyles(),
                                backgroundColor: !isAllSelected()
                                    ? (themeMode === 'light' ? 'rgba(59, 125, 237, 0.25)' : 'rgba(255, 255, 255, 0.3)')
                                    : (themeMode === 'light' ? 'rgba(59, 125, 237, 0.15)' : 'rgba(255, 255, 255, 0.2)')
                            }}
                        >
                            <FilterList />
                        </IconButton>



                    </Box>

                    {/* Search field for mobile - expanded state */}
                    {isSearchExpanded && (
                        <Box sx={{
                            position: 'absolute',
                            top: isSmallScreen ? 60 : 70,
                            left: 10,
                            right: 10,
                            zIndex: 1000,
                            marginTop: showInstructions ? (isSmallScreen ? 100 : 80) : 0,
                            transition: 'margin-top 0.3s ease'
                        }}>
                            <SearchField
                                searchQuery={bubblesSearchQuery}
                                setSearchQuery={setBubblesSearchQuery}
                                size="small"
                                autoFocus={true}
                                onBlur={() => {
                                    // Задержка для предотвращения закрытия при переключении фокуса
                                    setTimeout(() => {
                                        if (!bubblesSearchQuery.trim()) {
                                            setIsSearchExpanded(false);
                                        }
                                    }, 150);
                                }}
                                sx={{
                                    backgroundColor: themeMode === 'light'
                                        ? 'rgba(255, 255, 255, 0.95)'
                                        : 'rgba(30, 30, 30, 0.95)',
                                    backdropFilter: 'blur(10px)'
                                }}
                            />
                            {debouncedBubblesSearchQuery && debouncedBubblesSearchQuery.trim() && (
                                <Typography variant="caption" sx={{
                                    color: 'text.secondary',
                                    marginTop: 0.5,
                                    display: 'block',
                                    textAlign: 'center',
                                    backgroundColor: themeMode === 'light'
                                        ? 'rgba(255, 255, 255, 0.85)'
                                        : 'rgba(30, 30, 30, 0.85)',
                                    backdropFilter: 'blur(5px)',
                                    padding: '2px 8px',
                                    borderRadius: 1,
                                    fontSize: '11px'
                                }}>
                                    {t('bubbles.searchResults', { count: searchFoundBubbles.length })}
                                </Typography>
                            )}
                        </Box>
                    )}
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
            <Dialog
                open={editDialog}
                onClose={handleCloseDialog}
                maxWidth="sm"
                fullWidth
                fullScreen={isSmallScreen}
                PaperProps={{
                    sx: {
                        borderRadius: isSmallScreen ? 0 : 3,
                        ...getDialogPaperStyles(),
                        margin: isMobile ? 1 : 3
                    }
                }}
            >
                <DialogTitle sx={{
                    backgroundColor: 'primary.main',
                    color: 'white',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    {t('bubbles.editBubble')}
                    <IconButton
                        onClick={handleCloseDialog}
                        sx={{ color: 'white' }}
                    >
                        <CloseOutlined />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{
                    padding: isMobile ? 2 : 3,
                    maxWidth: '100%',
                    overflow: 'hidden'
                }}>
                    <TextField
                        autoFocus={!isMobile}
                        margin="dense"
                        label={t('bubbles.titleLabel')}
                        fullWidth
                        variant="outlined"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        sx={{
                            marginTop: 3,
                            '& .MuiInputBase-input': {
                                fontSize: isMobile ? 16 : 14 // Предотвращает zoom на iOS
                            }
                        }}
                    />
                    <TextField
                        margin="dense"
                        label={t('bubbles.descriptionLabel')}
                        fullWidth
                        variant="outlined"
                        multiline
                        rows={isMobile ? 4 : 3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        sx={{
                            '& .MuiInputBase-input': {
                                fontSize: isMobile ? 16 : 14, // Предотвращает zoom на iOS
                                wordBreak: 'break-word',
                                overflowWrap: 'break-word',
                                whiteSpace: 'pre-wrap'
                            },
                            '& .MuiInputBase-root': {
                                wordBreak: 'break-word',
                                overflowWrap: 'break-word'
                            },
                            '& .MuiOutlinedInput-root': {
                                wordBreak: 'break-word',
                                overflowWrap: 'break-word'
                            },
                            maxWidth: '100%',
                            marginTop: 2,
                            marginBottom: 2,
                        }}
                    />
                    <Box sx={{ marginTop: 1, marginBottom: 0, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ flex: 1 }}>
                            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
                                <DateTimePicker
                                    label={t('bubbles.dueDateLabel')}
                                    value={editDueDate}
                                    onChange={setEditDueDate}
                                    ampm={false}
                                    inputFormat="dd.MM.yyyy HH:mm"
                                    renderInput={(params) => (
                                        <TextField {...params} fullWidth margin="dense" sx={{ marginTop: 2, marginBottom: 2 }} />
                                    )}
                                />
                            </LocalizationProvider>
                        </Box>
                        {editDueDate && (
                            <IconButton onClick={() => { setEditDueDate(null); setEditNotifications([]); }} sx={{ mt: 1 }}>
                                <Clear />
                            </IconButton>
                        )}
                    </Box>
                    <Box >
                        <AddNotification
                            open={notifDialogOpen}
                            onClose={() => setNotifDialogOpen(false)}
                            onSave={val => setNotifValue(val)}
                            initialValue={notifValue}
                            notifications={editNotifications}
                            onAdd={notif => setEditNotifications(prev => [...prev, notif])}
                            onDelete={handleDeleteNotification}
                            dueDate={editDueDate}
                        />
                    </Box>
                    {/* Выбор тега */}
                    <FormControl fullWidth margin="dense" variant="outlined">
                        <InputLabel>{t('bubbles.categoryLabel')}</InputLabel>
                        <Select
                            value={selectedTagId}
                            onChange={(e) => setSelectedTagId(e.target.value)}
                            label={t('bubbles.categoryLabel')}
                            sx={{
                                '& .MuiSelect-select': {
                                    fontSize: isMobile ? 16 : 14
                                }
                            }}
                        >
                            <MenuItem value="">
                                <em>{t('bubbles.noCategory')}</em>
                            </MenuItem>
                            {tags.map(tag => (
                                <MenuItem key={tag.id} value={tag.id}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Box
                                            sx={{
                                                width: 16,
                                                height: 16,
                                                borderRadius: '50%',
                                                backgroundColor: tag.color,
                                                border: '1px solid #ccc'
                                            }}
                                        />
                                        {tag.name}
                                    </Box>
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {/* Слайдер размера пузыря */}
                    <Box sx={{
                        marginTop: 2,
                        marginBottom: 1,
                        width: isMobile ? '95%' : '100%',
                        marginX: isMobile ? 'auto' : 0
                    }}>
                        <Typography variant="body2" color="text.secondary" sx={{ marginBottom: 1 }}>
                            {t('bubbles.bubbleSizeLabel', { size: editBubbleSize })}
                        </Typography>
                        <Slider
                            value={editBubbleSize}
                            onChange={(event, newValue) => setEditBubbleSize(newValue)}
                            min={30}
                            max={80}
                            step={5}
                            marks={[
                                { value: 30, label: '30' },
                                { value: 45, label: '45' },
                                { value: 60, label: '60' },
                                { value: 80, label: '80' }
                            ]}
                            sx={{
                                '& .MuiSlider-thumb': {
                                    width: 20,
                                    height: 20,
                                },
                                '& .MuiSlider-track': {
                                    height: 4,
                                },
                                '& .MuiSlider-rail': {
                                    height: 4,
                                }
                            }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{
                    padding: isMobile ? 2 : 3,
                    display: 'flex',
                    justifyContent: 'space-between',
                    flexDirection: isSmallScreen ? 'column' : 'row',
                    gap: isSmallScreen ? 1 : 0
                }}>
                    <Box sx={{
                        display: 'flex',
                        gap: 1,
                        flexDirection: isSmallScreen ? 'column' : 'row',
                        order: isSmallScreen ? 3 : 1
                    }}>
                        <Button
                            onClick={handleDeleteBubble}
                            variant="outlined"
                            color="error"
                            startIcon={<DeleteOutlined />}
                            fullWidth={isSmallScreen}
                            sx={{
                                borderRadius: 2,
                                minHeight: isMobile ? 48 : 36
                            }}
                        >
                            {t('bubbles.deleteBubble')}
                        </Button>
                        <Button
                            onClick={handleMarkAsDone}
                            variant="outlined"
                            color="success"
                            startIcon={<CheckCircle />}
                            fullWidth={isSmallScreen}
                            sx={{
                                borderRadius: 2,
                                minHeight: isMobile ? 48 : 36
                            }}
                        >
                            {t('bubbles.markAsDone')}
                        </Button>
                    </Box>
                    <Box sx={{
                        display: 'flex',
                        gap: 1,
                        flexDirection: isSmallScreen ? 'column' : 'row',
                        width: isSmallScreen ? '100%' : 'auto',
                        order: isSmallScreen ? 1 : 2
                    }}>
                        <Button
                            onClick={handleCloseDialog}
                            color="inherit"
                            fullWidth={isSmallScreen}
                            sx={{
                                minHeight: isMobile ? 48 : 36,
                                order: isSmallScreen ? 2 : 1
                            }}
                        >
                            {t('bubbles.cancel')}
                        </Button>
                        <Button
                            onClick={handleSaveBubble}
                            variant="contained"
                            fullWidth={isSmallScreen}
                            sx={{
                                borderRadius: 2,
                                minHeight: isMobile ? 48 : 36,
                                order: isSmallScreen ? 1 : 2
                            }}
                        >
                            {t('bubbles.save')}
                        </Button>
                    </Box>
                </DialogActions>
            </Dialog>

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
            <Dialog
                open={tagDialog}
                onClose={handleCloseTagDialog}
                maxWidth="sm"
                fullWidth
                fullScreen={isSmallScreen}
            >
                <DialogTitle>
                    {editingTag ? t('bubbles.editTag') : t('bubbles.createTag')}
                </DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label={t('bubbles.tagName')}
                        fullWidth
                        variant="outlined"
                        value={tagName}
                        onChange={(e) => setTagName(e.target.value)}
                        sx={{
                            marginBottom: 2,
                            '& .MuiInputBase-input': {
                                fontSize: isMobile ? 16 : 14
                            }
                        }}
                    />
                    <Box sx={{ marginBottom: 2 }}>
                        <Typography sx={{ marginBottom: 2 }}>{t('bubbles.selectColor')}:</Typography>
                        <Box sx={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(5, 1fr)',
                            gap: 1.5,
                            maxWidth: 300,
                            margin: '0 auto'
                        }}>
                            {COLOR_PALETTE.map((color, index) => {
                                // Если редактируем тег, его текущий цвет всегда доступен
                                const isUsed = editingTag
                                    ? (!isColorAvailable(color) && color !== editingTag.color)
                                    : (!isColorAvailable(color) && color !== tagColor);
                                const isSelected = tagColor === color;

                                return (
                                    <Box
                                        key={index}
                                        onClick={() => {
                                            if (!isUsed) {
                                                setTagColor(color);
                                            }
                                        }}
                                        sx={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: '50%',
                                            backgroundColor: isUsed ? `${color}50` : color, // Полупрозрачный фон для занятых
                                            border: isSelected
                                                ? '3px solid #1976d2'
                                                : isUsed
                                                    ? `3px solid ${color}`
                                                    : 'none',
                                            cursor: isUsed ? 'not-allowed' : 'pointer',
                                            position: 'relative',
                                            transition: 'all 0.2s ease',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            '&:hover': {
                                                transform: !isUsed ? 'scale(1.1)' : 'none',
                                                boxShadow: !isUsed ? '0 4px 8px rgba(0,0,0,0.2)' : 'none'
                                            }
                                        }}
                                    >
                                        {isSelected && (
                                            <Box
                                                sx={{
                                                    position: 'absolute',
                                                    top: '50%',
                                                    left: '50%',
                                                    transform: 'translate(-50%, -50%)',
                                                    color: 'white',
                                                    fontSize: '16px',
                                                    textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
                                                }}
                                            >
                                                ✓
                                            </Box>
                                        )}
                                    </Box>
                                );
                            })}
                        </Box>
                        {!canCreateMoreTags() && !editingTag && (
                            <Typography
                                variant="body2"
                                color="error"
                                sx={{ textAlign: 'center', marginTop: 2 }}
                            >
                                {t('bubbles.noMoreColors')}
                            </Typography>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseTagDialog}>{t('bubbles.cancel')}</Button>
                    <Button
                        onClick={handleSaveTag}
                        variant="contained"
                        disabled={
                            !tagName.trim() ||
                            (!editingTag && !isColorAvailable(tagColor)) ||
                            (editingTag && editingTag.color !== tagColor && !isColorAvailable(tagColor))
                        }
                    >
                        {editingTag ? t('bubbles.save') : t('bubbles.create')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Левое главное меню */}
            <Drawer
                anchor="left"
                open={menuDrawerOpen}
                onClose={() => setMenuDrawerOpen(false)}
                PaperProps={{
                    sx: {
                        width: isMobile ? '70%' : 300,
                        maxWidth: '85%',
                        backgroundColor: themeMode === 'light' ? '#FFFFFF' : '#1e1e1e'
                    }
                }}
            >
                <Box sx={{ padding: 0 }}>
                    {/* Заголовок и логотип */}
                    <Box sx={{
                        padding: 3,
                        paddingBottom: 2,
                        borderBottom: themeMode === 'light' ? '1px solid #E0E0E0' : '1px solid #333333'
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, marginBottom: 2 }}>
                            <Typography variant="h6" sx={{
                                fontWeight: 'bold',
                                color: themeMode === 'light' ? '#2C3E50' : '#ffffff'
                            }}>
                                ToROUND
                            </Typography>
                        </Box>
                    </Box>

                    {/* Пункты меню */}
                    <List sx={{ padding: 0 }}>
                        {/* Language Selector */}
                        <ListItem sx={{ padding: '16px 24px' }}>
                            <ListItemIcon sx={{ minWidth: 40 }}>
                                <Typography sx={{
                                    color: themeMode === 'light' ? '#BDC3C7' : '#aaaaaa',
                                    fontSize: '20px'
                                }}>
                                    🌐
                                </Typography>
                            </ListItemIcon>
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="body2" sx={{
                                    color: themeMode === 'light' ? '#2C3E50' : '#ffffff',
                                    fontWeight: 500,
                                    marginBottom: 1
                                }}>
                                    {t('language.title')}
                                </Typography>
                                <LanguageSelector themeMode={themeMode} />
                            </Box>
                        </ListItem>

                        <Divider sx={{
                            backgroundColor: themeMode === 'light' ? '#E0E0E0' : '#333333',
                            margin: '8px 0'
                        }} />

                        {/* Theme Toggle */}
                        <ListItem sx={{ padding: '16px 24px' }}>
                            <ListItemIcon sx={{ minWidth: 40 }}>
                                <Typography sx={{
                                    color: themeMode === 'light' ? '#BDC3C7' : '#aaaaaa',
                                    fontSize: '20px'
                                }}>
                                    🎨
                                </Typography>
                            </ListItemIcon>
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="body2" sx={{
                                    color: themeMode === 'light' ? '#2C3E50' : '#ffffff',
                                    fontWeight: 500,
                                    marginBottom: 1
                                }}>
                                    {t('theme.title')}
                                </Typography>
                                <ThemeToggle {...themeToggleProps} toggleTheme={toggleTheme} size="small" />
                            </Box>
                        </ListItem>

                        <Divider sx={{
                            backgroundColor: themeMode === 'light' ? '#E0E0E0' : '#333333',
                            margin: '8px 0'
                        }} />

                        {/* Task categories */}
                        <ListItem
                            button
                            onClick={() => {
                                setMenuDrawerOpen(false);
                                setCategoriesDialog(true);
                            }}
                            sx={{
                                padding: '16px 24px',
                                cursor: 'pointer',
                                '&:hover': {
                                    backgroundColor: themeMode === 'light' ? '#F8F9FA' : '#333333'
                                }
                            }}
                        >
                            <ListItemIcon sx={{ minWidth: 40 }}>
                                {/* <Category sx={{ color: '#BDC3C7' }} /> */}
                                <Sell sx={{ color: themeMode === 'light' ? '#BDC3C7' : '#aaaaaa' }} />
                            </ListItemIcon>
                            <ListItemText
                                primary={t('bubbles.taskCategories')}
                                primaryTypographyProps={{
                                    color: themeMode === 'light' ? '#2C3E50' : '#ffffff',
                                    fontWeight: 500
                                }}
                            />
                        </ListItem>

                        {/* Font Settings */}
                        <ListItem
                            button
                            onClick={() => {
                                setMenuDrawerOpen(false);
                                setFontSettingsDialog(true);
                            }}
                            sx={{
                                padding: '16px 24px',
                                cursor: 'pointer',
                                '&:hover': {
                                    backgroundColor: themeMode === 'light' ? '#F8F9FA' : '#333333'
                                }
                            }}
                        >
                            <ListItemIcon sx={{ minWidth: 40 }}>
                                <Settings sx={{ color: themeMode === 'light' ? '#BDC3C7' : '#aaaaaa' }} />
                            </ListItemIcon>
                            <ListItemText
                                primary={t('bubbles.fontSettings')}
                                primaryTypographyProps={{
                                    color: themeMode === 'light' ? '#2C3E50' : '#ffffff',
                                    fontWeight: 500
                                }}
                            />
                        </ListItem>

                        {/* Bubble Background Toggle */}
                        <ListItem sx={{ padding: '16px 24px' }}>
                            <ListItemIcon sx={{ minWidth: 40 }}>
                                <Typography sx={{
                                    color: themeMode === 'light' ? '#BDC3C7' : '#aaaaaa',
                                    fontSize: '20px'
                                }}>
                                    🎨
                                </Typography>
                            </ListItemIcon>
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="body2" sx={{
                                    color: themeMode === 'light' ? '#2C3E50' : '#ffffff',
                                    fontWeight: 500,
                                    marginBottom: 1
                                }}>
                                    {t('bubbles.bubbleBackground')}
                                </Typography>
                                <Switch
                                    checked={bubbleBackgroundEnabled}
                                    onChange={handleToggleBubbleBackground}
                                    size="small"
                                    sx={{
                                        '& .MuiSwitch-switchBase.Mui-checked': {
                                            color: themeMode === 'light' ? '#3B7DED' : '#90CAF9'
                                        },
                                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                            backgroundColor: themeMode === 'light' ? '#3B7DED' : '#90CAF9'
                                        }
                                    }}
                                />
                            </Box>
                        </ListItem>

                        {/* About */}
                        <ListItem
                            button
                            onClick={() => {
                                setMenuDrawerOpen(false);
                                // TODO: Добавить логику для About
                            }}
                            sx={{
                                padding: '16px 24px',
                                cursor: 'pointer',
                                '&:hover': {
                                    backgroundColor: themeMode === 'light' ? '#F8F9FA' : '#333333'
                                }
                            }}
                        >
                            <ListItemIcon sx={{ minWidth: 40 }}>
                                <Info sx={{ color: themeMode === 'light' ? '#BDC3C7' : '#aaaaaa' }} />
                            </ListItemIcon>
                            <ListItemText
                                primary={t('bubbles.about')}
                                primaryTypographyProps={{
                                    color: themeMode === 'light' ? '#2C3E50' : '#ffffff',
                                    fontWeight: 500
                                }}
                            />
                        </ListItem>

                        <Divider sx={{
                            backgroundColor: themeMode === 'light' ? '#E0E0E0' : '#333333',
                            margin: '8px 0'
                        }} />

                        {/* Logout */}
                        <ListItem
                            button
                            onClick={() => {
                                setMenuDrawerOpen(false);
                                handleLogout();
                            }}
                            sx={{
                                padding: '16px 24px',
                                cursor: 'pointer',
                                '&:hover': {
                                    backgroundColor: themeMode === 'light' ? '#FFEBEE' : '#4A1418'
                                }
                            }}
                        >
                            <ListItemIcon sx={{ minWidth: 40 }}>
                                <Logout sx={{ color: themeMode === 'light' ? '#D32F2F' : '#FF8A80' }} />
                            </ListItemIcon>
                            <ListItemText
                                primary={t('auth.logout')}
                                primaryTypographyProps={{
                                    color: themeMode === 'light' ? '#D32F2F' : '#FF8A80',
                                    fontWeight: 500
                                }}
                            />
                        </ListItem>
                    </List>
                </Box>
            </Drawer>

            {/* Боковое меню фильтрации */}
            <Drawer
                anchor="right"
                open={filterDrawerOpen}
                onClose={() => setFilterDrawerOpen(false)}
                PaperProps={{
                    sx: {
                        width: isMobile ? '85%' : 350,
                        maxWidth: '90%',
                        backgroundColor: '#2C3E50',
                        color: 'white'
                    }
                }}
            >
                <Box sx={{ padding: 0 }}>
                    {/* Заголовок */}
                    <Box sx={{ padding: 2, paddingBottom: 1 }}>
                        <IconButton
                            onClick={() => setFilterDrawerOpen(false)}
                            sx={{ color: 'white', padding: 0, marginBottom: 1 }}
                        >
                            <CloseOutlined />
                        </IconButton>

                        {/* Текст с галочкой на одной линии */}
                        <Box sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <Typography variant="body2" sx={{ color: '#BDC3C7', lineHeight: 1.3 }}>
                                {t('bubbles.chooseCategoriesText')}
                            </Typography>
                            <IconButton
                                onClick={isAllSelected() ? clearAllFilters : selectAllFilters}
                                sx={{
                                    color: 'white',
                                    backgroundColor: isAllSelected() ? 'rgba(255,255,255,0.1)' : 'transparent',
                                    '&:hover': {
                                        backgroundColor: 'rgba(255,255,255,0.2)'
                                    },
                                    padding: '4px'
                                }}
                            >
                                <Check />
                            </IconButton>
                        </Box>
                    </Box>

                    {/* Список категорий */}
                    <Box sx={{ paddingX: 0 }}>
                        {/* No tag категория */}
                        <Box
                            onClick={handleNoTagFilterChange}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '16px 20px',
                                borderBottom: '1px solid rgba(255,255,255,0.1)',
                                cursor: 'pointer',
                                '&:hover': {
                                    backgroundColor: 'rgba(255,255,255,0.05)'
                                }
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Box
                                    sx={{
                                        width: 24,
                                        height: 24,
                                        borderRadius: '50%',
                                        backgroundColor: '#B0B0B0',
                                        border: '2px solid #B0B0B0'
                                    }}
                                />
                                <Typography sx={{ color: 'white' }}>
                                    {t('bubbles.noTag')} <Box component="span" sx={{ color: 'rgba(255,255,255,0.6)' }}>{getBubbleCountByTagForBubblesView(null)}</Box>
                                </Typography>
                            </Box>
                            {showNoTag && (
                                <Check sx={{ color: 'white', fontSize: '20px' }} />
                            )}
                        </Box>

                        {/* Остальные теги */}
                        {tags.map(tag => (
                            <Box
                                key={tag.id}
                                onClick={() => handleTagFilterChange(tag.id)}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '16px 20px',
                                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                                    cursor: 'pointer',
                                    '&:hover': {
                                        backgroundColor: 'rgba(255,255,255,0.05)'
                                    }
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Box
                                        sx={{
                                            width: 24,
                                            height: 24,
                                            borderRadius: '50%',
                                            backgroundColor: tag.color,
                                            border: `2px solid ${tag.color}`
                                        }}
                                    />
                                    <Typography sx={{ color: 'white' }}>
                                        {tag.name} <Box component="span" sx={{ color: 'rgba(255,255,255,0.6)' }}>{getBubbleCountByTagForBubblesView(tag.id)}</Box>
                                    </Typography>
                                </Box>
                                {filterTags.includes(tag.id) && (
                                    <Check sx={{ color: 'white', fontSize: '20px' }} />
                                )}
                            </Box>
                        ))}
                    </Box>
                </Box>
            </Drawer>

            {/* Диалог создания нового пузыря */}
            <Dialog
                open={createDialog}
                onClose={() => setCreateDialog(false)}
                maxWidth="sm"
                fullWidth
                fullScreen={isSmallScreen}
                PaperProps={{
                    sx: {
                        borderRadius: isSmallScreen ? 0 : 3,
                        ...getDialogPaperStyles(),
                        margin: isMobile ? 1 : 3
                    }
                }}
            >
                <DialogTitle sx={{
                    backgroundColor: 'primary.main',
                    color: 'white',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    {t('bubbles.createNewBubble')}
                    <IconButton
                        onClick={() => setCreateDialog(false)}
                        sx={{ color: 'white' }}
                    >
                        <CloseOutlined />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{
                    padding: isMobile ? 2 : 3,
                    maxWidth: '100%',
                    overflow: 'hidden'
                }}>
                    <TextField
                        autoFocus={!isMobile}
                        margin="dense"
                        label={t('bubbles.titleLabel')}
                        fullWidth
                        variant="outlined"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        sx={{
                            marginBottom: 2,
                            '& .MuiInputBase-input': {
                                fontSize: isMobile ? 16 : 14
                            }
                        }}
                    />
                    <TextField
                        margin="dense"
                        label={t('bubbles.descriptionLabel')}
                        fullWidth
                        variant="outlined"
                        multiline
                        rows={isMobile ? 4 : 3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        sx={{
                            '& .MuiInputBase-input': {
                                fontSize: isMobile ? 16 : 14,
                                wordBreak: 'break-word',
                                overflowWrap: 'break-word',
                                whiteSpace: 'pre-wrap'
                            },
                            '& .MuiInputBase-root': {
                                wordBreak: 'break-word',
                                overflowWrap: 'break-word'
                            },
                            '& .MuiOutlinedInput-root': {
                                wordBreak: 'break-word',
                                overflowWrap: 'break-word'
                            },
                            maxWidth: '100%',
                        }}
                    />
                    <Box sx={{ marginTop: 1, marginBottom: 0, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ flex: 1 }}>
                            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
                                <DateTimePicker
                                    label={t('bubbles.dueDateLabel')}
                                    value={dueDate}
                                    onChange={setDueDate}
                                    ampm={false}
                                    inputFormat="dd.MM.yyyy HH:mm"
                                    renderInput={(params) => (
                                        <TextField {...params} fullWidth margin="dense" sx={{ marginTop: 2, marginBottom: 2 }} />
                                    )}
                                />
                            </LocalizationProvider>
                        </Box>
                        {dueDate && (
                            <IconButton onClick={() => { setDueDate(null); setCreateNotifications([]); }} sx={{ mt: 1 }}>
                                <Clear />
                            </IconButton>
                        )}
                    </Box>
                    <Box>
                        <AddNotification
                            open={notifDialogOpen}
                            onClose={() => setNotifDialogOpen(false)}
                            onSave={val => setNotifValue(val)}
                            initialValue={notifValue}
                            notifications={createNotifications}
                            onAdd={notif => setCreateNotifications(prev => [...prev, notif])}
                            onDelete={handleDeleteCreateNotification}
                            dueDate={dueDate}
                        />
                    </Box>
                    {/* Выбор тега */}
                    <FormControl fullWidth margin="dense" variant="outlined">
                        <InputLabel>{t('bubbles.categoryLabel')}</InputLabel>
                        <Select
                            value={selectedTagId}
                            onChange={(e) => setSelectedTagId(e.target.value)}
                            label={t('bubbles.categoryLabel')}
                            sx={{
                                '& .MuiSelect-select': {
                                    fontSize: isMobile ? 16 : 14
                                }
                            }}
                        >
                            <MenuItem value="">
                                <em>{t('bubbles.noCategory')}</em>
                            </MenuItem>
                            {tags.map(tag => (
                                <MenuItem key={tag.id} value={tag.id}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Box
                                            sx={{
                                                width: 16,
                                                height: 16,
                                                borderRadius: '50%',
                                                backgroundColor: tag.color,
                                                border: '1px solid #ccc'
                                            }}
                                        />
                                        {tag.name}
                                    </Box>
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {/* Слайдер размера пузыря */}
                    <Box sx={{
                        marginTop: 2,
                        marginBottom: 1,
                        width: isMobile ? '95%' : '100%',
                        marginX: isMobile ? 'auto' : 0
                    }}>
                        <Typography variant="body2" color="text.secondary" sx={{ marginBottom: 1 }}>
                            {t('bubbles.bubbleSizeLabel', { size: bubbleSize })}
                        </Typography>
                        <Slider
                            value={bubbleSize}
                            onChange={(event, newValue) => setBubbleSize(newValue)}
                            min={30}
                            max={80}
                            step={5}
                            marks={[
                                { value: 30, label: '30' },
                                { value: 45, label: '45' },
                                { value: 60, label: '60' },
                                { value: 80, label: '80' }
                            ]}
                            sx={{
                                '& .MuiSlider-thumb': {
                                    width: 20,
                                    height: 20,
                                },
                                '& .MuiSlider-track': {
                                    height: 4,
                                },
                                '& .MuiSlider-rail': {
                                    height: 4,
                                }
                            }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{
                    padding: isMobile ? 2 : 3,
                    display: 'flex',
                    justifyContent: 'space-between',
                    flexDirection: isSmallScreen ? 'column' : 'row',
                    gap: isSmallScreen ? 1 : 0
                }}>
                    <Button
                        onClick={() => setCreateDialog(false)}
                        color="inherit"
                        fullWidth={isSmallScreen}
                        sx={{
                            minHeight: isMobile ? 48 : 36
                        }}
                    >
                        {t('bubbles.cancel')}
                    </Button>
                    <Button
                        onClick={createNewBubble}
                        variant="contained"
                        fullWidth={isSmallScreen}
                        sx={{
                            borderRadius: 2,
                            minHeight: isMobile ? 48 : 36
                        }}
                    >
                        {t('bubbles.create')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Диалог управления категориями задач */}
            <Dialog
                open={categoriesDialog}
                onClose={() => setCategoriesDialog(false)}
                maxWidth="sm"
                fullWidth
                fullScreen={isSmallScreen}
                PaperProps={{
                    sx: {
                        borderRadius: isSmallScreen ? 0 : 3,
                        ...getDialogPaperStyles(),
                        margin: isMobile ? 1 : 3,
                        position: isMobile ? 'relative' : 'static'
                    }
                }}
            >
                <DialogTitle sx={{
                    backgroundColor: 'primary.main',
                    color: 'white',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    {t('bubbles.taskCategories')}
                    <IconButton
                        onClick={() => setCategoriesDialog(false)}
                        sx={{ color: 'white' }}
                    >
                        <CloseOutlined />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ padding: isMobile ? 2 : 3, paddingTop: isMobile ? 4 : 5, paddingBottom: isMobile ? 10 : 0 }}>
                    {/* Список существующих категорий */}
                    {tags.length > 0 ? (
                        <List sx={{ padding: 0, marginTop: 3 }}>
                            {tags.map(tag => {
                                const isDeleting = deletingTags.has(tag.id);

                                return (
                                    <ListItem
                                        key={tag.id}
                                        sx={{
                                            // border: themeMode === 'light' ? '1px solid #E0E0E0' : '1px solid #333333',
                                            border: '1px solid #E0E0E0',
                                            borderRadius: 2,
                                            marginBottom: 1,
                                            padding: 2,
                                            opacity: isDeleting ? 0.7 : 1,
                                            transition: 'opacity 0.3s ease'
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                                            {!isDeleting && (
                                                <Box
                                                    sx={{
                                                        width: 24,
                                                        height: 24,
                                                        borderRadius: '50%',
                                                        backgroundColor: tag.color,
                                                        border: '2px solid #E0E0E0'
                                                    }}
                                                />
                                            )}
                                            <Box sx={{ flex: 1 }}>
                                                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                                                    {isDeleting ? (
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <DeleteOutlined sx={{ fontSize: 20, color: 'text.secondary' }} />
                                                            {t('bubbles.tagDeleted')}
                                                        </Box>
                                                    ) : (
                                                        tag.name
                                                    )}
                                                </Typography>
                                                {!isDeleting && (
                                                    <Typography variant="body2" color="text.secondary">
                                                        {getBubbleCountByTag(tag.id)} {getBubbleCountByTag(tag.id) === 1 ? t('bubbles.bubble') : t('bubbles.bubbles')}
                                                    </Typography>
                                                )}
                                            </Box>
                                            <Box sx={{ display: 'flex', gap: 1 }}>
                                                {isDeleting ? (
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        onClick={() => handleUndoDeleteTag(tag.id)}
                                                        sx={{
                                                            color: 'primary.main',
                                                            borderColor: 'primary.main',
                                                            textTransform: 'none',
                                                            fontSize: '0.75rem',
                                                            padding: '4px 8px'
                                                        }}
                                                    >
                                                        {t('bubbles.undo')}
                                                    </Button>
                                                ) : (
                                                    <>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => {
                                                                setCategoriesDialog(false);
                                                                handleOpenTagDialog(tag);
                                                            }}
                                                            sx={{ color: 'primary.main' }}
                                                        >
                                                            <Edit fontSize="small" />
                                                        </IconButton>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleDeleteTag(tag.id)}
                                                            sx={{ color: 'error.main' }}
                                                        >
                                                            <DeleteOutlined fontSize="small" />
                                                        </IconButton>
                                                    </>
                                                )}
                                            </Box>
                                        </Box>
                                    </ListItem>
                                );
                            })}
                        </List>
                    ) : (
                        <Box sx={{
                            textAlign: 'center',
                            padding: 4,
                            marginTop: 3,
                            color: 'text.secondary'
                        }}>
                            <Category sx={{ fontSize: 48, marginBottom: 2, opacity: 0.5 }} />
                            <Typography variant="h6" gutterBottom>
                                {t('bubbles.noCategoriesYet')}
                            </Typography>
                            <Typography variant="body2">
                                {t('bubbles.createFirstCategory')}
                            </Typography>
                        </Box>
                    )}
                </DialogContent>

                {/* Футер для десктопа */}
                {!isMobile && (
                    <Box sx={{
                        borderTop: themeMode === 'light' ? '1px solid #E0E0E0' : '1px solid #333333',
                        padding: 3,
                        textAlign: 'center',
                        backgroundColor: 'transparent'
                    }}>
                        <Button
                            variant="text"
                            startIcon={<Add />}
                            onClick={() => {
                                if (canCreateMoreTags()) {
                                    setCategoriesDialog(false);
                                    handleOpenTagDialog();
                                }
                            }}
                            disabled={!canCreateMoreTags()}
                            sx={{
                                backgroundColor: 'transparent',
                                color: canCreateMoreTags()
                                    ? (themeMode === 'light' ? '#757575' : '#aaaaaa')
                                    : (themeMode === 'light' ? '#B0B0B0' : '#666666'),
                                borderRadius: 2,
                                padding: '12px 24px',
                                textTransform: 'none',
                                fontWeight: 500,
                                minWidth: 140,
                                fontSize: '14px',
                                border: 'none',
                                '&:hover': {
                                    backgroundColor: canCreateMoreTags()
                                        ? (themeMode === 'light' ? 'rgba(117, 117, 117, 0.08)' : 'rgba(255, 255, 255, 0.1)')
                                        : 'transparent'
                                },
                                '& .MuiButton-startIcon': {
                                    color: canCreateMoreTags()
                                        ? (themeMode === 'light' ? '#757575' : '#aaaaaa')
                                        : (themeMode === 'light' ? '#B0B0B0' : '#666666'),
                                    marginRight: 1.5,
                                    fontSize: '20px'
                                }
                            }}
                        >
                            {canCreateMoreTags() ? t('bubbles.addTag') : t('bubbles.maxCategoriesReached')}
                        </Button>
                    </Box>
                )}

                {/* Плавающая кнопка для мобильного */}
                {isMobile && (
                    <Box sx={{
                        position: 'absolute',
                        bottom: 16,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 1001
                    }}>
                        <Button
                            variant="text"
                            startIcon={<Add />}
                            onClick={() => {
                                if (canCreateMoreTags()) {
                                    setCategoriesDialog(false);
                                    handleOpenTagDialog();
                                }
                            }}
                            disabled={!canCreateMoreTags()}
                            sx={{
                                backgroundColor: 'transparent',
                                color: canCreateMoreTags()
                                    ? (themeMode === 'light' ? '#757575' : '#aaaaaa')
                                    : (themeMode === 'light' ? '#B0B0B0' : '#666666'),
                                borderRadius: 2,
                                padding: '12px 24px',
                                textTransform: 'none',
                                fontWeight: 500,
                                minWidth: 140,
                                fontSize: '14px',
                                border: 'none',
                                '&:hover': {
                                    backgroundColor: canCreateMoreTags()
                                        ? (themeMode === 'light' ? 'rgba(117, 117, 117, 0.08)' : 'rgba(255, 255, 255, 0.1)')
                                        : 'transparent'
                                },
                                '& .MuiButton-startIcon': {
                                    color: canCreateMoreTags()
                                        ? (themeMode === 'light' ? '#757575' : '#aaaaaa')
                                        : (themeMode === 'light' ? '#B0B0B0' : '#666666'),
                                    marginRight: 1.5,
                                    fontSize: '20px'
                                }
                            }}
                        >
                            {canCreateMoreTags() ? t('bubbles.addTag') : t('bubbles.maxCategoriesReached')}
                        </Button>
                    </Box>
                )}


            </Dialog>

            {/* Диалог настроек шрифта */}
            <Dialog
                open={fontSettingsDialog}
                onClose={() => setFontSettingsDialog(false)}
                maxWidth="sm"
                fullWidth
                fullScreen={isSmallScreen}
                PaperProps={{
                    sx: {
                        borderRadius: isSmallScreen ? 0 : 3,
                        ...getDialogPaperStyles(),
                        margin: isMobile ? 1 : 3
                    }
                }}
            >
                <DialogTitle sx={{
                    backgroundColor: 'primary.main',
                    color: 'white',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    {t('bubbles.fontSettings')}
                    <IconButton
                        onClick={() => setFontSettingsDialog(false)}
                        sx={{ color: 'white' }}
                    >
                        <CloseOutlined />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ padding: isMobile ? 2 : 3 }}>
                    <Typography variant="h6" gutterBottom>
                        {t('bubbles.fontSizeLabel')}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, marginBottom: 3 }}>
                        <Typography variant="body2" sx={{ minWidth: 40 }}>
                            {t('bubbles.small')}
                        </Typography>
                        <Box sx={{ flex: 1 }}>
                            <Box
                                component="input"
                                type="range"
                                min="8"
                                max="20"
                                value={fontSize}
                                onChange={(e) => handleFontSizeChange(parseInt(e.target.value))}
                                sx={{
                                    width: '100%',
                                    height: 6,
                                    borderRadius: 3,
                                    appearance: 'none',
                                    backgroundColor: '#E0E0E0',
                                    outline: 'none',
                                    cursor: 'pointer',
                                    background: `linear-gradient(to right, #1976d2 0%, #1976d2 ${((fontSize - 8) / 12) * 100}%, #E0E0E0 ${((fontSize - 8) / 12) * 100}%, #E0E0E0 100%)`,
                                    '&::-webkit-slider-thumb': {
                                        appearance: 'none',
                                        width: 20,
                                        height: 20,
                                        borderRadius: '50%',
                                        backgroundColor: '#1976d2',
                                        cursor: 'pointer',
                                        border: '2px solid white',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                    },
                                    '&::-moz-range-thumb': {
                                        width: 20,
                                        height: 20,
                                        borderRadius: '50%',
                                        backgroundColor: '#1976d2',
                                        cursor: 'pointer',
                                        border: '2px solid white',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                    }
                                }}
                            />
                        </Box>
                        <Typography variant="body2" sx={{ minWidth: 40 }}>
                            {t('bubbles.large')}
                        </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ marginBottom: 2 }}>
                        {t('bubbles.currentSize')}: {fontSize}px
                    </Typography>

                    {/* Предварительный просмотр */}
                    <Box sx={{
                        border: '1px solid #E0E0E0',
                        borderRadius: 2,
                        padding: 2,
                        backgroundColor: '#F5F5F5',
                        textAlign: 'center',
                        minHeight: 60,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Typography sx={{
                            fontSize: isMobile ? fontSize * 0.75 : fontSize,
                            fontWeight: 'bold',
                            color: '#2C3E50'
                        }}>
                            {t('bubbles.previewText')}
                        </Typography>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ padding: isMobile ? 2 : 3 }}>
                    <Button
                        onClick={() => setFontSettingsDialog(false)}
                        color="inherit"
                        fullWidth={isSmallScreen}
                    >
                        {t('bubbles.close')}
                    </Button>
                    <Button
                        onClick={() => {
                            handleFontSizeChange(12); // Сброс к значению по умолчанию
                        }}
                        variant="outlined"
                        fullWidth={isSmallScreen}
                    >
                        {t('bubbles.reset')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Диалог подтверждения выхода */}
            <Dialog
                open={logoutDialog}
                onClose={() => setLogoutDialog(false)}
                maxWidth="xs"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        ...getDialogPaperStyles(),
                        margin: isMobile ? 1 : 3
                    }
                }}
            >
                <DialogTitle sx={{
                    backgroundColor: 'primary.main',
                    color: 'white',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    {t('auth.logoutConfirm')}
                    <IconButton
                        onClick={() => setLogoutDialog(false)}
                        sx={{ color: 'white' }}
                    >
                        <CloseOutlined />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ padding: isMobile ? 2 : 3 }}>
                    <Typography variant="body1" sx={{ textAlign: 'center', padding: 2 }}>
                        {t('auth.logoutMessage')}
                    </Typography>
                </DialogContent>
                <DialogActions sx={{
                    padding: isMobile ? 2 : 3,
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 2
                }}>
                    <Button
                        onClick={() => setLogoutDialog(false)}
                        color="inherit"
                        variant="outlined"
                        fullWidth
                        sx={{
                            borderRadius: 2,
                            minHeight: isMobile ? 48 : 36
                        }}
                    >
                        {t('bubbles.cancel')}
                    </Button>
                    <Button
                        onClick={confirmLogout}
                        color="primary"
                        variant="contained"
                        fullWidth
                        sx={{
                            borderRadius: 2,
                            minHeight: isMobile ? 48 : 36
                        }}
                    >
                        {t('auth.approveLogout')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Боковая панель списка задач */}
            <Drawer
                anchor="right"
                open={listViewDialog}
                onClose={() => setListViewDialog(false)}
                PaperProps={{
                    sx: {
                        width: isMobile ? '100%' : '60%',
                        maxWidth: isMobile ? '100%' : '800px',
                        backgroundColor: themeMode === 'light' ? '#FFFFFF' : '#1e1e1e'
                    }
                }}
            >
                <Box sx={{
                    backgroundColor: 'primary.main',
                    color: 'white',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px 24px',
                    borderBottom: themeMode === 'light' ? '1px solid #E0E0E0' : '1px solid #333333'
                }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        {t('bubbles.listView')}
                    </Typography>
                    <IconButton
                        onClick={() => setListViewDialog(false)}
                        sx={{ color: 'white' }}
                    >
                        <CloseOutlined />
                    </IconButton>
                </Box>
                <Box sx={{ height: 'calc(100vh - 73px)', overflow: 'auto' }}>
                    <ListView
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
                        themeMode={themeMode}
                    />
                </Box>
            </Drawer>

        </Box>
    );
};

export default BubblesPage;