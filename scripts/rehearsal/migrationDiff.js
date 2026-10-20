/**
 * Rehearsal of the move (spec 9.3, step 2): what a v1 export becomes by the rules of 9.2,
 * compared with what the web moved into users/{uid}, record by record. Pure.
 */
import { mapCategoriesV1, mapTaskV1 } from '../../src/contract/migrateV1';

const TIMES = ['createdAt', 'updatedAt', 'deletedAt'];

// Deep equality of JSON-like values; the order of the keys of a map does not matter.
const same = (a, b) => {
    if (a === b) return true;
    if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    const keys = Object.keys(a);
    return keys.length === Object.keys(b).length && keys.every((key) => same(a[key], b[key]));
};

/**
 * file: the v1 export; moved: { language, migration, categories, tasks } read from users/{uid}, in
 * backup form. Returns the numbers and every mismatch ({ kind, id, title, field, expected?, moved? }).
 * A time the move had to make up, because the record's own could not be read, is not compared.
 */
export const migrationDiff = (file, moved) => {
    const mismatches = [];
    const { categories } = mapCategoriesV1(file.tags);
    const movedCategories = new Map(moved.categories.map((c) => [c.id, c]));
    categories.forEach((c) => {
        const m = movedCategories.get(c.id);
        if (!m) {
            mismatches.push({ kind: 'category', id: c.id, title: c.name, field: 'missing' });
            return;
        }
        ['name', 'color', 'order'].forEach((field) => {
            if (!same(c[field], m[field])) mismatches.push({ kind: 'category', id: c.id, title: c.name, field, expected: c[field], moved: m[field] });
        });
    });
    const categoryIds = new Set(categories.map((c) => c.id));
    moved.categories.filter((m) => !categoryIds.has(m.id))
        .forEach((m) => mismatches.push({ kind: 'category', id: m.id, title: m.name, field: 'not in the export' }));

    const movedTasks = new Map(moved.tasks.map((t) => [t.id, t]));
    const expectedIds = new Set();
    file.bubbles.forEach((bubble) => {
        const m = movedTasks.get(String(bubble.id));
        // A v1 task without a zone took the zone of the browser that moved it: read it from the result.
        const ctx = { now: new Date(), timeZone: (m && m.due && m.due.tz) || 'UTC', language: moved.language, categoryIds };
        const { task, notes } = mapTaskV1(bubble, ctx);
        if (!task) return; // the move skips it, and its preview says so
        expectedIds.add(task.id);
        if (!m) {
            mismatches.push({ kind: 'task', id: task.id, title: task.title, field: 'missing' });
            return;
        }
        Object.keys(task).forEach((field) => {
            if (TIMES.includes(field) && notes.includes('timestamp-fixed')) return;
            if (!same(task[field], m[field])) mismatches.push({ kind: 'task', id: task.id, title: task.title, field, expected: task[field], moved: m[field] });
        });
    });
    moved.tasks.filter((m) => !expectedIds.has(m.id))
        .forEach((m) => mismatches.push({ kind: 'task', id: m.id, title: m.title, field: 'not in the export' }));

    return {
        tasks: { expected: expectedIds.size, moved: moved.tasks.length },
        categories: { expected: categories.length, moved: moved.categories.length },
        marker: moved.migration ? { tasks: moved.migration.tasks, categories: moved.migration.categories } : null,
        mismatches,
    };
};
