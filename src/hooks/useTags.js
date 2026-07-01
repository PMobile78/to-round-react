import { useEffect, useRef, useState } from 'react';
import { lsSet } from '../utils/storage';
import { LS } from '../utils/storageKeys';
import {
    subscribeToTagsUpdates,
    upsertTagInFirestore,
    deleteTagFromFirestore,
    updateBubbleFields,
    BUBBLE_STATUS
} from '../services/firestoreService';
import logger from '../utils/logger';
import { applyBubbleFill } from '../utils/bubbleStyle';
import { useBubblesStore } from '../state/BubblesStore';
import {
    COLOR_PALETTE,
    getNextAvailableColor as getNextAvailableColorPure,
    isColorAvailable as isColorAvailablePure,
    canCreateMoreTags as canCreateMoreTagsPure
} from './tagColors';

/**
 * Tag state + behaviour extracted from BubblesPage (Task 2/6 of #38).
 *
 * Seam note: the original `subscribeToTagsUpdates` effect did three things —
 * (1) setTags, (2) reconcile filter tags, (3) recolor bubbles. Only (1) lives
 * here; (2)+(3) stay in BubblesPage as a separate effect keyed on `[tags]`.
 *
 * Cross-hook deps the tag handlers need at call-time — `setBubbles`,
 * `setFilterTags`, `setListFilterTags`, `getBubbleFillStyle` — are read from
 * BubblesStore: `setBubbles` is a store setter; the filter setters and
 * getBubbleFillStyle are published via register() by useBubbleFilters,
 * useListFilters and BubblesPage respectively. Reading them from the store
 * (instead of plain params) still avoids the useTags <-> useBubbleFilters
 * render-order cycle: `setFilterTags` comes from useBubbleFilters, which needs
 * `tags` produced here.
 */
export function useTags({ user, bubbles }) {
    const { setBubbles, registered, tags, setTags } = useBubblesStore();
    const tagsRef = useRef(tags);
    useEffect(() => { tagsRef.current = tags; }, [tags]);
    const [tagDialog, setTagDialog] = useState(false);
    const [tagName, setTagName] = useState('');
    const [tagColor, setTagColor] = useState('#2f6bdb');
    const [editingTag, setEditingTag] = useState(null);
    const [deletingTags, setDeletingTags] = useState(new Set()); // Теги в процессе удаления
    const [deleteTimers, setDeleteTimers] = useState(new Map()); // Таймеры удаления тегов

    // Real-time tags synchronization (wait for auth user).
    // Only setTags lives here; filter reconciliation + bubble recolor stay in
    // BubblesPage as a [tags] effect.
    useEffect(() => {
        if (!user) return;
        const unsubscribe = subscribeToTagsUpdates((updatedTags) => {
            // Ensure updatedTags is always an array
            const tagsArray = Array.isArray(updatedTags) ? updatedTags : [];
            setTags(tagsArray);
        });

        return () => unsubscribe();
    }, [user]);

    // Функции для работы с цветами
    const getNextAvailableColor = () => getNextAvailableColorPure(tags);
    const isColorAvailable = (color) => isColorAvailablePure(tags, color, editingTag);
    const canCreateMoreTags = () => canCreateMoreTagsPure(tags);

    // Count ACTIVE bubbles by category (for the category management dialog).
    // Excludes done/deleted bubbles so this matches the categories panel
    // (getCategoryBubbleCounts) and the bubbles-view filter counts
    // (getBubbleCountByTagForBubblesView); previously it counted every status,
    // so the dialog count drifted above the panel (e.g. "11" vs "10").
    const getBubbleCountByTag = (tagId) => {
        const activeBubbles = bubbles.filter(bubble => bubble.status === BUBBLE_STATUS.ACTIVE);
        if (tagId === null) {
            // Count bubbles without tags or with deleted tags
            return activeBubbles.filter(bubble => {
                if (!bubble.tagId) return true;
                const tagExists = tags.find(t => t.id === bubble.tagId);
                return !tagExists; // Включаем пузыри с удаленными тегами
            }).length;
        }
        return activeBubbles.filter(bubble => bubble.tagId === tagId).length;
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
        const { setFilterTags, setListFilterTags } = registered;
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
                lsSet(LS.FILTER_TAGS, newFilterTags);
                return newFilterTags;
            });

            // Активируем в фильтрах List View
            setListFilterTags(prev => {
                const newListFilterTags = [...prev, newTag.id];
                lsSet(LS.LIST_FILTER_TAGS, newListFilterTags);
                return newListFilterTags;
            });
        }

        setTagDialog(false);
        setEditingTag(null);
        setTagName('');
        setTagColor(getNextAvailableColor() || '#2f6bdb');
    };

    const handleDeleteTag = (tagId) => {
        const { getBubbleFillStyle } = registered;
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
                    // Reset bubble color to no-tag style
                    applyBubbleFill(bubble, { tagColor: null, stroke: '#B0B0B0' }, getBubbleFillStyle);
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

    return {
        tags,
        setTags,
        tagsRef,
        tagDialog,
        tagName,
        setTagName,
        tagColor,
        setTagColor,
        editingTag,
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
    };
}
