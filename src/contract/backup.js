/**
 * Backup files (spec section 10). The web writes version 2; it reads version 2 and the v1 files
 * of the old web, which go through the migration rules of section 9.2. The whole file is checked
 * before anything is written (#91): one record that cannot be read refuses the file.
 */
import { mapCategoriesV1, mapTaskV1 } from './migrateV1';
import { validateCategory, validateSettings, validateTask } from './validate';

export const BACKUP_FORMAT = 'to-round-backup';
export const BACKUP_VERSION = 2;

/** code: 'not-a-backup' | 'unsupported-version' | 'invalid-records'; count: the records that cannot be read. */
export class BackupError extends Error {
    constructor(code, count = 0) {
        super(`backup: ${code}`);
        this.name = 'BackupError';
        this.code = code;
        this.count = count;
    }
}

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** The v2 file of these settings, categories and tasks (backup form, spec 10). */
export const buildBackup = ({ settings, categories, tasks }, now) => ({
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    settings,
    categories,
    tasks,
});

const sharedIds = (records) => records.length - new Set(records.map((r) => r.id)).size;

// A zone this browser does not know is still the zone the task was saved in (a device with a
// newer time-zone database); the rules take any zone name of 1–64 characters, and so does the file.
const isZoneName = (tz) => typeof tz === 'string' && tz.length > 0 && tz.length <= 64;
const taskErrors = (task) => validateTask(task)
    .filter((error) => error !== 'due.tz: invalid' || !isZoneName(task.due.tz));

// The rules refuse a time later than the server's; such a time becomes the moment of reading,
// as in the migration (spec 9.2).
const notLater = (iso, now) => (iso !== null && Date.parse(iso) > now.getTime() ? now.toISOString() : iso);

const readV2 = (data, now) => {
    if (!Array.isArray(data.categories) || !Array.isArray(data.tasks)) throw new BackupError('not-a-backup');
    const settings = data.settings === undefined ? null : data.settings;
    const invalid = data.categories.filter((c) => validateCategory(c).length > 0).length
        + data.tasks.filter((t) => taskErrors(t).length > 0).length
        + (settings !== null && validateSettings(settings).length > 0 ? 1 : 0)
        + sharedIds(data.categories) + sharedIds(data.tasks);
    if (invalid > 0) throw new BackupError('invalid-records', invalid);
    const tasks = data.tasks.map((t) => ({
        ...t,
        createdAt: notLater(t.createdAt, now),
        updatedAt: notLater(t.updatedAt, now),
        deletedAt: notLater(t.deletedAt, now),
    }));
    return { version: 2, settings, categories: data.categories, tasks };
};

const readV1 = (data, ctx) => {
    if (!Array.isArray(data.bubbles) || !Array.isArray(data.tags)) throw new BackupError('not-a-backup');
    const { categories, notes } = mapCategoriesV1(data.tags);
    const categoryIds = new Set(categories.map((c) => c.id));
    const tasks = data.bubbles.map((bubble) => mapTaskV1(bubble, { ...ctx, categoryIds }).task);
    const read = tasks.filter((t) => t !== null);
    const invalid = notes.filter((n) => n.code === 'invalid-record').length
        + (tasks.length - read.length) + sharedIds(read);
    if (invalid > 0) throw new BackupError('invalid-records', invalid);
    return { version: 1, settings: null, categories, tasks: read };
};

/**
 * Reads a parsed backup file. ctx = { now: Date, timeZone, language } (spec 9.2, for v1 files).
 * Returns { version: 1 | 2, settings: complete settings | null, categories, tasks } in backup form,
 * or throws BackupError.
 */
export const readBackup = (data, ctx) => {
    if (!isPlainObject(data)) throw new BackupError('not-a-backup');
    if (data.format === BACKUP_FORMAT) {
        if (data.version !== BACKUP_VERSION) throw new BackupError('unsupported-version');
        return readV2(data, ctx.now);
    }
    if (data.format !== undefined || data.version === undefined) throw new BackupError('not-a-backup');
    if (data.version !== 1) throw new BackupError('unsupported-version');
    return readV1(data, ctx);
};
