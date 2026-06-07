import { useEffect } from 'react';
import Matter from 'matter-js';
import { createWorldBounds } from '../utils/physicsUtils';
import {
    loadBubblesFromFirestore,
    cleanupOldDeletedBubbles,
    subscribeToBubblesUpdates,
    BUBBLE_STATUS,
} from '../services/firestoreService';
import logger from '../utils/logger';

/**
 * Initializes the Matter.js physics engine, renderer, and runner.
 * Loads initial bubbles from Firestore and subscribes to live updates.
 *
 * Runs once on mount (empty dependency array — matches original behaviour).
 */
export function useMatterEngine({
    // Refs
    canvasRef,
    engineRef,
    renderRef,
    wallsRef,
    stickyPulseRef,
    lastDueRef,
    manuallyStoppedPulsingRef,
    // State values captured at mount time (stale closure — matches original)
    editDialog,
    selectedBubble,
    // State setters
    setBubbles,
    setCanvasSize,
    setSelectedBubble,
    setTitle,
    setDescription,
    setSelectedTagId,
    setEditBubbleSize,
    setEditDialog,
    setEditDueDate,
    setEditNotifications,
    setEditRecurrence,
    // Functions / computed values
    isMobile,
    themeMode,
    tags,
    dropSpeed,
    getBubbleFillStyle,
    getCanvasSize,
    parseLocalDateTime,
}) {
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
                            dueDate: storedBubble.dueDate || null,
                            notifications: storedBubble.notifications || [],
                            recurrence: storedBubble.recurrence || null,
                            overdueSticky: storedBubble.overdueSticky || false,
                            overdueAt: storedBubble.overdueAt || null,
                            overduePulseSuppressed: storedBubble.overduePulseSuppressed || false
                        };

                        // Инициализируем stickyPulseRef для задач с overdueSticky
                        if (bubble.overdueSticky) {
                            stickyPulseRef.current.add(bubble.id);
                        }
                        // Восстанавливаем намерение «остановлено вручную» из персистентного поля
                        if (bubble.overduePulseSuppressed) {
                            manuallyStoppedPulsingRef.current.add(bubble.id);
                        }
                        initialBubbles.push(bubble);
                    });
                    // Убираем добавление всех пузырей в физический мир - они будут добавлены после фильтрации
                }

                setBubbles(initialBubbles);
                // Не добавляем пузыри в физический мир сразу - они будут добавлены после применения фильтров
            } catch (error) {
                logger.error('Error loading initial bubbles:', error);
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

                // detect server state and make sticky by server flag (persists across reloads)
                try {
                    merged.forEach(sb => {
                        const id = sb.id;
                        const newDue = sb?.dueDate ? (parseLocalDateTime(sb.dueDate)?.getTime() ?? null) : null;

                        // Намерение «остановлено вручную» — персистентное поле и единственный
                        // источник правды. Зеркалим его в ref независимо от overdueSticky,
                        // иначе серверное эхо overdueSticky=false сбрасывало бы остановку.
                        if (sb?.overduePulseSuppressed) {
                            manuallyStoppedPulsingRef.current.add(id);
                        } else {
                            manuallyStoppedPulsingRef.current.delete(id);
                        }

                        // Игнорируем серверные обновления stickyPulseRef для задач с overdueSticky - управляем только вручную
                        if (sb?.overdueSticky) {
                            if (newDue && Number.isFinite(newDue)) lastDueRef.current.set(id, newDue);
                            return;
                        }

                        stickyPulseRef.current.delete(id);

                        if (newDue && Number.isFinite(newDue)) lastDueRef.current.set(id, newDue);
                    });
                } catch (_) { }

                // If edit dialog is open for a selected bubble, reflect live updates
                if (editDialog && selectedBubble && selectedBubble.id) {
                    const updated = merged.find(b => String(b.id) === String(selectedBubble.id));
                    if (updated) {
                        // Update selected bubble fields but keep the Matter.js body instance
                        setSelectedBubble(prevSel => (prevSel ? { ...prevSel, ...updated, body: prevSel.body } : updated));
                        // Update edit form states for dueDate/notifications/recurrence
                        if (updated.dueDate) {
                            try { const d = parseLocalDateTime(updated.dueDate); if (d && !isNaN(d.getTime())) setEditDueDate(d); else setEditDueDate(null); } catch (_) { setEditDueDate(null); }
                        } else {
                            setEditDueDate(null);
                        }
                        if (Array.isArray(updated.notifications)) {
                            setEditNotifications(updated.notifications);
                        }
                        setEditRecurrence(updated.recurrence || null);
                        // keep sticky pulsing even if editor opened (until user presses Stop)
                    }
                }

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

        const mousedownHandler = (event) => {
            clickStartTime = Date.now();
            clickStartPos = { ...event.mouse.position };
            const bodies = engine.world.bodies.filter(b => b.label === 'Circle Body');
            const hits = Query.point(bodies, clickStartPos);
            downBodyId = hits && hits.length > 0 ? hits[0].id : null;
        };

        Events.on(mouseConstraint, 'mousedown', mousedownHandler);

        const mouseupHandler = (event) => {
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
        };

        Events.on(mouseConstraint, 'mouseup', mouseupHandler);

        // Start render and engine
        Render.run(render);
        const runner = Runner.create();
        Runner.run(runner, engine);

        // Resize sync is handled by useMatterResize hook

        return () => {
            // cleanup handled below; resize listeners removed by hook
            Events.off(mouseConstraint, 'mousedown', mousedownHandler);
            Events.off(mouseConstraint, 'mouseup', mouseupHandler);
            Runner.stop(runner);
            Render.stop(render);
            World.clear(engine.world);
            Engine.clear(engine);
            render.canvas.remove();
            render.textures = {};
            if (typeof unsubscribeBubbles === 'function') unsubscribeBubbles();
        };
    }, []); // Убираем themeMode из зависимостей
}
