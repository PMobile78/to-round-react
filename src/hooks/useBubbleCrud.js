import { useEffect, useState } from 'react';
import Matter from 'matter-js';
import {
    BUBBLE_STATUS,
    markBubbleAsDeleted,
    clearBubblesFromFirestore,
    upsertBubble,
    updateBubbleFields,
    buildStatusFields
} from '../services/firestoreService';
import logger from '../utils/logger';
import { formatLocalDateTime, getUserTimeZone, parseLocalDateTime } from '../utils/dateTime';
import { useBubblesStore } from '../state/BubblesStore';

/**
 * Bubble create/edit/delete/done CRUD + dialog state, extracted from
 * BubblesPage (Task 5/6 of #38). This is also the "bubbles sync" layer —
 * optimistic local updates paired with upsertBubble / updateBubbleFields /
 * markBubbleAsDeleted from firestoreService (the live read subscription itself
 * lives in useMatterEngine).
 *
 * `bubbles`/`setBubbles` and the Matter refs stay owned by BubblesPage and are
 * passed in directly. `deps` is a ref bridging values the handlers need at
 * call-time that are defined *after* this hook runs (it owns selectedBubble/
 * editDialog, which useMatterEngine and useBubbleNotifications consume, so it
 * must run early) or that come from those later hooks — tags, selectedTagId,
 * selectedCategory, getBubbleFillStyle, canvasSize and the notification state.
 */
export function useBubbleCrud({ engineRef, renderRef, bubbles, setBubbles, theme, isMobile, deps }) {
    const { registered } = useBubblesStore();
    const [createDialog, setCreateDialog] = useState(false); // Диалог создания нового пузыря
    const [editDialog, setEditDialog] = useState(false);
    const [selectedBubble, setSelectedBubble] = useState(null);
    // Режим редактора для создания и редактирования
    const [useRichTextCreate, setUseRichTextCreate] = useState(false);
    const [useRichTextEdit, setUseRichTextEdit] = useState(false);
    const [bubbleSize, setBubbleSize] = useState(45); // Размер по умолчанию
    const [editBubbleSize, setEditBubbleSize] = useState(45); // Размер при редактировании

    // Bubble creation function
    const createBubble = (x, y, radius, tagId = null) => {
        const { tags, getBubbleFillStyle } = registered;
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

    // Function for opening create bubble dialog
    const openCreateDialog = ({ setDueDate, setCreateNotifications }) => {
        const { selectedCategory, tags, setSelectedTagId } = registered;
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
        const { canvasSize, selectedTagId, dueDate, createNotifications, createRecurrence, setSelectedTagId, setDueDate } = deps.current;
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
        const { getBubbleFillStyle, selectedTagId, tags, editDueDate, manuallyStoppedPulsingRef, editNotifications, editRecurrence, setEditDueDate } = deps.current;
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
        const { tags } = registered;
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
        const { setSelectedTagId } = registered;
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

    const handleToggleEditUseRichText = (enabled) => {
        setUseRichTextEdit(!!enabled);
        if (!selectedBubble) return;
        // Обновляем выбранный пузырь и сохраняем в БД
        setSelectedBubble(prev => prev ? { ...prev, useRichText: !!enabled } : prev);
        const fields = { useRichText: !!enabled, updatedAt: new Date().toISOString() };
        setBubbles(prev => prev.map(b => b.id === selectedBubble.id ? { ...b, ...fields } : b));
        updateBubbleFields(selectedBubble.id, fields).catch(e => logger.error('Error toggling rich text:', e));
    };

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
        // Intentional: setSelectedBubble/setEditDialog are stable useState setters and do not
        // need to be listed. bubbles is in the array so the handler always sees the latest list.
    }, [bubbles]);

    return {
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
        createBubble,
        openCreateDialog,
        createNewBubble,
        handleSaveBubble,
        handleDeleteBubble,
        handleMarkAsDone,
        handleCloseDialog,
        clearAllBubbles,
        handleToggleEditUseRichText
    };
}
