import { useEffect, useRef } from 'react';
import { db } from '../firebase';
import {
    createCategory,
    deleteCategory,
    newCategoryId,
    nextCategoryOrder,
    reorderCategories,
    subscribeCategories,
    updateCategory
} from '../services/data/categories';
import logger from '../utils/logger';
import { useBubblesData } from '../state/BubblesDataStore';
import { useBubblesUi } from '../state/BubblesUiStore';
import {
    getNextAvailableColor as getNextAvailableColorPure,
    isColorAvailable as isColorAvailablePure,
    canCreateMoreTags as canCreateMoreTagsPure
} from './tagColors';
import { isTagNameTaken } from './tagNames';

/**
 * Tag state + behaviour extracted from BubblesPage (Task 2/6 of #38).
 * Tags are the user's categories, users/{uid}/categories (data contract v2):
 * src/services/data/categories.js reads and writes them; the live subscription
 * brings every change back into `tags` (sorted by order).
 *
 * Seam note: the live subscription only sets `tags`; filter reconciliation and
 * bubble recolouring stay in BubblesPage as a separate effect keyed on `[tags]`.
 *
 * The filters are user settings kept by BubblesUiStore; a new category is added
 * to them through includeCategoryInFilters.
 */
export function useTags({ user }) {
    const { tags, setTags } = useBubblesData();
    const {
        includeCategoryInFilters,
        // Tag-editor state migrated into the store (Stage H of 010d); the handlers
        // below read/set it here instead of via local useState.
        tagName, setTagName, tagColor, setTagColor, editingTag, setEditingTag,
        setTagDialog, setDeletingTags,
    } = useBubblesUi();
    const tagsRef = useRef(tags);
    useEffect(() => { tagsRef.current = tags; }, [tags]);
    const userUid = user?.uid ?? null;
    const userUidRef = useRef(userUid);
    userUidRef.current = userUid;
    const deleteTimers = useRef(new Map()); // Таймеры удаления тегов

    useEffect(() => () => {
        deleteTimers.current.forEach(({ timer }) => clearTimeout(timer));
        deleteTimers.current.clear();
    }, [userUid]);

    // Real-time categories (wait for auth user).
    // Only setTags lives here; filter reconciliation + bubble recolor stay in
    // BubblesPage as a [tags] effect.
    useEffect(() => {
        if (!userUid) return;
        const unsubscribe = subscribeCategories(db, userUid, setTags, (e) => logger.error('Categories listener error:', e));
        return () => unsubscribe();
    }, [userUid]);

    // Функции для работы с цветами
    const getNextAvailableColor = () => getNextAvailableColorPure(tags);
    const isColorAvailable = (color) => isColorAvailablePure(tags, color, editingTag);
    const canCreateMoreTags = () => canCreateMoreTagsPure(tags);

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

        if (isTagNameTaken(tags, tagName, editingTag)) {
            return; // Имя уже есть у другой категории
        }

        const name = tagName.trim();
        if (editingTag) {
            // Only the fields that changed; the live subscription updates `tags`
            const changes = {};
            if (name !== editingTag.name) changes.name = name;
            if (tagColor !== editingTag.color) changes.color = tagColor;
            if (Object.keys(changes).length > 0) {
                updateCategory(db, userUid, editingTag.id, changes).catch(e => logger.error('Error saving tag:', e));
            }
        } else {
            // A new category goes after the last one (spec 4.5)
            const newTag = { id: newCategoryId(db, userUid), name, color: tagColor, order: nextCategoryOrder(tags) };
            createCategory(db, userUid, newTag.id, { name: newTag.name, color: newTag.color, order: newTag.order })
                .catch(e => logger.error('Error saving tag:', e));

            // Автоматически активируем новый тег в фильтрах (только для создания, не для редактирования)
            includeCategoryInFilters(newTag.id);
        }

        setTagDialog(false);
        setEditingTag(null);
        setTagName('');
        setTagColor(getNextAvailableColor() || '#2f6bdb');
    };

    // Drag-and-drop in the categories panel or dialog: one write, or one renumbering batch
    const handleReorderTags = (reordered) => {
        reorderCategories(db, userUid, reordered).catch(e => logger.error('Error reordering tags:', e));
    };

    const handleDeleteTag = (tagId) => {
        const initiatingUid = userUid;
        if (!initiatingUid) return;
        const existing = deleteTimers.current.get(tagId);
        if (existing) clearTimeout(existing.timer);
        // Добавляем тег в состояние удаления
        setDeletingTags(prev => new Set([...prev, tagId]));

        // Создаем таймер и сохраняем его
        const timer = setTimeout(() => {
            const pending = deleteTimers.current.get(tagId);
            if (!pending || pending.timer !== timer) return;
            deleteTimers.current.delete(tagId);

            setDeletingTags(prev => {
                const newSet = new Set(prev);
                newSet.delete(tagId);
                return newSet;
            });

            if (userUidRef.current !== pending.uid) return;

            // The server clears categoryId on this category's tasks (onCategoryDeleted, spec 4.5);
            // until then a task of a missing category shows as uncategorized.
            deleteCategory(db, pending.uid, tagId).catch(e => logger.error('Error deleting tag:', e));
        }, 7000);

        // Сохраняем таймер
        deleteTimers.current.set(tagId, { timer, uid: initiatingUid });
    };

    const handleCloseTagDialog = () => {
        setTagDialog(false);
        setEditingTag(null);
        setTagName('');
        setTagColor(getNextAvailableColor() || '#2f6bdb');
    };

    const handleUndoDeleteTag = (tagId) => {
        // Очищаем таймер удаления
        const pending = deleteTimers.current.get(tagId);
        if (pending) {
            clearTimeout(pending.timer);
            deleteTimers.current.delete(tagId);
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
        tagsRef,
        deleteTimers: deleteTimers.current,
        handleOpenTagDialog,
        handleSaveTag,
        handleReorderTags,
        handleDeleteTag,
        handleUndoDeleteTag,
        handleCloseTagDialog,
        getNextAvailableColor
    };
}
