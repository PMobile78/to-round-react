// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import taskFixtures from '../../contract/fixtures/tasks.json';
import categoryFixtures from '../../contract/fixtures/categories.json';
import settingsFixtures from '../../contract/fixtures/settings.json';
import migration from '../../contract/fixtures/migration-v1.json';
import { BACKUP_FORMAT, BACKUP_VERSION, buildBackup, readBackup } from './backup';

const NOW = new Date('2026-10-20T12:00:00.000Z');
const ctx = { now: NOW, timeZone: 'Europe/Berlin', language: 'en' };
const SETTINGS = settingsFixtures.valid[0].value;
const CATEGORIES = categoryFixtures.valid.map((c) => c.value);
const TASKS = taskFixtures.valid.map((t) => t.value);

const v2File = (overrides = {}) => ({
    ...buildBackup({ settings: SETTINGS, categories: CATEGORIES, tasks: TASKS }, NOW),
    ...overrides,
});

// What readBackup refuses the file with, or null when it reads it.
const refusal = (data) => {
    try {
        readBackup(data, ctx);
        return null;
    } catch (e) {
        return { name: e.name, code: e.code, count: e.count };
    }
};

describe('buildBackup: the v2 file (spec 10)', () => {
    it('holds the format, the version, the export time, the settings, the categories and the tasks', () => {
        expect(buildBackup({ settings: SETTINGS, categories: CATEGORIES, tasks: TASKS }, NOW)).toEqual({
            format: 'to-round-backup',
            version: 2,
            exportedAt: '2026-10-20T12:00:00.000Z',
            settings: SETTINGS,
            categories: CATEGORIES,
            tasks: TASKS,
        });
        expect([BACKUP_FORMAT, BACKUP_VERSION]).toEqual(['to-round-backup', 2]);
    });
});

describe('readBackup: a v2 file', () => {
    it('reads back what buildBackup wrote', () => {
        expect(readBackup(JSON.parse(JSON.stringify(v2File())), ctx)).toEqual({
            version: 2, settings: SETTINGS, categories: CATEGORIES, tasks: TASKS,
        });
    });

    it('leaves the settings out when the file has none', () => {
        const { settings, ...file } = v2File();
        expect(readBackup(file, ctx).settings).toBeNull();
    });

    it('refuses the whole file for one invalid record and counts the invalid ones', () => {
        const bad = taskFixtures.invalid.find((t) => t.name === 'reminder-not-whole-hours').value;
        expect(refusal(v2File({ tasks: [...TASKS, { ...bad, id: 'bad1' }] })))
            .toEqual({ name: 'BackupError', code: 'invalid-records', count: 1 });
        const badCategory = categoryFixtures.invalid[0].value;
        const badSettings = settingsFixtures.invalid[0].value;
        expect(refusal(v2File({ categories: [...CATEGORIES, { ...badCategory, id: 'bad2' }], settings: badSettings })))
            .toEqual({ name: 'BackupError', code: 'invalid-records', count: 2 });
    });

    it('refuses records that share an id', () => {
        expect(refusal(v2File({ tasks: [...TASKS, { ...TASKS[0], title: 'Copy' }] })))
            .toEqual({ name: 'BackupError', code: 'invalid-records', count: 1 });
    });

    it('keeps a due in a zone this browser does not know (a device with a newer time-zone database)', () => {
        const task = { ...TASKS[1], id: 'z1', due: { local: '2026-11-02T10:30', tz: 'Mars/Olympus' } };
        expect(readBackup(v2File({ tasks: [task] }), ctx).tasks).toEqual([task]);
    });

    it('moves times from the future to the moment of reading', () => {
        const task = { ...TASKS[5], id: 'f1', createdAt: '2027-01-01T00:00:00.000Z', updatedAt: '2027-01-02T00:00:00.000Z', deletedAt: '2027-01-03T00:00:00.000Z' };
        expect(readBackup(v2File({ tasks: [task] }), ctx).tasks).toEqual([{
            ...task, createdAt: NOW.toISOString(), updatedAt: NOW.toISOString(), deletedAt: NOW.toISOString(),
        }]);
    });
});

describe('readBackup: a v1 file goes through the migration rules (spec 9.2)', () => {
    const v1Ctx = { now: new Date(migration.context.now), timeZone: migration.context.timeZone, language: migration.context.language };
    const valid = migration.tasks.filter((t) => t.expected);
    const tags = migration.categories.v1.filter((tag) => tag.id);

    it('maps the tasks and the categories like the migration does, without settings', () => {
        const file = { version: 1, exportedAt: '2026-10-14T11:00:00.000Z', bubbles: valid.map((t) => t.v1), tags };
        expect(readBackup(file, v1Ctx)).toEqual({
            version: 1,
            settings: null,
            categories: migration.categories.expected,
            tasks: valid.map((t) => t.expected),
        });
    });

    it('refuses the file when a record cannot be read', () => {
        const file = { version: 1, bubbles: migration.tasks.map((t) => t.v1), tags };
        expect(refusal(file)).toEqual({ name: 'BackupError', code: 'invalid-records', count: 1 });
    });
});

describe('readBackup: not a backup', () => {
    it.each([null, [], 'text', {}, { bubbles: [], tags: {} }, { format: BACKUP_FORMAT, version: 2, tasks: [] }])(
        'refuses %j',
        (data) => expect(refusal(data)).toEqual({ name: 'BackupError', code: 'not-a-backup', count: 0 }),
    );

    it.each([{ format: BACKUP_FORMAT, version: 3, categories: [], tasks: [] }, { version: 7, bubbles: [], tags: [] }])(
        'refuses the unknown version of %j',
        (data) => expect(refusal(data)).toEqual({ name: 'BackupError', code: 'unsupported-version', count: 0 }),
    );
});
