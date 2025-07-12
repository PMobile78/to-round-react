import React, { useEffect, useRef, useState } from 'react';
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
    Menu,
    ListItemIcon,
    ListItemText,
    Drawer,
    Checkbox,
    FormControlLabel,
    List,
    ListItem,
    Divider,

} from '@mui/material';
import { CloseOutlined, DeleteOutlined, Add, Clear, Label, Edit, LocalOffer, Logout, FilterList, Check, Menu as MenuIcon, Settings, Info, Category, Sell, CheckCircle, ViewList, Restore, ViewModule, Sort, ArrowUpward, ArrowDownward, KeyboardArrowDown } from '@mui/icons-material';
import Matter from 'matter-js';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '../components/LanguageSelector';
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



const BubblesPage = ({ user }) => {
    const { t } = useTranslation();
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
    const [filterTags, setFilterTags] = useState([]); // Массив ID выбранных тегов для фильтрации  
    const [showNoTag, setShowNoTag] = useState(true); // Показывать ли пузыри без тегов
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
    const [listSortBy, setListSortBy] = useState('createdAt'); // 'createdAt', 'updatedAt', 'title', 'tag'
    const [listSortOrder, setListSortOrder] = useState('desc'); // 'asc', 'desc'
    const [listFilterTags, setListFilterTags] = useState([]); // Массив ID выбранных тегов для фильтрации в списке
    const [listShowNoTag, setListShowNoTag] = useState(true); // Показывать ли задачи без тегов в списке
    const [categoriesMenuAnchor, setCategoriesMenuAnchor] = useState(null); // Якорь для меню выбора категорий
    const [showInstructions, setShowInstructions] = useState(() => {
        const saved = localStorage.getItem('bubbles-show-instructions');
        return saved === null ? true : saved === 'true';
    }); // Показывать ли подсказки инструкций

    // Note: Functions moved to firestoreService.js for better organization

    // Function to get canvas dimensions depending on screen size
    const getCanvasSize = () => {
        const padding = isMobile ? 10 : 40;
        const headerHeight = isMobile ? 80 : 100;

        return {
            width: window.innerWidth - padding,
            height: window.innerHeight - headerHeight
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
        engine.world.gravity.y = 0.3;

        // Getting adaptive canvas sizes
        const canvasSize = getCanvasSize();
        setCanvasSize(canvasSize);

        // Create renderer
        const render = Render.create({
            element: canvas,
            engine,
            options: {
                width: canvasSize.width,
                height: canvasSize.height,
                wireframes: false,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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

                        const bubble = {
                            id: storedBubble.id,
                            body: Matter.Bodies.circle(x, y, storedBubble.radius, {
                                restitution: 0.8,
                                frictionAir: 0.01,
                                render: {
                                    fillStyle: storedBubble.fillStyle || 'transparent',
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
                            deletedAt: storedBubble.deletedAt || null
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
            const newSize = getCanvasSize();

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
    }, [isMobile, isSmallScreen]);

    // Update canvas when breakpoints change
    useEffect(() => {
        if (engineRef.current && renderRef.current) {
            const { World } = Matter;
            const newSize = getCanvasSize();

            // Update renderer dimensions
            renderRef.current.canvas.width = newSize.width;
            renderRef.current.canvas.height = newSize.height;
            renderRef.current.options.width = newSize.width;
            renderRef.current.options.height = newSize.height;
            setCanvasSize(newSize);

            // Update boundaries
            if (wallsRef.current.length > 0) {
                World.remove(engineRef.current.world, wallsRef.current);
            }

            const newWalls = createWorldBounds(newSize.width, newSize.height);
            wallsRef.current = newWalls;
            World.add(engineRef.current.world, newWalls);

            // Correct bubble positions when breakpoint changes
            const allBodies = engineRef.current.world.bodies.filter(body => body.label === 'Circle Body');
            allBodies.forEach(body => {
                const radius = body.circleRadius;
                let corrected = false;

                if (body.position.x - radius < 0) {
                    Matter.Body.setPosition(body, { x: radius, y: body.position.y });
                    corrected = true;
                } else if (body.position.x + radius > newSize.width) {
                    Matter.Body.setPosition(body, { x: newSize.width - radius, y: body.position.y });
                    corrected = true;
                }

                if (body.position.y - radius < 0) {
                    Matter.Body.setPosition(body, { x: body.position.x, y: radius });
                    corrected = true;
                } else if (body.position.y + radius > newSize.height) {
                    Matter.Body.setPosition(body, { x: body.position.x, y: newSize.height - radius });
                    corrected = true;
                }

                if (corrected) {
                    Matter.Body.setVelocity(body, { x: 0, y: 0 });
                }
            });
        }
    }, [isMobile, isSmallScreen]);



    // Real-time tags synchronization
    useEffect(() => {
        const unsubscribe = subscribeToTagsUpdates((updatedTags) => {
            setTags(updatedTags);

            // Initialize filter with all tag IDs by default (only on first load)
            setFilterTags(currentFilterTags => {
                if (currentFilterTags.length === 0 && updatedTags.length > 0) {
                    return updatedTags.map(tag => tag.id);
                }
                // If tags were added/removed, update filterTags accordingly
                const existingTagIds = updatedTags.map(tag => tag.id);
                const validFilterTags = currentFilterTags.filter(id => existingTagIds.includes(id));
                // Add new tags to filter by default
                const newTags = existingTagIds.filter(id => !currentFilterTags.includes(id));
                return [...validFilterTags, ...newTags];
            });

            // Initialize list filter with all tag IDs by default (only on first load)
            setListFilterTags(currentListFilterTags => {
                if (currentListFilterTags.length === 0 && updatedTags.length > 0) {
                    return updatedTags.map(tag => tag.id);
                }
                // If tags were added/removed, update listFilterTags accordingly
                const existingTagIds = updatedTags.map(tag => tag.id);
                const validListFilterTags = currentListFilterTags.filter(id => existingTagIds.includes(id));
                // Add new tags to filter by default
                const newListTags = existingTagIds.filter(id => !currentListFilterTags.includes(id));
                return [...validListFilterTags, ...newListTags];
            });

            // Update bubble colors when tags change
            setBubbles(currentBubbles => {
                return currentBubbles.map(bubble => {
                    if (bubble.tagId) {
                        const tag = updatedTags.find(t => t.id === bubble.tagId);
                        if (tag && bubble.body) {
                            bubble.body.render.strokeStyle = tag.color;
                        }
                    } else if (bubble.body) {
                        bubble.body.render.strokeStyle = '#B0B0B0';
                    }
                    return bubble;
                });
            });
        });

        return () => unsubscribe();
    }, []);

    // Filter bubbles visibility based on selected filters
    useEffect(() => {
        if (!engineRef.current) return;

        const filteredBubbles = getFilteredBubbles();
        const filteredIds = new Set(filteredBubbles.map(b => b.id));

        bubbles.forEach(bubble => {
            if (bubble.body) {
                const isVisible = filteredIds.has(bubble.id);
                const isCurrentlyInWorld = engineRef.current.world.bodies.includes(bubble.body);

                if (isVisible && !isCurrentlyInWorld) {
                    // Add a bubble to the physical world
                    Matter.World.add(engineRef.current.world, bubble.body);
                } else if (!isVisible && isCurrentlyInWorld) {
                    // Remove bubble from the physical world
                    Matter.World.remove(engineRef.current.world, bubble.body);
                }
            }
        });
    }, [bubbles, filterTags, showNoTag]);

    // Handle clicks outside categories menu
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (categoriesMenuAnchor && !event.target.closest('[data-categories-menu]')) {
                setCategoriesMenuAnchor(null);
            }
        };

        if (categoriesMenuAnchor) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [categoriesMenuAnchor]);

    // Bubble creation function
    const createBubble = (x, y, radius, tagId = null) => {
        let strokeColor = '#B0B0B0'; // light gray color by default

        if (tagId) {
            const tag = tags.find(t => t.id === tagId);
            if (tag) {
                strokeColor = tag.color;
            }
        }

        const body = Matter.Bodies.circle(x, y, radius, {
            restitution: 0.8,
            frictionAir: 0.01,
            render: {
                fillStyle: 'transparent',
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

    // Function for filtering bubbles (for physics world - only active)
    const getFilteredBubbles = () => {
        // Always show only active bubbles in physics world
        const filteredByStatus = bubbles.filter(bubble => bubble.status === BUBBLE_STATUS.ACTIVE);

        // Apply tag filters
        // Check if all tags are selected and showNoTag is true - show all bubbles
        const allTagsSelected = tags.length > 0 && filterTags.length === tags.length && showNoTag;

        if (allTagsSelected) {
            return filteredByStatus;
        }

        return filteredByStatus.filter(bubble => {
            // Если выбраны теги и пузырь имеет один из выбранных тегов
            if (filterTags.length > 0 && bubble.tagId && filterTags.includes(bubble.tagId)) {
                return true;
            }
            // Если включен фильтр "No Tag" и у пузыря нет тега
            if (showNoTag && !bubble.tagId) {
                return true;
            }
            return false;
        });
    };

    // Function for filtering bubbles for list view (supports all statuses)
    const getFilteredBubblesForList = () => {
        // In list mode, filter by selected status
        const filteredByStatus = getBubblesByStatus(bubbles, listFilter);

        // Apply tag filters using separate list filter states
        // Check if all tags are selected and showNoTag is true - show all bubbles
        const allTagsSelected = tags.length > 0 && listFilterTags.length === tags.length && listShowNoTag;

        if (allTagsSelected) {
            return filteredByStatus;
        }

        return filteredByStatus.filter(bubble => {
            // Если выбраны теги и пузырь имеет один из выбранных тегов
            if (listFilterTags.length > 0 && bubble.tagId && listFilterTags.includes(bubble.tagId)) {
                return true;
            }
            // Если включен фильтр "No Tag" и у пузыря нет тега
            if (listShowNoTag && !bubble.tagId) {
                return true;
            }
            return false;
        });
    };

    // Function for opening create bubble dialog
    const openCreateDialog = () => {
        setTitle('');
        setDescription('');
        setSelectedTagId('');
        setCreateDialog(true);
    };

    // Function for creating a new bubble
    const createNewBubble = () => {
        if (!engineRef.current || !renderRef.current) {
            return;
        }

        const standardRadius = 45; // same standard size for all devices
        const margin = isMobile ? 50 : 100;

        const newBubble = createBubble(
            Math.random() * (canvasSize.width - margin * 2) + margin,
            50,
            standardRadius,
            selectedTagId || null
        );

        // Set title and description
        newBubble.title = title;
        newBubble.description = description;

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
    };

    // Save bubble changes
    const handleSaveBubble = () => {
        if (selectedBubble) {
            setBubbles(prev => {
                const updatedBubbles = prev.map(bubble => {
                    if (bubble.id === selectedBubble.id) {
                        const updatedBubble = {
                            ...bubble,
                            title,
                            description,
                            tagId: selectedTagId || null,
                            updatedAt: new Date().toISOString()
                        };

                        // Update border color based on tag
                        if (selectedTagId) {
                            const tag = tags.find(t => t.id === selectedTagId);
                            if (tag) {
                                bubble.body.render.strokeStyle = tag.color;
                            }
                        } else {
                            // If no tag is selected, use light gray color
                            bubble.body.render.strokeStyle = '#B0B0B0';
                        }

                        return updatedBubble;
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
    };

    // Mark bubble as done
    const handleMarkAsDone = async () => {
        if (selectedBubble && engineRef.current) {
            try {
                // Remove from Matter.js world
                Matter.World.remove(engineRef.current.world, selectedBubble.body);

                // Mark as done in Firestore
                const updatedBubbles = await markBubbleAsDone(selectedBubble.id, bubbles);
                setBubbles(updatedBubbles);
            } catch (error) {
                console.error('Error marking bubble as done:', error);
            }
        }
        setEditDialog(false);
        setSelectedBubble(null);
        setTitle('');
        setDescription('');
    };

    // Close dialog without saving
    const handleCloseDialog = () => {
        setEditDialog(false);
        setSelectedBubble(null);
        setTitle('');
        setDescription('');
        setSelectedTagId('');
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
        const updatedTags = tags.filter(tag => tag.id !== tagId);
        setTags(updatedTags);
        saveTagsToFirestore(updatedTags);

        // Удаляем ссылки на этот тег из пузырей
        setBubbles(prev => {
            const updatedBubbles = prev.map(bubble => {
                if (bubble.tagId === tagId) {
                    // Сбрасываем цвет пузыря на светло-серый
                    bubble.body.render.strokeStyle = '#B0B0B0';
                    return { ...bubble, tagId: null };
                }
                return bubble;
            });
            saveBubblesToFirestore(updatedBubbles);
            return updatedBubbles;
        });
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

    // Functions for filter management
    const handleTagFilterChange = (tagId) => {
        setFilterTags(prev => {
            if (prev.includes(tagId)) {
                return prev.filter(id => id !== tagId);
            } else {
                return [...prev, tagId];
            }
        });
    };

    const handleNoTagFilterChange = () => {
        setShowNoTag(prev => !prev);
    };

    const clearAllFilters = () => {
        setFilterTags([]);
        setShowNoTag(false);
    };

    const selectAllFilters = () => {
        setFilterTags(tags.map(tag => tag.id));
        setShowNoTag(true);
    };

    const isAllSelected = () => {
        return tags.length > 0 && filterTags.length === tags.length && showNoTag;
    };

    // Functions for list filter management
    const handleListTagFilterChange = (tagId) => {
        setListFilterTags(prev => {
            if (prev.includes(tagId)) {
                return prev.filter(id => id !== tagId);
            } else {
                return [...prev, tagId];
            }
        });
    };

    const handleListNoTagFilterChange = () => {
        setListShowNoTag(prev => !prev);
    };

    const clearAllListFilters = () => {
        setListFilterTags([]);
        setListShowNoTag(false);
    };

    const selectAllListFilters = () => {
        setListFilterTags(tags.map(tag => tag.id));
        setListShowNoTag(true);
    };

    const isAllListFiltersSelected = () => {
        return tags.length > 0 && listFilterTags.length === tags.length && listShowNoTag;
    };

    // Function to count bubbles by category
    const getBubbleCountByTag = (tagId) => {
        if (tagId === null) {
            // Count bubbles without tags
            return bubbles.filter(bubble => !bubble.tagId).length;
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
        return !getUsedColors().includes(color);
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

    // Компонент для отображения текста поверх пузырей
    const TextOverlay = () => {
        const [positions, setPositions] = useState([]);
        const bubblesRef = useRef(bubbles);
        const filteredBubblesRef = useRef([]);

        // Обновляем ref при изменении bubbles
        useEffect(() => {
            bubblesRef.current = bubbles;
            filteredBubblesRef.current = getFilteredBubbles();
        }, [bubbles, filterTags, showNoTag]);

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

            const intervalId = setInterval(updatePositions, 16); // ~60fps
            return () => clearInterval(intervalId);
        }, [filterTags, showNoTag]);

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
                {positions.map(bubble => {
                    // Функция для ограничения длины текста в зависимости от размера пузыря и шрифта
                    const getMaxTitleLength = (radius, currentFontSize) => {
                        // Базовые значения для шрифта 12px
                        let baseLength;
                        if (radius < 30) baseLength = 8;   // очень маленький пузырь
                        else if (radius < 40) baseLength = 12;  // маленький пузырь
                        else if (radius < 50) baseLength = 16;  // средний пузырь
                        else baseLength = 20;                   // большой пузырь

                        // Корректируем количество символов в зависимости от размера шрифта
                        // Чем меньше шрифт, тем больше символов помещается
                        const fontSizeRatio = 12 / currentFontSize; // 12 - базовый размер
                        return Math.round(baseLength * fontSizeRatio);
                    };

                    // Вычисляем текущий размер шрифта с учетом мобильности
                    const currentFontSize = isMobile ? fontSize * 0.75 : fontSize;
                    const maxLength = getMaxTitleLength(bubble.radius, currentFontSize);
                    const truncatedTitle = bubble.title && bubble.title.length > maxLength
                        ? bubble.title.substring(0, maxLength) + '...'
                        : bubble.title;

                    return bubble.title ? (
                        <Box
                            key={bubble.id}
                            sx={{
                                position: 'absolute',
                                left: bubble.x,
                                top: bubble.y,
                                transform: 'translate(-50%, -50%)',
                                textAlign: 'center',
                                color: 'white',
                                textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                                maxWidth: Math.max(bubble.radius * 1.6, 50),
                                overflow: 'hidden'
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
                })}
            </Box>
        );
    };

    // ListView component
    const ListView = () => {
        const getStatusIcon = (status) => {
            switch (status) {
                case BUBBLE_STATUS.DONE:
                    return <CheckCircle sx={{ color: '#4CAF50' }} />;
                case BUBBLE_STATUS.DELETED:
                    return <DeleteOutlined sx={{ color: '#F44336' }} />;
                case BUBBLE_STATUS.POSTPONE:
                    return <LocalOffer sx={{ color: '#FF9800' }} />;
                default:
                    // return <Bubble sx={{ color: '#2196F3' }} />;
                    return <Check sx={{ color: '#2196F3' }} />;
            }
        };

        const getStatusColor = (status) => {
            switch (status) {
                case BUBBLE_STATUS.DONE:
                    return '#E8F5E8';
                case BUBBLE_STATUS.DELETED:
                    return '#FFEBEE';
                case BUBBLE_STATUS.POSTPONE:
                    return '#FFF3E0';
                default:
                    return '#E3F2FD';
            }
        };

        const sortTasks = (tasks) => {
            const sortedTasks = [...tasks];

            sortedTasks.sort((a, b) => {
                let aValue, bValue;

                switch (listSortBy) {
                    case 'title':
                        aValue = (a.title || '').toLowerCase();
                        bValue = (b.title || '').toLowerCase();
                        break;
                    case 'tag':
                        const aTag = a.tagId ? tags.find(t => t.id === a.tagId) : null;
                        const bTag = b.tagId ? tags.find(t => t.id === b.tagId) : null;
                        aValue = aTag ? aTag.name.toLowerCase() : '';
                        bValue = bTag ? bTag.name.toLowerCase() : '';
                        break;
                    case 'updatedAt':
                        aValue = new Date(a.updatedAt || a.createdAt);
                        bValue = new Date(b.updatedAt || b.createdAt);
                        break;
                    case 'createdAt':
                    default:
                        aValue = new Date(a.createdAt);
                        bValue = new Date(b.createdAt);
                        break;
                }

                if (listSortOrder === 'asc') {
                    if (aValue < bValue) return -1;
                    if (aValue > bValue) return 1;
                    return 0;
                } else {
                    if (aValue > bValue) return -1;
                    if (aValue < bValue) return 1;
                    return 0;
                }
            });

            return sortedTasks;
        };

        const getTasksByStatus = (status) => {
            const filteredBubbles = getFilteredBubblesForList();
            return sortTasks(filteredBubbles);
        };

        const getTasksCountByStatus = (status) => {
            // Apply tag filters to all bubbles using list filter states
            const allTagsSelected = tags.length > 0 && listFilterTags.length === tags.length && listShowNoTag;

            let filteredBubbles = bubbles;

            if (!allTagsSelected) {
                filteredBubbles = bubbles.filter(bubble => {
                    // Если выбраны теги и пузырь имеет один из выбранных тегов
                    if (listFilterTags.length > 0 && bubble.tagId && listFilterTags.includes(bubble.tagId)) {
                        return true;
                    }
                    // Если включен фильтр "No Tag" и у пузыря нет тега
                    if (listShowNoTag && !bubble.tagId) {
                        return true;
                    }
                    return false;
                });
            }

            // Filter by status
            if (status === 'active') {
                return filteredBubbles.filter(bubble => bubble.status === BUBBLE_STATUS.ACTIVE).length;
            } else if (status === 'done') {
                return filteredBubbles.filter(bubble => bubble.status === BUBBLE_STATUS.DONE).length;
            } else if (status === 'postpone') {
                return filteredBubbles.filter(bubble => bubble.status === BUBBLE_STATUS.POSTPONE).length;
            } else if (status === 'deleted') {
                return filteredBubbles.filter(bubble => bubble.status === BUBBLE_STATUS.DELETED).length;
            }
            return 0;
        };



        const formatDate = (dateString) => {
            if (!dateString) return '';
            const date = new Date(dateString);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        };

        const handleRestoreBubble = async (bubbleId) => {
            try {
                const updatedBubbles = await restoreBubble(bubbleId, bubbles);
                setBubbles(updatedBubbles);
            } catch (error) {
                console.error('Error restoring bubble:', error);
            }
        };

        // Mark task as done from list view
        const handleMarkTaskAsDone = async (taskId) => {
            try {
                const updatedBubbles = await markBubbleAsDone(taskId, bubbles);
                setBubbles(updatedBubbles);
            } catch (error) {
                console.error('Error marking task as done:', error);
            }
        };

        // Delete task from list view
        const handleDeleteTask = async (taskId) => {
            try {
                const updatedBubbles = await markBubbleAsDeleted(taskId, bubbles);
                setBubbles(updatedBubbles);
            } catch (error) {
                console.error('Error deleting task:', error);
            }
        };

        // Permanently delete task from list view
        const handlePermanentDeleteTask = async (taskId) => {
            try {
                const updatedBubbles = bubbles.filter(bubble => bubble.id !== taskId);
                setBubbles(updatedBubbles);
                saveBubblesToFirestore(updatedBubbles);
            } catch (error) {
                console.error('Error permanently deleting task:', error);
            }
        };

        // Edit task from list view
        const handleEditTask = (task) => {
            setSelectedBubble(task);
            setTitle(task.title || '');
            setDescription(task.description || '');
            setSelectedTagId(task.tagId || '');
            setEditDialog(true);
        };

        const tasks = getTasksByStatus(listFilter);
        const isEmpty = tasks.length === 0;

        return (
            <Box sx={{ padding: 2, height: '100%', overflow: 'auto' }}>
                {/* Filter and Sort controls */}
                <Box sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: isMobile ? 'flex-start' : 'center',
                    marginBottom: 2,
                    gap: 2,
                    flexWrap: 'wrap',
                    flexDirection: isMobile ? 'column' : 'row'
                }}>
                    {/* Categories filter */}
                    <Box sx={{ width: isMobile ? '100%' : 280, position: 'relative' }} data-categories-menu>
                        <Button
                            variant="outlined"
                            onClick={(e) => setCategoriesMenuAnchor(e.currentTarget)}
                            endIcon={<KeyboardArrowDown />}
                            sx={{
                                width: '100%',
                                justifyContent: 'space-between',
                                textTransform: 'none',
                                padding: '8px 12px',
                                borderRadius: 1,
                                '& .MuiButton-endIcon': {
                                    transform: Boolean(categoriesMenuAnchor) ? 'rotate(180deg)' : 'rotate(0deg)',
                                    transition: 'transform 0.2s ease'
                                }
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, overflow: 'hidden' }}>
                                {(listFilterTags.length > 0 || listShowNoTag) ? (
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, overflow: 'hidden' }}>
                                        {listShowNoTag && (
                                            <Chip
                                                label={t('bubbles.noTag')}
                                                size="small"
                                                sx={{
                                                    backgroundColor: '#B0B0B0',
                                                    color: 'white',
                                                    height: 20,
                                                    fontSize: '0.7rem'
                                                }}
                                            />
                                        )}
                                        {listFilterTags.slice(0, 2).map((tagId) => {
                                            const tag = tags.find(t => t.id === tagId);
                                            return tag ? (
                                                <Chip
                                                    key={tagId}
                                                    label={tag.name}
                                                    size="small"
                                                    sx={{
                                                        backgroundColor: tag.color,
                                                        color: 'white',
                                                        height: 20,
                                                        fontSize: '0.7rem'
                                                    }}
                                                />
                                            ) : null;
                                        })}
                                        {listFilterTags.length > 2 && (
                                            <Chip
                                                label={`+${listFilterTags.length - 2}`}
                                                size="small"
                                                sx={{
                                                    backgroundColor: '#E0E0E0',
                                                    color: '#666',
                                                    height: 20,
                                                    fontSize: '0.7rem'
                                                }}
                                            />
                                        )}
                                    </Box>
                                ) : (
                                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                        {t('bubbles.categories')}
                                    </Typography>
                                )}
                            </Box>
                        </Button>
                        {Boolean(categoriesMenuAnchor) && (
                            <Box
                                sx={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    width: 280,
                                    backgroundColor: 'white',
                                    borderRadius: 1,
                                    boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.15)',
                                    border: '1px solid #E0E0E0',
                                    zIndex: 1000,
                                    maxHeight: 300,
                                    overflowY: 'auto',
                                    marginTop: 0.5
                                }}
                            >
                                <Box
                                    onClick={() => {
                                        setListShowNoTag(!listShowNoTag);
                                    }}
                                    sx={{
                                        padding: '12px 16px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1.5,
                                        cursor: 'pointer',
                                        '&:hover': {
                                            backgroundColor: '#F5F5F5'
                                        }
                                    }}
                                >
                                    <Checkbox checked={listShowNoTag} size="small" />
                                    <Box
                                        sx={{
                                            width: 16,
                                            height: 16,
                                            borderRadius: '50%',
                                            backgroundColor: '#B0B0B0',
                                            border: '1px solid #ccc'
                                        }}
                                    />
                                    <Typography variant="body2">{t('bubbles.noTag')}</Typography>
                                </Box>
                                {tags.map((tag) => (
                                    <Box
                                        key={tag.id}
                                        onClick={() => {
                                            if (listFilterTags.includes(tag.id)) {
                                                setListFilterTags(listFilterTags.filter(id => id !== tag.id));
                                            } else {
                                                setListFilterTags([...listFilterTags, tag.id]);
                                            }
                                        }}
                                        sx={{
                                            padding: '12px 16px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1.5,
                                            cursor: 'pointer',
                                            '&:hover': {
                                                backgroundColor: '#F5F5F5'
                                            }
                                        }}
                                    >
                                        <Checkbox checked={listFilterTags.includes(tag.id)} size="small" />
                                        <Box
                                            sx={{
                                                width: 16,
                                                height: 16,
                                                borderRadius: '50%',
                                                backgroundColor: tag.color,
                                                border: '1px solid #ccc'
                                            }}
                                        />
                                        <Typography variant="body2">{tag.name}</Typography>
                                    </Box>
                                ))}
                            </Box>
                        )}
                    </Box>

                    {/* Sort controls */}
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        width: isMobile ? '100%' : 'auto'
                    }}>
                        <FormControl size="small" sx={{
                            minWidth: isMobile ? 'auto' : 140,
                            flex: isMobile ? 1 : 'none'
                        }}>
                            <InputLabel>{t('bubbles.sortBy')}</InputLabel>
                            <Select
                                value={listSortBy}
                                label={t('bubbles.sortBy')}
                                onChange={(e) => setListSortBy(e.target.value)}
                            >
                                <MenuItem value="createdAt">{t('bubbles.createdAt')}</MenuItem>
                                <MenuItem value="updatedAt">{t('bubbles.updatedAt')}</MenuItem>
                                <MenuItem value="title">{t('bubbles.title')}</MenuItem>
                                <MenuItem value="tag">{t('bubbles.category')}</MenuItem>
                            </Select>
                        </FormControl>
                        <Tooltip title={listSortOrder === 'asc' ? t('bubbles.sortAscending') : t('bubbles.sortDescending')}>
                            <IconButton
                                onClick={() => setListSortOrder(listSortOrder === 'asc' ? 'desc' : 'asc')}
                                sx={{
                                    color: 'primary.main',
                                    border: '1px solid',
                                    borderColor: 'rgba(25, 118, 210, 0.5)',
                                    '&:hover': {
                                        backgroundColor: 'rgba(25, 118, 210, 0.05)'
                                    }
                                }}
                            >
                                {listSortOrder === 'asc' ? <ArrowUpward /> : <ArrowDownward />}
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Box>

                {/* Filter tabs */}
                <Box sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    marginBottom: 3,
                    flexWrap: 'wrap',
                    gap: 1
                }}>
                    {[
                        { key: 'active', label: t('bubbles.activeTasks'), count: getTasksCountByStatus('active') },
                        { key: 'done', label: t('bubbles.doneTasks'), count: getTasksCountByStatus('done') },
                        { key: 'deleted', label: t('bubbles.deletedTasks'), count: getTasksCountByStatus('deleted') },
                        { key: 'postpone', label: t('bubbles.postponedTasks'), count: getTasksCountByStatus('postpone') },
                    ].map(tab => (
                        <Button
                            key={tab.key}
                            variant={listFilter === tab.key ? 'contained' : 'outlined'}
                            onClick={() => setListFilter(tab.key)}
                            sx={{
                                borderRadius: 20,
                                paddingX: 2,
                                paddingY: 1,
                                textTransform: 'none',
                                minWidth: 'auto',
                                fontSize: isMobile ? '0.8rem' : '0.9rem'
                            }}
                        >
                            {tab.label} ({tab.count})
                        </Button>
                    ))}
                </Box>

                {/* Tasks list */}
                {isEmpty ? (
                    <Box sx={{
                        textAlign: 'center',
                        padding: 4,
                        color: 'text.secondary'
                    }}>
                        <Typography variant="h6" gutterBottom>
                            {listFilter === 'active' && t('bubbles.noActiveTasks')}
                            {listFilter === 'done' && t('bubbles.noDoneTasks')}
                            {listFilter === 'postpone' && t('bubbles.noPostponedTasks')}
                            {listFilter === 'deleted' && t('bubbles.noDeletedTasks')}
                        </Typography>
                    </Box>
                ) : (
                    <List sx={{ padding: 0 }}>
                        {tasks.map((task, index) => {
                            const tag = task.tagId ? tags.find(t => t.id === task.tagId) : null;

                            return (
                                <ListItem
                                    key={task.id}
                                    sx={{
                                        marginBottom: 1,
                                        padding: 2,
                                        borderRadius: 2,
                                        backgroundColor: getStatusColor(task.status),
                                        border: '1px solid #E0E0E0'
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', width: '100%', gap: 2 }}>
                                        {/* Status icon */}
                                        <Box sx={{ paddingTop: 0.5 }}>
                                            {getStatusIcon(task.status)}
                                        </Box>

                                        {/* Task content */}
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="h6" sx={{ marginBottom: 1 }}>
                                                {task.title || t('bubbles.empty')}
                                            </Typography>

                                            {task.description && (
                                                <Typography variant="body2" color="text.secondary" sx={{ marginBottom: 1 }}>
                                                    {task.description}
                                                </Typography>
                                            )}

                                            {/* Tag */}
                                            {tag && (
                                                <Chip
                                                    label={tag.name}
                                                    size="small"
                                                    sx={{
                                                        backgroundColor: tag.color,
                                                        color: 'white',
                                                        marginBottom: 1
                                                    }}
                                                />
                                            )}

                                            {/* Dates */}
                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                <Typography variant="caption" color="text.secondary">
                                                    {t('bubbles.createdAt')}: {formatDate(task.createdAt)}
                                                </Typography>
                                                {task.updatedAt && task.updatedAt !== task.createdAt && (
                                                    <Typography variant="caption" color="text.secondary">
                                                        {t('bubbles.updatedAt')}: {formatDate(task.updatedAt)}
                                                    </Typography>
                                                )}
                                                {task.deletedAt && (
                                                    <Typography variant="caption" color="text.secondary">
                                                        {t('bubbles.deletedAt')}: {formatDate(task.deletedAt)}
                                                    </Typography>
                                                )}
                                            </Box>
                                        </Box>

                                        {/* Actions */}
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                            {task.status === BUBBLE_STATUS.ACTIVE && (
                                                <>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleEditTask(task)}
                                                        sx={{ color: 'primary.main' }}
                                                        title={t('bubbles.editBubble')}
                                                    >
                                                        <Edit />
                                                    </IconButton>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleMarkTaskAsDone(task.id)}
                                                        sx={{ color: 'success.main' }}
                                                        title={t('bubbles.markAsDone')}
                                                    >
                                                        <CheckCircle />
                                                    </IconButton>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleDeleteTask(task.id)}
                                                        sx={{ color: 'error.main' }}
                                                        title={t('bubbles.deleteBubble')}
                                                    >
                                                        <DeleteOutlined />
                                                    </IconButton>
                                                </>
                                            )}
                                            {task.status === BUBBLE_STATUS.DONE && (
                                                <>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleRestoreBubble(task.id)}
                                                        sx={{ color: 'primary.main' }}
                                                        title={t('bubbles.restoreBubble')}
                                                    >
                                                        <Restore />
                                                    </IconButton>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleDeleteTask(task.id)}
                                                        sx={{ color: 'error.main' }}
                                                        title={t('bubbles.deleteBubble')}
                                                    >
                                                        <DeleteOutlined />
                                                    </IconButton>
                                                </>
                                            )}
                                            {task.status === BUBBLE_STATUS.DELETED && (
                                                <>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleRestoreBubble(task.id)}
                                                        sx={{ color: 'primary.main' }}
                                                        title={t('bubbles.restoreBubble')}
                                                    >
                                                        <Restore />
                                                    </IconButton>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handlePermanentDeleteTask(task.id)}
                                                        sx={{ color: 'error.main' }}
                                                        title={t('bubbles.permanentDelete')}
                                                    >
                                                        <DeleteOutlined />
                                                    </IconButton>
                                                </>
                                            )}
                                        </Box>
                                    </Box>
                                </ListItem>
                            );
                        })}
                    </List>
                )}


            </Box>
        );
    };

    return (
        <Box sx={{
            width: '100vw',
            height: '100vh',
            overflow: 'hidden',
            position: 'relative',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
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
                                color: 'white',
                                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                '&:hover': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.3)'
                                },
                                marginRight: 1
                            }}
                        >
                            <MenuIcon />
                        </IconButton>
                        <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                            🫧 {t('bubbles.title')}
                        </Typography>
                        <Button
                            variant="contained"
                            onClick={openCreateDialog}
                            startIcon={<Add />}
                            sx={{
                                background: 'rgba(255,255,255,0.2)',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255,255,255,0.3)',
                                color: 'white',
                                '&:hover': {
                                    background: 'rgba(255,255,255,0.3)'
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
                        sx={{
                            color: 'white',
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            '&:hover': {
                                backgroundColor: 'rgba(255, 255, 255, 0.3)'
                            }
                        }}
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
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <LanguageSelector />
                        {/* View Mode Toggle */}
                        <Button
                            onClick={() => setListViewDialog(true)}
                            variant="outlined"
                            size="small"
                            startIcon={<ViewList />}
                            sx={{
                                color: 'white',
                                borderColor: 'rgba(255, 255, 255, 0.5)',
                                backgroundColor: 'transparent',
                                '&:hover': {
                                    borderColor: 'rgba(255, 255, 255, 0.8)',
                                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                                }
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
                                color: 'white',
                                borderColor: 'rgba(255, 255, 255, 0.5)',
                                backgroundColor: !isAllSelected() ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                                '&:hover': {
                                    borderColor: 'rgba(255, 255, 255, 0.8)',
                                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                                }
                            }}
                        >
                            {t('bubbles.filterButton')}
                        </Button>
                        <Button
                            onClick={handleLogout}
                            variant="outlined"
                            size="small"
                            startIcon={<Logout />}
                            sx={{
                                color: 'white',
                                borderColor: 'rgba(255, 255, 255, 0.5)',
                                '&:hover': {
                                    borderColor: 'rgba(255, 255, 255, 0.8)',
                                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                                }
                            }}
                        >
                            {t('auth.logout')}
                        </Button>
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
                        <LanguageSelector />
                        {/* View Mode Toggle for Mobile */}
                        <IconButton
                            onClick={() => setListViewDialog(true)}
                            sx={{
                                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                color: 'white',
                                '&:hover': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.3)'
                                }
                            }}
                        >
                            <ViewList />
                        </IconButton>
                        <IconButton
                            onClick={() => setFilterDrawerOpen(true)}
                            sx={{
                                backgroundColor: !isAllSelected() ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.2)',
                                color: 'white',
                                '&:hover': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.4)'
                                }
                            }}
                        >
                            <FilterList />
                        </IconButton>
                        <IconButton
                            onClick={handleLogout}
                            sx={{
                                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                color: 'white',
                                '&:hover': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.3)'
                                }
                            }}
                        >
                            <Logout />
                        </IconButton>
                    </Box>
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
            <div ref={canvasRef} style={{ width: '100%', height: '100%' }} />
            {/* Текст поверх пузырей */}
            <TextOverlay />

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
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
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
                <DialogContent sx={{ padding: isMobile ? 2 : 3 }}>
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
                                fontSize: isMobile ? 16 : 14 // Предотвращает zoom на iOS
                            }
                        }}
                    />

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
                                const isUsed = !isColorAvailable(color) && color !== tagColor;
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
                                            width: isUsed ? 34 : 40, // Уменьшаем размер для занятых, чтобы с кольцом было 40px
                                            height: isUsed ? 34 : 40,
                                            borderRadius: '50%',
                                            backgroundColor: isUsed ? `${color}50` : color, // Полупрозрачный фон для занятых
                                            border: isSelected
                                                ? '3px solid #1976d2'
                                                : 'none', // Убираем серые границы у всех
                                            cursor: isUsed ? 'not-allowed' : 'pointer',
                                            position: 'relative',
                                            transition: 'all 0.2s ease',
                                            boxShadow: isUsed ? `0 0 0 3px ${color}` : 'none',
                                            '&:hover': {
                                                transform: !isUsed ? 'scale(1.1)' : 'none',
                                                boxShadow: !isUsed ? '0 4px 8px rgba(0,0,0,0.2)' : `0 0 0 3px ${color}`
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
                        backgroundColor: '#FFFFFF'
                    }
                }}
            >
                <Box sx={{ padding: 0 }}>
                    {/* Заголовок и логотип */}
                    <Box sx={{
                        padding: 3,
                        paddingBottom: 2,
                        borderBottom: '1px solid #E0E0E0'
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, marginBottom: 2 }}>
                            <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#2C3E50' }}>
                                ToROUND
                            </Typography>
                        </Box>
                    </Box>

                    {/* Пункты меню */}
                    <List sx={{ padding: 0 }}>
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
                                    backgroundColor: '#F8F9FA'
                                }
                            }}
                        >
                            <ListItemIcon sx={{ minWidth: 40 }}>
                                {/* <Category sx={{ color: '#BDC3C7' }} /> */}
                                <Sell sx={{ color: '#BDC3C7' }} />
                            </ListItemIcon>
                            <ListItemText
                                primary={t('bubbles.taskCategories')}
                                primaryTypographyProps={{
                                    color: '#2C3E50',
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
                                    backgroundColor: '#F8F9FA'
                                }
                            }}
                        >
                            <ListItemIcon sx={{ minWidth: 40 }}>
                                <Settings sx={{ color: '#BDC3C7' }} />
                            </ListItemIcon>
                            <ListItemText
                                primary={t('bubbles.fontSettings')}
                                primaryTypographyProps={{
                                    color: '#2C3E50',
                                    fontWeight: 500
                                }}
                            />
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
                                    backgroundColor: '#F8F9FA'
                                }
                            }}
                        >
                            <ListItemIcon sx={{ minWidth: 40 }}>
                                <Info sx={{ color: '#BDC3C7' }} />
                            </ListItemIcon>
                            <ListItemText
                                primary={t('bubbles.about')}
                                primaryTypographyProps={{
                                    color: '#2C3E50',
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
                                    {t('bubbles.noTag')} <Box component="span" sx={{ color: 'rgba(255,255,255,0.6)' }}>{getBubbleCountByTag(null)}</Box>
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
                                        {tag.name} <Box component="span" sx={{ color: 'rgba(255,255,255,0.6)' }}>{getBubbleCountByTag(tag.id)}</Box>
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
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
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
                <DialogContent sx={{ padding: isMobile ? 2 : 3 }}>
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
                                fontSize: isMobile ? 16 : 14
                            }
                        }}
                    />

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
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
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
                            {tags.map(tag => (
                                <ListItem
                                    key={tag.id}
                                    sx={{
                                        border: '1px solid #E0E0E0',
                                        borderRadius: 2,
                                        marginBottom: 1,
                                        padding: 2
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                                        <Box
                                            sx={{
                                                width: 24,
                                                height: 24,
                                                borderRadius: '50%',
                                                backgroundColor: tag.color,
                                                border: '2px solid #E0E0E0'
                                            }}
                                        />
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                                                {tag.name}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {getBubbleCountByTag(tag.id)} {getBubbleCountByTag(tag.id) === 1 ? t('bubbles.bubble') : t('bubbles.bubbles')}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', gap: 1 }}>
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
                                        </Box>
                                    </Box>
                                </ListItem>
                            ))}
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
                        borderTop: '1px solid #E0E0E0',
                        padding: 3,
                        textAlign: 'center',
                        backgroundColor: '#FAFAFA'
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
                                color: canCreateMoreTags() ? '#757575' : '#B0B0B0',
                                borderRadius: 2,
                                padding: '12px 24px',
                                textTransform: 'none',
                                fontWeight: 500,
                                minWidth: 140,
                                fontSize: '14px',
                                border: 'none',
                                '&:hover': {
                                    backgroundColor: canCreateMoreTags() ? 'rgba(117, 117, 117, 0.08)' : 'transparent'
                                },
                                '& .MuiButton-startIcon': {
                                    color: canCreateMoreTags() ? '#757575' : '#B0B0B0',
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
                                color: canCreateMoreTags() ? '#757575' : '#B0B0B0',
                                borderRadius: 2,
                                padding: '12px 24px',
                                textTransform: 'none',
                                fontWeight: 500,
                                minWidth: 140,
                                fontSize: '14px',
                                border: 'none',
                                '&:hover': {
                                    backgroundColor: canCreateMoreTags() ? 'rgba(117, 117, 117, 0.08)' : 'transparent'
                                },
                                '& .MuiButton-startIcon': {
                                    color: canCreateMoreTags() ? '#757575' : '#B0B0B0',
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
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
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
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
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
                        backgroundColor: '#FFFFFF'
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
                    borderBottom: '1px solid #E0E0E0'
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
                    <ListView />
                </Box>
            </Drawer>


        </Box>
    );
};

export default BubblesPage;