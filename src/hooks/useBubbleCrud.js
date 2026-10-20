import { useEffect, useState } from 'react';
import Matter from 'matter-js';
import { db } from '../firebase';
import { completionChanges, createTask, finishSeries, newTaskId, trashTask, updateTask } from '../services/data/tasks';
import { bubbleFromTask, withTaskChanges } from '../services/data/bubbleModel';
import { taskChangesFromForm, taskFieldsFromForm } from '../services/data/taskForm';
import logger from '../utils/logger';
import { useBubblesData } from '../state/BubblesDataStore';
import { useBubblesUi } from '../state/BubblesUiStore';

/**
 * Bubble create/edit/delete/done CRUD + dialog state, extracted from
 * BubblesPage (Task 5/6 of #38). Writes go to users/{uid}/tasks through
 * src/services/data/tasks.js; the live subscription in useMatterEngine brings
 * every change back. Local updates are made right away only where a Matter
 * body changes (new, re-created, removed from the canvas).
 *
 * `bubbles`/`setBubbles` and the Matter refs stay owned by BubblesPage and are
 * passed in directly. This hook runs early (it owns selectedBubble/editDialog,
 * which useMatterEngine and useBubbleNotifications consume), so values defined by
 * later hooks are not plain props: shared domain values (tags, selectedTagId,
 * selectedCategory, getBubbleFillStyle) are read from BubblesStore at call-time,
 * and page-local UI values (canvasSize + the create/edit due, reminders and repeat)
 * are passed as explicit handler arguments by BubblesPage.
 */
export function useBubbleCrud({ engineRef, renderRef, bubbles, setBubbles, theme, isMobile, uid }) {
    const { tags } = useBubblesData();
    const {
        registered,
        selectedTagId,
        setSelectedTagId,
        bubbleSize,
        setBubbleSize,
        editBubbleSize,
        setEditBubbleSize,
    } = useBubblesUi();
    const [createDialog, setCreateDialog] = useState(false); // Диалог создания нового пузыря
    const [editDialog, setEditDialog] = useState(false);
    const [selectedBubble, setSelectedBubble] = useState(null);

    // Matter.js body of a bubble, coloured by its category (tag)
    const createBody = (x, y, radius, tagId) => {
        const { getBubbleFillStyle } = registered;
        const tagColor = tags.find(t => t.id === tagId)?.color ?? null;
        return Matter.Bodies.circle(x, y, radius, {
            restitution: 0.8,
            frictionAir: 0.01,
            render: {
                fillStyle: getBubbleFillStyle(tagColor),
                strokeStyle: tagColor || '#B0B0B0', // light gray color by default
                lineWidth: theme.custom?.bubble?.strokeWidth ?? 1.5
            }
        });
    };

    // Function for opening create bubble dialog
    const openCreateDialog = ({ setCreateDue, setCreateReminders, setCreateRepeat }) => {
        const { selectedCategory } = registered;
        const categoryReserved = new Set(['all', 'no-tags', 'planned-tasks']);
        const tagFromPanel =
            selectedCategory &&
                !categoryReserved.has(selectedCategory) &&
                tags.some((t) => t.id === selectedCategory)
                ? selectedCategory
                : '';
        setSelectedTagId(tagFromPanel);
        setBubbleSize(45); // Сброс размера к значению по умолчанию
        setCreateDue(null); // Сброс срока
        setCreateReminders([]); // сброс напоминаний
        setCreateRepeat(null); // сброс повтора
        setCreateDialog(true);
    };

    // Function for creating a new bubble
    const createNewBubble = ({ title, description, canvasSize, createDue, createReminders, createRepeat, setCreateDue }) => {
        if (!engineRef.current || !renderRef.current || !title.trim()) {
            return;
        }

        const margin = isMobile ? 50 : 100;
        const fields = taskFieldsFromForm({
            title,
            description,
            categoryId: selectedTagId,
            radius: bubbleSize, // Используем выбранный размер
            due: createDue,
            reminders: createReminders,
            repeat: createRepeat,
        });
        const id = newTaskId(db, uid);
        const now = new Date().toISOString();
        const newBubble = {
            ...bubbleFromTask({ id, ...fields, status: 'active', pulseMuted: false, createdAt: now, updatedAt: now, deletedAt: null }),
            body: createBody(Math.random() * (canvasSize.width - margin * 2) + margin, 50, bubbleSize, fields.categoryId),
        };

        Matter.World.add(engineRef.current.world, newBubble.body);
        setBubbles(prev => [...prev, newBubble]);
        createTask(db, uid, id, fields).catch(e => logger.error('Error saving new bubble:', e));

        // Close dialog and reset form
        setCreateDialog(false);
        setSelectedTagId('');
        setCreateDue(null);
    };

    // Save bubble changes: only the fields the user changed are written. A task that another
    // device deleted for good while the dialog was open is gone from bubbles: no body, no write.
    const handleSaveBubble = ({ title, description, editDue, editReminders, editRepeat, manuallyStoppedPulsingRef, setEditDue }) => {
        if (!title.trim()) return;
        if (selectedBubble && engineRef.current && bubbles.some(b => b.id === selectedBubble.id)) {
            const changes = taskChangesFromForm(selectedBubble, {
                title,
                description,
                categoryId: selectedTagId,
                radius: editBubbleSize,
                due: editDue,
                reminders: editReminders,
                repeat: editRepeat,
            });
            // A new due starts a new cycle: the "stopped manually" mark goes, like pulseMuted.
            if (changes.due !== undefined) {
                manuallyStoppedPulsingRef.current.delete(selectedBubble.id);
            }

            // Удаляем старое тело и добавляем новое (размер и цвет могли измениться)
            const newBody = createBody(selectedBubble.body.position.x, selectedBubble.body.position.y, editBubbleSize, selectedTagId || null);
            if (engineRef.current.world.bodies.some(body => body.id === selectedBubble.body.id)) {
                Matter.World.remove(engineRef.current.world, selectedBubble.body);
            }
            Matter.World.add(engineRef.current.world, newBody);

            const hasChanges = Object.keys(changes).length > 0;
            const updatedBubble = {
                ...withTaskChanges(selectedBubble, hasChanges ? { ...changes, updatedAt: new Date().toISOString() } : {}),
                body: newBody,
            };
            setBubbles(prev => prev.map(b => (b.id === selectedBubble.id ? updatedBubble : b)));
            if (hasChanges) {
                updateTask(db, uid, selectedBubble.id, changes).catch(e => logger.error('Error saving bubble edit:', e));
            }
        }

        setEditDialog(false);
        setSelectedBubble(null);
        setEditDue(null);
        // Не сбрасываем размер - он будет установлен при следующем открытии диалога
    };

    // Delete bubble (move it to the trash)
    const handleDeleteBubble = () => {
        if (selectedBubble && engineRef.current) {
            // Remove from Matter.js world
            Matter.World.remove(engineRef.current.world, selectedBubble.body);

            const deleted = { status: 'deleted', deletedAt: new Date().toISOString() };
            setBubbles(prev => prev.map(b => (b.id === selectedBubble.id ? withTaskChanges(b, deleted) : b)));
            trashTask(db, uid, selectedBubble.id).catch(error => logger.error('Error deleting bubble:', error));
        }
        setEditDialog(false);
        setSelectedBubble(null);
        // Не сбрасываем размер - он будет установлен при следующем открытии диалога
    };

    // "Done" (spec 4.1): the changes go to the bubble at once and to Firestore
    const completeSelected = () => {
        const changes = completionChanges(selectedBubble, new Date());
        setBubbles(prev => prev.map(b => (b.id === selectedBubble.id ? withTaskChanges(b, changes) : b)));
        updateTask(db, uid, selectedBubble.id, changes).catch(e => logger.error('Error marking bubble as done:', e));
    };

    // The pop of a task that is done: the bubble swells and fades with a splash and a sound,
    // leaves the world, and then onPopped runs.
    const popBubble = (bubble, onPopped) => {
        const body = bubble.body;
        // Воспроизвести звук лопанья
        try {
            const popAudio = new window.Audio(`${import.meta.env.BASE_URL}pop.mp3`);
            popAudio.currentTime = 0;
            popAudio.play();
        } catch (e) { /* ignore */ }
        if (!body) {
            onPopped();
            return;
        }
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
                onPopped();
            }
        };
        animatePop();
    };

    // Mark bubble as done
    const handleMarkAsDone = async () => {
        if (selectedBubble && engineRef.current && selectedBubble.repeat && selectedBubble.due) {
            // A repeating task moves to its next due and stays on the canvas: no pop
            try {
                completeSelected();
            } catch (error) {
                logger.error('Error marking bubble as done:', error);
            }
        } else if (selectedBubble && engineRef.current) {
            try {
                // Анимация лопания с брызгами и звуком
                popBubble(selectedBubble, completeSelected);
            } catch (error) {
                logger.error('Error marking bubble as done:', error);
            }
        }
        setEditDialog(false);
        setSelectedBubble(null);
        // Не сбрасываем размер - он будет установлен при следующем открытии диалога
    };

    // "Finish series" of a repeating task (spec 4.1): done like a one-off task, so it pops
    const handleFinishSeries = () => {
        if (selectedBubble && engineRef.current) {
            const { id } = selectedBubble;
            popBubble(selectedBubble, () => {
                setBubbles(prev => prev.map(b => (b.id === id ? withTaskChanges(b, { status: 'done' }) : b)));
                finishSeries(db, uid, id).catch(e => logger.error('Error finishing the series:', e));
            });
        }
        setEditDialog(false);
        setSelectedBubble(null);
    };

    // Close dialog without saving
    const handleCloseDialog = () => {
        setEditDialog(false);
        setSelectedBubble(null);
        setSelectedTagId('');
        // Не сбрасываем размер - он будет установлен при следующем открытии диалога
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
        openCreateDialog,
        createNewBubble,
        handleSaveBubble,
        handleDeleteBubble,
        handleMarkAsDone,
        handleFinishSeries,
        handleCloseDialog
    };
}
