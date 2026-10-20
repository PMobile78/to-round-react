/**
 * Backup of one user (spec section 10). The export reads users/{uid} with its categories and
 * tasks; the import replaces them with a backup's: a record the user has is updated in place
 * (never deleted and created again: onCategoryDeleted would clear categoryId on tasks already
 * restored), a new one is created with its own times, the rest is deleted. Writes go in batches
 * of at most 450, one after another (#92); the canvas and the list follow them through their
 * listeners, so nothing reloads the page (#101).
 */
import { collection, doc, getDoc, getDocs, writeBatch } from 'firebase/firestore';
import { buildBackup } from '../../contract/backup';
import {
    categoryFromDoc, categoryUpdateData, newCategoryData, restoredTaskData, settingsFromUserDoc,
    settingsUpdateData, taskFromDoc, taskUpdateData, timestampFromIso,
} from './convert';
import { sortCategories } from './categories';

export const MAX_BATCH_WRITES = 450;

// Pending serverTimestamp() fields read as the local estimate instead of null.
const READ_OPTIONS = { serverTimestamps: 'estimate' };

/** Everything a backup holds, in backup form: { settings, categories (by order), tasks }. */
export const readUserData = async (db, uid) => {
    const [user, categories, tasks] = await Promise.all([
        getDoc(doc(db, 'users', uid)),
        getDocs(collection(db, 'users', uid, 'categories')),
        getDocs(collection(db, 'users', uid, 'tasks')),
    ]);
    return {
        settings: settingsFromUserDoc(user.data()),
        categories: sortCategories(categories.docs.map((d) => categoryFromDoc(d.id, d.data()))),
        tasks: tasks.docs.map((d) => taskFromDoc(d.id, d.data(READ_OPTIONS))),
    };
};

/** The v2 backup file of this user now. */
export const exportBackup = async (db, uid, now = new Date()) => buildBackup(await readUserData(db, uid), now);

/**
 * The writes that replace the user's data with a backup (readBackup's result), in order:
 * categories, tasks, deletions of tasks, deletions of categories, settings. Pure.
 * current = { categoryIds: Set, taskIds: Set }. A write is { type: 'set' | 'update' | 'delete',
 * path: [] (users/{uid}) or [collection, id], data }.
 */
export const planReplace = (current, backup) => {
    const writes = [];
    backup.categories.forEach(({ id, name, color, order }) => {
        writes.push(current.categoryIds.has(id)
            ? { type: 'update', path: ['categories', id], data: categoryUpdateData({ name, color, order }) }
            : { type: 'set', path: ['categories', id], data: newCategoryData({ name, color, order }) });
    });
    backup.tasks.forEach((task) => {
        if (!current.taskIds.has(task.id)) {
            writes.push({ type: 'set', path: ['tasks', task.id], data: restoredTaskData(task) });
            return;
        }
        const { id, createdAt, updatedAt, deletedAt, ...fields } = task;
        writes.push({
            type: 'update',
            path: ['tasks', id],
            data: taskUpdateData({ ...fields, deletedAt: deletedAt === null ? null : timestampFromIso(deletedAt) }),
        });
    });
    const taskIds = new Set(backup.tasks.map((t) => t.id));
    current.taskIds.forEach((id) => {
        if (!taskIds.has(id)) writes.push({ type: 'delete', path: ['tasks', id] });
    });
    const categoryIds = new Set(backup.categories.map((c) => c.id));
    current.categoryIds.forEach((id) => {
        if (!categoryIds.has(id)) writes.push({ type: 'delete', path: ['categories', id] });
    });
    if (backup.settings) writes.push({ type: 'update', path: [], data: settingsUpdateData(backup.settings) });
    return writes;
};

/** The numbers the confirmation shows (spec 10). */
export const importCounts = (backup, writes) => ({
    tasks: backup.tasks.length,
    categories: backup.categories.length,
    settings: backup.settings !== null,
    deletedTasks: writes.filter((w) => w.type === 'delete' && w.path[0] === 'tasks').length,
    deletedCategories: writes.filter((w) => w.type === 'delete' && w.path[0] === 'categories').length,
});

/** What importing this backup writes now: { writes, counts }. */
export const planImport = async (db, uid, backup) => {
    const [categories, tasks] = await Promise.all([
        getDocs(collection(db, 'users', uid, 'categories')),
        getDocs(collection(db, 'users', uid, 'tasks')),
    ]);
    const writes = planReplace({
        categoryIds: new Set(categories.docs.map((d) => d.id)),
        taskIds: new Set(tasks.docs.map((d) => d.id)),
    }, backup);
    return { writes, counts: importCounts(backup, writes) };
};

/** The writes split into batches of at most 450 (#92). */
export const inBatches = (writes, size = MAX_BATCH_WRITES) => {
    const batches = [];
    for (let start = 0; start < writes.length; start += size) batches.push(writes.slice(start, start + size));
    return batches;
};

/**
 * Commits the writes batch after batch; onProgress(done, total) after each one. A failed batch
 * rejects with error.committed = the writes committed before it; the same import run again
 * finishes the job (#92).
 */
export const commitInBatches = async (db, uid, writes, onProgress = () => {}) => {
    let done = 0;
    for (const batchWrites of inBatches(writes)) {
        const batch = writeBatch(db);
        batchWrites.forEach(({ type, path, data }) => {
            const ref = doc(db, 'users', uid, ...path);
            if (type === 'set') batch.set(ref, data);
            else if (type === 'update') batch.update(ref, data);
            else batch.delete(ref);
        });
        try {
            await batch.commit();
        } catch (e) {
            e.committed = done;
            throw e;
        }
        done += batchWrites.length;
        onProgress(done, writes.length);
    }
};
