/**
 * The one-time move from the v1 collections to users/{uid} (spec section 9). It reads
 * user-bubbles/{uid}/bubbles and user-tags/{uid}, which stay as they are, maps them by the rules
 * of 9.2, and writes the categories and tasks users/{uid} does not have yet, with their own times,
 * in batches of at most 450. The marker users/{uid}.migration goes last, so a move cut short runs
 * again at the next sign-in and writes only what is missing (spec 9.1).
 */
import { collection, doc, getDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { mapCategoriesV1, mapTaskV1 } from '../../contract/migrateV1';
import { commitInBatches } from './backup';
import { newCategoryData, newUserDocData, restoredTaskData, settingsUpdateData } from './convert';

/** The v1 data of uid: { bubbles: [{ id, ...fields }], tags: [{ id, name, color }] }. */
export const readV1Data = async (db, uid) => {
    const [bubbles, tags] = await Promise.all([
        getDocs(collection(db, 'user-bubbles', uid, 'bubbles')),
        getDoc(doc(db, 'user-tags', uid)),
    ]);
    const tagList = tags.exists() ? tags.data().tags : null;
    return {
        bubbles: bubbles.docs.map((d) => ({ ...d.data(), id: d.id })),
        tags: Array.isArray(tagList) ? tagList : [],
    };
};

/** Spec 9.1: the move runs while users/{uid}.migration is missing and v1 holds data. userData: users/{uid} or null. */
export const migrationNeeded = (userData, v1) => !(userData && userData.migration)
    && (v1.bubbles.length > 0 || v1.tags.length > 0);

/** The v1 data to move, or null when there is nothing to move (spec 9.1). */
export const checkMigration = async (db, uid) => {
    const [user, v1] = await Promise.all([getDoc(doc(db, 'users', uid)), readV1Data(db, uid)]);
    return migrationNeeded(user.exists() ? user.data() : null, v1) ? v1 : null;
};

// Notes of mapTaskV1 that the preview lists (spec 9.1).
const ROUNDED = ['reminders-rounded', 'repeat-rounded'];
const CHANGED = ['due-dropped', 'reminder-dropped', 'reminders-truncated', 'repeat-dropped', 'title-truncated',
    'description-truncated'];

/**
 * What the move writes, and its preview (spec 9.1). Pure. ctx = { now, timeZone, language }.
 * preview = { tasks, categories, rounded: [{ id, title }], lostFormatting: [...], changed: [...],
 * recolored: [{ id, name }], skipped: { tasks, categories } }.
 */
export const planMigration = (v1, ctx) => {
    const { categories, notes } = mapCategoriesV1(v1.tags);
    const categoryIds = new Set(categories.map((c) => c.id));
    const mapped = v1.bubbles.map((bubble) => mapTaskV1(bubble, { ...ctx, categoryIds }));
    const tasks = mapped.filter((m) => m.task !== null).map((m) => m.task);
    const withNote = (codes) => mapped
        .filter((m) => m.task !== null && m.notes.some((code) => codes.includes(code)))
        .map(({ task }) => ({ id: task.id, title: task.title }));
    const names = new Map(categories.map((c) => [c.id, c.name]));
    return {
        categories,
        tasks,
        preview: {
            tasks: tasks.length,
            categories: categories.length,
            rounded: withNote(ROUNDED),
            lostFormatting: withNote(['formatting-lost']),
            changed: withNote(CHANGED),
            recolored: notes.filter((n) => n.code === 'color-changed').map((n) => ({ id: n.id, name: names.get(n.id) })),
            skipped: {
                tasks: mapped.length - tasks.length,
                categories: notes.filter((n) => n.code === 'invalid-record' || n.code === 'category-dropped').length,
            },
        },
    };
};

const sameIds = (list, ids) => Array.isArray(list) && list.length > 0 && list.length === ids.length
    && ids.every((id) => list.includes(id));

/**
 * The settings that change after the move: v1 kept "all categories" as the list of every one of
 * them (settingsFromLocalStorage keeps that list); once the categories are moved, such a list is
 * null, so the categories made later show too. Returns { bubbleFilter?, listFilter? }.
 */
export const filtersAfterMigration = (settings, categoryIds) => {
    const changes = {};
    ['bubbleFilter', 'listFilter'].forEach((key) => {
        if (sameIds(settings[key].categoryIds, categoryIds)) changes[key] = { ...settings[key], categoryIds: null };
    });
    return changes;
};

/**
 * Writes the move (spec 9.1): what users/{uid} lacks, then the marker with the "all categories"
 * filters as null. settings are the app's settings, used when users/{uid} does not exist yet
 * (the first sign-in could not create it). onProgress(done, total) as in commitInBatches.
 */
export const runMigration = async (db, uid, plan, settings, onProgress) => {
    const [categoryDocs, taskDocs, user] = await Promise.all([
        getDocs(collection(db, 'users', uid, 'categories')),
        getDocs(collection(db, 'users', uid, 'tasks')),
        getDoc(doc(db, 'users', uid)),
    ]);
    const haveCategories = new Set(categoryDocs.docs.map((d) => d.id));
    const haveTasks = new Set(taskDocs.docs.map((d) => d.id));
    const writes = [
        ...plan.categories.filter((c) => !haveCategories.has(c.id)).map(({ id, name, color, order }) => (
            { type: 'set', path: ['categories', id], data: newCategoryData({ name, color, order }) })),
        ...plan.tasks.filter((t) => !haveTasks.has(t.id)).map((task) => (
            { type: 'set', path: ['tasks', task.id], data: restoredTaskData(task) })),
    ];
    const migration = { fromV1At: serverTimestamp(), tasks: plan.tasks.length, categories: plan.categories.length };
    const categoryIds = plan.categories.map((c) => c.id);
    if (user.exists()) {
        const filters = filtersAfterMigration(user.data().settings, categoryIds);
        writes.push({ type: 'update', path: [], data: { ...settingsUpdateData(filters), migration } });
    } else {
        const filters = filtersAfterMigration(settings, categoryIds);
        writes.push({ type: 'set', path: [], data: { ...newUserDocData({ ...settings, ...filters }), migration } });
    }
    await commitInBatches(db, uid, writes, onProgress);
};
