/**
 * Categories of one user, users/{uid}/categories (data contract v2, spec sections 3.2 and 4.5).
 * The UI keeps calling them tags; only this layer knows the documents.
 */
import { collection, deleteDoc, doc, onSnapshot, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { categoryFromDoc, categoryUpdateData, newCategoryData } from './convert';

const categoriesCollection = (db, uid) => collection(db, 'users', uid, 'categories');
const categoryRef = (db, uid, id) => doc(db, 'users', uid, 'categories', id);

/** By order; equal orders by id, so every device shows them the same way. */
export const sortCategories = (categories) => [...categories].sort((a, b) => (a.order - b.order) || (a.id < b.id ? -1 : 1));

/** A new category goes after the last one. */
export const nextCategoryOrder = (categories) => (categories.length === 0
    ? 1
    : Math.max(...categories.map((c) => c.order)) + 1);

const isAscending = (list) => list.every((c, i) => i === 0 || list[i - 1].order < c.order);

/**
 * Writes that make `reordered` (the categories in their new sequence, with their current orders)
 * ascending. One moved category gets an order between its new neighbours; if the neighbours
 * share an order or no number fits between them, every category is renumbered 1, 2, 3…
 * Returns [{ id, order }]: empty, one entry, or one per category.
 */
export const planCategoryOrder = (reordered) => {
    if (isAscending(reordered)) return [];
    for (let i = 0; i < reordered.length; i += 1) {
        if (!isAscending(reordered.filter((_, j) => j !== i))) continue;
        const prev = reordered[i - 1];
        const next = reordered[i + 1];
        let order;
        if (!prev) order = next.order - 1;
        else if (!next) order = prev.order + 1;
        else order = (prev.order + next.order) / 2;
        if ((!prev || order > prev.order) && (!next || order < next.order)) return [{ id: reordered[i].id, order }];
        break;
    }
    return reordered.map((c, i) => ({ id: c.id, order: i + 1 }));
};

/** Live list of categories, sorted. */
export const subscribeCategories = (db, uid, onList, onError) => onSnapshot(categoriesCollection(db, uid), (snapshot) => {
    onList(sortCategories(snapshot.docs.map((d) => categoryFromDoc(d.id, d.data()))));
}, onError);

export const newCategoryId = (db, uid) => doc(categoriesCollection(db, uid)).id;

/** fields = { name, color, order }. */
export const createCategory = (db, uid, id, fields) => setDoc(categoryRef(db, uid, id), newCategoryData(fields));

export const updateCategory = (db, uid, id, changes) => updateDoc(categoryRef(db, uid, id), categoryUpdateData(changes));

/** The server clears categoryId on this category's tasks (onCategoryDeleted). */
export const deleteCategory = (db, uid, id) => deleteDoc(categoryRef(db, uid, id));

/** Saves a drag-and-drop result: one write, or one batch that renumbers every category. */
export const reorderCategories = async (db, uid, reordered) => {
    const writes = planCategoryOrder(reordered);
    if (writes.length === 0) return;
    if (writes.length === 1) {
        await updateCategory(db, uid, writes[0].id, { order: writes[0].order });
        return;
    }
    const batch = writeBatch(db);
    writes.forEach(({ id, order }) => batch.update(categoryRef(db, uid, id), categoryUpdateData({ order })));
    await batch.commit();
};
