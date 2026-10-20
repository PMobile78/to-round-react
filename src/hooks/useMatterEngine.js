import { useEffect, useRef } from 'react';
import Matter from 'matter-js';
import { createWorldBounds } from '../utils/physicsUtils';
import { bubbleFromTask } from '../services/data/bubbleModel';
import { dueForPicker } from '../services/data/taskForm';
import { applyTaskChanges } from '../utils/taskSync';
import logger from '../utils/logger';
import { shouldPauseEngine } from '../utils/engineIdle';
import { hexToRgba } from '../utils/colorUtils';

/**
 * Initializes the Matter.js physics engine, renderer, and runner, and keeps the bubbles in step
 * with the user's tasks through subscribeTasks(onChanges, onError) — the live changes of
 * src/services/data/tasks.js, applied one by one (#94).
 *
 * Runs once on mount (empty dependency array — matches original behaviour).
 */
export function useMatterEngine({
    // Refs
    canvasRef,
    engineRef,
    renderRef,
    wallsRef,
    manuallyStoppedPulsingRef,
    // editDialog/selectedBubble are captured once at mount and stay stale inside the
    // subscription callback; live edit-dialog state is delivered via liveEditRef instead.
    editDialog,
    selectedBubble,
    liveEditRef,
    // Bubbles state; the canvas click handler reads the latest value via bubblesRef.
    bubbles,
    // (onChanges, onError) => unsubscribe: the signed-in user's live task changes.
    subscribeTasks,
    // State setters
    setBubbles,
    setCanvasSize,
    setSelectedBubble,
    setSelectedTagId,
    setEditBubbleSize,
    setEditDialog,
    setEditDue,
    setEditReminders,
    setEditRepeat,
    // Functions / computed values
    isMobile,
    themeMode,
    tags,
    dropSpeed,
    getBubbleFillStyle,
    getCanvasSize,
    theme,
}) {
    // Keep theme reference current for afterRender handler (avoid stale closure)
    const themeRef = useRef(theme);

    // Keep themeRef.current in sync with theme prop
    useEffect(() => {
        themeRef.current = theme;
    }, [theme]);

    // Latest bubbles for the canvas click handler (its closure is created once at mount)
    const bubblesRef = useRef(bubbles);
    useEffect(() => {
        bubblesRef.current = bubbles;
    }, [bubbles]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const { Engine, Render, Runner, Bodies, World, Mouse, MouseConstraint, Events, Query } = Matter;

        // Creating a Physics Engine. enableSleeping lets settled bodies sleep so the
        // idle loop control below can stop the Runner/Render rAF loop at rest (perf #76).
        const engine = Engine.create({ enableSleeping: true });
        engineRef.current = engine;

        // Disable default gravity to customize yours
        engine.world.gravity.y = dropSpeed;

        // Getting adaptive canvas sizes
        const canvasSize = getCanvasSize();
        setCanvasSize(canvasSize);

        // Create renderer with transparent background
        // (background color is now on the container; canvas is transparent to show DesignBackdrop)
        const render = Render.create({
            element: canvas,
            engine,
            options: {
                width: canvasSize.width,
                height: canvasSize.height,
                wireframes: false,
                background: 'transparent',
                showAngleIndicator: false,
                showVelocity: false,
                showSleeping: false,
            }
        });
        renderRef.current = render;

        // Create world boundaries
        const walls = createWorldBounds(canvasSize.width, canvasSize.height);
        wallsRef.current = walls;

        // Add walls to the world
        World.add(engine.world, walls);

        // Task → bubble with a Matter.js body at a random spot inside the current canvas:
        // render.options follows resizes (useMatterResize), canvasSize is the size at mount.
        const createBubbleFromTask = (task) => {
            const { width, height } = render.options;
            const margin = isMobile ? 50 : 100;
            const x = Math.random() * (width - margin * 2) + margin;
            const y = Math.random() * (height - margin * 2) + margin;
            const bubble = bubbleFromTask(task);
            const tagColor = tags.find(t => t.id === bubble.tagId)?.color ?? null;

            return {
                ...bubble,
                body: Matter.Bodies.circle(x, y, bubble.radius, {
                    restitution: 0.8,
                    frictionAir: 0.01,
                    render: {
                        fillStyle: getBubbleFillStyle(tagColor),
                        strokeStyle: tagColor || '#B0B0B0',
                        lineWidth: theme?.custom?.bubble?.strokeWidth ?? 1.5
                    }
                })
            };
        };

        // Live task changes, one by one. The first delivery (cache or server) builds the list;
        // the bodies are added to the world after filtering (useBubbleWorld).
        const unsubscribeTasks = subscribeTasks((changes, { initial }) => {
            setBubbles(prev => applyTaskChanges(prev, changes, {
                initial,
                createBubble: createBubbleFromTask,
                removeBody: (body) => World.remove(engine.world, body),
            }));

            // "Stop pulsing" is the task's pulseMuted, also when another device sets it.
            changes.forEach(({ type, task }) => {
                if (type !== 'removed' && task.pulseMuted) {
                    manuallyStoppedPulsingRef.current.add(task.id);
                } else {
                    manuallyStoppedPulsingRef.current.delete(task.id);
                }
            });

            // If edit dialog is open for a selected bubble, reflect live updates.
            // Read live values via ref — editDialog/selectedBubble captured in this
            // mount-effect closure are stale (always false/null).
            const { editDialog: liveOpen, selectedBubbleId } = liveEditRef.current;
            const change = liveOpen && selectedBubbleId != null
                && changes.find(c => c.type === 'modified' && String(c.task.id) === String(selectedBubbleId));
            if (change) {
                const updated = bubbleFromTask(change.task);
                // Update selected bubble fields but keep the Matter.js body instance
                setSelectedBubble(prevSel => (prevSel ? { ...prevSel, ...updated, body: prevSel.body } : prevSel));
                setEditDue(dueForPicker(updated));
                setEditReminders(updated.reminders);
                setEditRepeat(updated.repeat);
            }
        }, (error) => logger.error('Tasks listener error:', error));

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
                    // Not inside a setBubbles updater: React may run an updater again later
                    // (StrictMode does on the next bubbles render), which reopened the dialog after Save.
                    const clickedBubble = bubblesRef.current.find(b => b.body.id === targetBodyId);
                    if (clickedBubble) {
                        setSelectedBubble(clickedBubble);
                        setSelectedTagId(clickedBubble.tagId || '');
                        setEditBubbleSize(clickedBubble.radius);
                        setEditDialog(true);
                    }
                }
            }
            downBodyId = null;
        };

        Events.on(mouseConstraint, 'mouseup', mouseupHandler);

        // Start render and engine
        Render.run(render);
        const runner = Runner.create();
        Runner.run(runner, engine);

        // --- Idle loop control (perf #76) ---
        // With enableSleeping (engine), settled bodies sleep; here we stop the Runner +
        // Render rAF loop once every bubble is asleep, so an idle or empty scene costs ~0
        // CPU/GPU. Any pointer interaction, body add/remove, or repaint request wakes it.
        let running = true;
        let idleTicks = 0;
        const IDLE_TICKS_BEFORE_PAUSE = 20; // ~0.3s of full rest before pausing

        const wake = () => {
            idleTicks = 0;
            if (running) return;
            running = true;
            Render.run(render);
            Runner.run(runner, engine);
        };

        // Membership changes (filter, CRUD, splash, walls, initial load): also wake the
        // sleeping bubbles so the pile re-settles into the new layout (pre-fix behaviour).
        const wakeScene = () => {
            for (const b of engine.world.bodies) {
                if (b.label === 'Circle Body' && b.isSleeping) Matter.Sleeping.set(b, false);
            }
            wake();
        };

        const pauseIfIdle = () => {
            if (!running) return;
            if (shouldPauseEngine({ bodies: engine.world.bodies, isDragging: !!mouseConstraint.body })) {
                if (++idleTicks >= IDLE_TICKS_BEFORE_PAUSE) {
                    running = false;
                    Runner.stop(runner);
                    Render.stop(render);
                }
            } else {
                idleTicks = 0;
            }
        };

        Events.on(engine, 'afterUpdate', pauseIfIdle);
        Events.on(engine.world, 'afterAdd', wakeScene);
        Events.on(engine.world, 'afterRemove', wakeScene);

        const wakeOnPointer = () => wake();
        render.canvas.addEventListener('mousedown', wakeOnPointer);
        render.canvas.addEventListener('touchstart', wakeOnPointer, { passive: true });

        // Exposed so style-only repaints (search highlight, theme) and resize can wake it.
        engine.requestWake = wake;
        // Exposed activity getter (perf #78): the TextOverlay and useBubbleNotifications
        // rAF loops gate their per-frame O(N) work on this, so an idle scene costs ~0.
        engine.isAwake = () => running;

        // Register afterRender hook for bubble effects
        const afterRenderHandler = () => {
            const effectType = themeRef.current?.custom?.bubble?.effect || 'none';
            const effectParams = themeRef.current?.custom?.bubble?.effectParams;
            switch (effectType) {
                case 'glow':
                    // Draw neon glow halos around each bubble
                    if (effectParams && renderRef.current) {
                        const ctx = renderRef.current.context;
                        const glowColor = effectParams.glowColor || '#a78bfa';
                        const blurRadius = effectParams.blurRadius || 12;

                        // Iterate over all bodies and draw glow for circle bodies
                        const bodies = engine.world.bodies;
                        ctx.save();
                        bodies.forEach((body) => {
                            if (body.label === 'Circle Body' && body.circleRadius) {
                                const radius = body.circleRadius;
                                const x = body.position.x;
                                const y = body.position.y;

                                // Set up shadow glow (shadow is computed from stroke alpha)
                                ctx.shadowBlur = blurRadius;
                                ctx.shadowColor = glowColor;
                                ctx.shadowOffsetX = 0;
                                ctx.shadowOffsetY = 0;

                                // Draw opaque neon rim at bubble edge
                                // Rim is both visible and casts the shadow halo
                                ctx.strokeStyle = glowColor;
                                ctx.lineWidth = 1.5;
                                ctx.beginPath();
                                ctx.arc(x, y, radius, 0, Math.PI * 2);
                                ctx.stroke();
                            }
                        });
                        ctx.restore();
                    }
                    break;
                case 'hardShadow':
                    // Two-pass draw: shadows first, then bubbles redraw on top
                    if (effectParams && renderRef.current) {
                        const ctx = renderRef.current.context;
                        const dx = effectParams.dx || 5;
                        const dy = effectParams.dy || 5;
                        const shadowColor = effectParams.shadowColor || '#000000';
                        const shadowAlpha = effectParams.shadowAlpha || 0.5;

                        // Parse hex color once, before loops
                        const shadowRgbaStyle = hexToRgba(shadowColor, shadowAlpha) || `rgba(0, 0, 0, ${shadowAlpha})`;

                        const bodies = engine.world.bodies;
                        ctx.save();

                        // Pass 1: Draw all shadow discs
                        bodies.forEach((body) => {
                            if (body.label === 'Circle Body' && body.circleRadius) {
                                const radius = body.circleRadius;
                                const x = body.position.x;
                                const y = body.position.y;

                                // Draw opaque shadow disc at offset position
                                ctx.fillStyle = shadowRgbaStyle;
                                ctx.beginPath();
                                ctx.arc(x + dx, y + dy, radius, 0, Math.PI * 2);
                                ctx.fill();
                            }
                        });

                        // Pass 2: Redraw all bubbles on top (matching Matter's render style)
                        bodies.forEach((body) => {
                            if (body.label === 'Circle Body' && body.circleRadius) {
                                const radius = body.circleRadius;
                                const x = body.position.x;
                                const y = body.position.y;

                                // Redraw circle with the body's own render props
                                ctx.beginPath();
                                ctx.arc(x, y, radius, 0, Math.PI * 2);

                                // Apply fill if present
                                if (body.render.fillStyle) {
                                    ctx.fillStyle = body.render.fillStyle;
                                    ctx.fill();
                                }

                                // Apply stroke if present
                                if (body.render.strokeStyle && body.render.lineWidth) {
                                    ctx.strokeStyle = body.render.strokeStyle;
                                    ctx.lineWidth = body.render.lineWidth;
                                    ctx.stroke();
                                }
                            }
                        });

                        ctx.restore();
                    }
                    break;
                case 'clay':
                    // Two-pass draw: soft shadows first, then bubbles with highlights
                    if (effectParams && renderRef.current) {
                        const ctx = renderRef.current.context;
                        const shadowColor = effectParams.shadowColor || 'rgba(0, 0, 0, 0.1)';
                        const shadowFill = effectParams.shadowFill || 'rgba(0, 0, 0, 0.8)';
                        const blurRadius = effectParams.blurRadius || 12;
                        const dx = effectParams.dx || 3;
                        const dy = effectParams.dy || 3;
                        const highlightInner = effectParams.highlightInner || 'rgba(255, 255, 255, 0.5)';
                        const highlightOuter = effectParams.highlightOuter || 'rgba(255, 255, 255, 0)';

                        const bodies = engine.world.bodies;
                        ctx.save();

                        // Pass 1: Draw soft shadows behind all bubbles
                        bodies.forEach((body) => {
                            if (body.label === 'Circle Body' && body.circleRadius) {
                                const radius = body.circleRadius;
                                const x = body.position.x;
                                const y = body.position.y;

                                // Draw a filled disc that will cast a soft blur shadow
                                ctx.shadowBlur = blurRadius;
                                ctx.shadowColor = shadowColor;
                                ctx.shadowOffsetX = dx;
                                ctx.shadowOffsetY = dy;

                                // Use explicit opaque fill for shadow disc source
                                ctx.fillStyle = shadowFill;
                                ctx.beginPath();
                                ctx.arc(x, y, radius, 0, Math.PI * 2);
                                ctx.fill();
                            }
                        });

                        // Reset shadow properties for pass 2
                        ctx.shadowBlur = 0;
                        ctx.shadowColor = 'transparent';
                        ctx.shadowOffsetX = 0;
                        ctx.shadowOffsetY = 0;

                        // Pass 2: Redraw bubbles on top with subtle highlight
                        bodies.forEach((body) => {
                            if (body.label === 'Circle Body' && body.circleRadius) {
                                const radius = body.circleRadius;
                                const x = body.position.x;
                                const y = body.position.y;

                                // Redraw circle with the body's own render props
                                ctx.beginPath();
                                ctx.arc(x, y, radius, 0, Math.PI * 2);

                                // Apply fill if present
                                if (body.render.fillStyle) {
                                    ctx.fillStyle = body.render.fillStyle;
                                    ctx.fill();
                                }

                                // Apply stroke if present
                                if (body.render.strokeStyle && body.render.lineWidth) {
                                    ctx.strokeStyle = body.render.strokeStyle;
                                    ctx.lineWidth = body.render.lineWidth;
                                    ctx.stroke();
                                }

                                // Add subtle radial highlight for 3D clay effect
                                // Gradient goes from highlight at top-left to transparent at edges
                                const highlightGradient = ctx.createRadialGradient(
                                    x - radius * 0.4, y - radius * 0.4, 0,
                                    x, y, radius
                                );
                                highlightGradient.addColorStop(0, highlightInner);
                                highlightGradient.addColorStop(1, highlightOuter);

                                ctx.fillStyle = highlightGradient;
                                ctx.beginPath();
                                ctx.arc(x, y, radius, 0, Math.PI * 2);
                                ctx.fill();
                            }
                        });

                        ctx.restore();
                    }
                    break;
                case 'none':
                default:
                    // No effect, do nothing
                    break;
            }
        };
        Events.on(render, 'afterRender', afterRenderHandler);

        // Resize sync is handled by useMatterResize hook

        return () => {
            // cleanup handled below; resize listeners removed by hook
            Events.off(mouseConstraint, 'mousedown', mousedownHandler);
            Events.off(mouseConstraint, 'mouseup', mouseupHandler);
            Events.off(render, 'afterRender', afterRenderHandler);
            Events.off(engine, 'afterUpdate', pauseIfIdle);
            Events.off(engine.world, 'afterAdd', wakeScene);
            Events.off(engine.world, 'afterRemove', wakeScene);
            render.canvas.removeEventListener('mousedown', wakeOnPointer);
            render.canvas.removeEventListener('touchstart', wakeOnPointer);
            Runner.stop(runner);
            Render.stop(render);
            World.clear(engine.world);
            Engine.clear(engine);
            render.canvas.remove();
            render.textures = {};
            if (typeof unsubscribeTasks === 'function') unsubscribeTasks();
        };
    }, []); // Убираем themeMode из зависимостей
}
