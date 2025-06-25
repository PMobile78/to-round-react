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
} from '@mui/material';
import { CloseOutlined, DeleteOutlined, Add, Clear, Label, Edit, LocalOffer, Logout } from '@mui/icons-material';
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
    subscribeToTagsUpdates
} from '../services/firestoreService';

const BubblesPage = ({ user }) => {
    const { t } = useTranslation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md')); // 768px and below
    const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm')); // 600px and below
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
                    // Restore bubbles from Firestore with random positions
                    const margin = isMobile ? 50 : 100;
                    storedBubbles.forEach(storedBubble => {
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
                            tagId: storedBubble.tagId || null
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
        };
    };

    // Function for adding a new bubble
    const addBubble = () => {
        if (!engineRef.current || !renderRef.current) {
            return;
        }

        const standardRadius = 45; // same standard size for all devices
        const margin = isMobile ? 50 : 100;

        const newBubble = createBubble(
            Math.random() * (canvasSize.width - margin * 2) + margin,
            50,
            standardRadius
        );

        Matter.World.add(engineRef.current.world, newBubble.body);
        setBubbles(prev => {
            const updatedBubbles = [...prev, newBubble];
            saveBubblesToFirestore(updatedBubbles);
            return updatedBubbles;
        });
    };

    // Save bubble changes
    const handleSaveBubble = () => {
        if (selectedBubble) {
            console.log('Saving bubble:', { id: selectedBubble.id, title, description, tagId: selectedTagId });
            setBubbles(prev => {
                const updatedBubbles = prev.map(bubble => {
                    if (bubble.id === selectedBubble.id) {
                        const updatedBubble = { ...bubble, title, description, tagId: selectedTagId || null };

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
                console.log('Updated bubbles:', updatedBubbles);
                saveBubblesToFirestore(updatedBubbles);
                return updatedBubbles;
            });
        }
        setEditDialog(false);
        setSelectedBubble(null);
        setTitle('');
        setDescription('');
        setSelectedTagId('');
    };

    // Delete bubble
    const handleDeleteBubble = () => {
        if (selectedBubble && engineRef.current) {
            console.log('Deleting bubble:', selectedBubble.id);

            // Remove from Matter.js world
            Matter.World.remove(engineRef.current.world, selectedBubble.body);

            // Remove from state
            setBubbles(prev => {
                const updatedBubbles = prev.filter(bubble => bubble.id !== selectedBubble.id);
                saveBubblesToFirestore(updatedBubbles);
                return updatedBubbles;
            });
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
            setEditingTag(null);
            setTagName('');
            setTagColor('#3B7DED');
        }
        setTagDialog(true);
    };

    const handleSaveTag = () => {
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
        setTagColor('#3B7DED');
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
        setTagColor('#3B7DED');
    };

    // Функция выхода
    const handleLogout = async () => {
        const result = await logoutUser();
        if (result.success) {
            console.log('User logged out successfully');
        }
    };

    // Компонент для отображения текста поверх пузырей
    const TextOverlay = () => {
        const [positions, setPositions] = useState([]);
        const bubblesRef = useRef(bubbles);

        // Обновляем ref при изменении bubbles
        useEffect(() => {
            bubblesRef.current = bubbles;
        }, [bubbles]);

        useEffect(() => {
            if (!engineRef.current) return undefined;

            const updatePositions = () => {
                const currentBubbles = bubblesRef.current;
                const newPositions = currentBubbles.map(bubble => ({
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
        }, []);

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
                    // Функция для ограничения длины текста в зависимости от размера пузыря
                    const getMaxTitleLength = (radius) => {
                        if (radius < 30) return 8;   // очень маленький пузырь
                        if (radius < 40) return 12;  // маленький пузырь
                        if (radius < 50) return 16;  // средний пузырь
                        return 20;                   // большой пузырь
                    };

                    const maxLength = getMaxTitleLength(bubble.radius);
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
                                        isMobile ? 9 : 10,
                                        Math.min(bubble.radius / (isMobile ? 2.2 : 3), isMobile ? 14 : 15)
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
                <Box sx={{
                    position: 'absolute',
                    top: 20,
                    left: 20,
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2
                }}>
                    <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                        🫧 {t('bubbles.title')}
                    </Typography>
                    <Button
                        variant="contained"
                        onClick={addBubble}
                        sx={{
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            '&:hover': {
                                backgroundColor: 'rgba(255, 255, 255, 0.3)'
                            }
                        }}
                    >
                        {t('bubbles.addBubble')}
                    </Button>
                    {/* <Button
                        variant="outlined"
                        onClick={clearAllBubbles}
                        sx={{
                            color: 'white',
                            borderColor: 'rgba(255, 255, 255, 0.5)',
                            '&:hover': {
                                borderColor: 'rgba(255, 255, 255, 0.8)',
                                backgroundColor: 'rgba(255, 255, 255, 0.1)'
                            }
                        }}
                    >
                        {t('bubbles.clearAll')}
                    </Button> */}
                </Box>
            ) : (
                // Мобильная версия с заголовком
                <Box sx={{
                    position: 'absolute',
                    top: 10,
                    left: 0,
                    right: 0,
                    zIndex: 1000,
                    display: 'flex',
                    justifyContent: 'center',
                    padding: '0 10px'
                }}>
                    <Typography
                        variant={isSmallScreen ? "h6" : "h5"}
                        sx={{
                            color: 'white',
                            fontWeight: 'bold',
                            textAlign: 'center'
                        }}
                    >
                        {t('bubbles.title')}
                    </Typography>
                </Box>
            )}

            {/* Плавающие кнопки для мобильных устройств */}
            {isMobile && (
                <>
                    <Tooltip title={t('bubbles.addBubble')}>
                        <Fab
                            color="primary"
                            onClick={addBubble}
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
                    <Tooltip title={t('bubbles.manageTags')}>
                        <Fab
                            onClick={() => handleOpenTagDialog()}
                            size="small"
                            sx={{
                                position: 'absolute',
                                bottom: 170, // Увеличен отступ, чтобы не перекрываться с основной кнопкой
                                right: 20,
                                zIndex: 1000,
                                backgroundColor: 'rgba(76, 175, 80, 0.9)',
                                color: 'white',
                                '&:hover': {
                                    backgroundColor: 'rgba(76, 175, 80, 1)'
                                }
                            }}
                        >
                            <Label />
                        </Fab>
                    </Tooltip>
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
                    <Box sx={{
                        backgroundColor: 'rgba(0, 0, 0, 0.3)',
                        padding: 2,
                        borderRadius: 2
                    }}>
                        <Typography variant="body2" sx={{ color: 'white', marginBottom: 1 }}>
                            {t('bubbles.clickInstruction')}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'white' }}>
                            {t('bubbles.dragInstruction')}
                        </Typography>
                    </Box>
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
                    <Box sx={{
                        position: 'absolute',
                        top: isSmallScreen ? 50 : 60,
                        left: 10,
                        right: 10,
                        zIndex: 1000,
                        backgroundColor: 'rgba(0, 0, 0, 0.4)',
                        padding: 1.5,
                        borderRadius: 2,
                        textAlign: 'center'
                    }}>
                        <Typography variant="caption" sx={{ color: 'white', fontSize: 12 }}>
                            {t('bubbles.mobileClickInstruction')}
                        </Typography>
                    </Box>
                </>
            )}

            {/* Canvas для физики */}
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

                    {/* Управление тегами */}
                    <Box sx={{ marginTop: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Button
                            size="small"
                            startIcon={<Add />}
                            onClick={() => handleOpenTagDialog()}
                            variant="outlined"
                        >
                            {t('bubbles.addTag')}
                        </Button>
                        <Button
                            size="small"
                            startIcon={<LocalOffer />}
                            onClick={(e) => setTagMenuAnchor(e.currentTarget)}
                            variant="outlined"
                            disabled={tags.length === 0}
                        >
                            {t('bubbles.manageTags')}
                        </Button>
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
                        onClick={handleDeleteBubble}
                        variant="outlined"
                        color="error"
                        startIcon={<DeleteOutlined />}
                        fullWidth={isSmallScreen}
                        sx={{
                            borderRadius: 2,
                            minHeight: isMobile ? 48 : 36,
                            order: isSmallScreen ? 3 : 1
                        }}
                    >
                        {t('bubbles.deleteBubble')}
                    </Button>
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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography>{t('bubbles.color')}:</Typography>
                        <input
                            type="color"
                            value={tagColor}
                            onChange={(e) => setTagColor(e.target.value)}
                            style={{
                                width: 50,
                                height: 40,
                                border: 'none',
                                borderRadius: 4,
                                cursor: 'pointer'
                            }}
                        />
                        <Box
                            sx={{
                                width: 40,
                                height: 40,
                                borderRadius: 2,
                                backgroundColor: tagColor,
                                border: '1px solid #ccc'
                            }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseTagDialog}>{t('bubbles.cancel')}</Button>
                    <Button
                        onClick={handleSaveTag}
                        variant="contained"
                        disabled={!tagName.trim()}
                    >
                        {editingTag ? t('bubbles.save') : t('bubbles.create')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default BubblesPage;