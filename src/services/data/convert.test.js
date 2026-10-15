import { describe, expect, it } from 'vitest';
import { Timestamp, serverTimestamp } from 'firebase/firestore';
import taskFixtures from '../../../contract/fixtures/tasks.json';
import categoryFixtures from '../../../contract/fixtures/categories.json';
import settingsFixtures from '../../../contract/fixtures/settings.json';
import deviceFixtures from '../../../contract/fixtures/devices.json';
import { validateCategory, validateSettings, validateTask } from '../../contract/validate';
import {
    categoryFromDoc, categoryUpdateData, deviceFromDoc, deviceUpdateData, isoFromTimestamp, newCategoryData,
    newDeviceData, newTaskData, newUserDocData, restoredTaskData, settingsFromUserDoc, settingsUpdateData,
    taskFromDoc, taskUpdateData, timestampFromIso,
} from './convert';

const isServerTime = (value) => serverTimestamp().isEqual(value);
// Firestore keeps nanoseconds, a JS Date milliseconds: compare times as moments to the millisecond.
const sameMoment = (a, b) => (a === null || b === null ? a === b : Date.parse(a) === Date.parse(b));
const withoutTimes = ({ createdAt, updatedAt, deletedAt, ...rest }) => rest;

const TASK_FIELDS = {
    title: 'Pay bills',
    description: '- [ ] power',
    categoryId: 'c1',
    due: { local: '2026-10-15T09:00', tz: 'Europe/Kyiv' },
    reminders: [60],
    repeat: { every: 1, unit: 'months', monthDay: 15 },
    radius: 45,
};

describe('times', () => {
    it('turns an ISO string into a Timestamp and back', () => {
        const ts = timestampFromIso('2026-10-01T08:00:00.123Z');
        expect(ts).toBeInstanceOf(Timestamp);
        expect(isoFromTimestamp(ts)).toBe('2026-10-01T08:00:00.123Z');
        expect(isoFromTimestamp(null)).toBeNull();
    });

    it('rejects a time that is not ISO', () => {
        expect(() => timestampFromIso('yesterday')).toThrow('not an ISO time: yesterday');
    });
});

describe('tasks', () => {
    it.each(taskFixtures.valid)('reads back $name as the same backup-form record', ({ value }) => {
        const back = taskFromDoc(value.id, restoredTaskData(value));
        expect(validateTask(back)).toEqual([]);
        expect(withoutTimes(back)).toEqual(withoutTimes(value));
        ['createdAt', 'updatedAt', 'deletedAt'].forEach((key) => expect(sameMoment(back[key], value[key])).toBe(true));
    });

    it('writes a restored task as a v2 document with its original times', () => {
        const value = taskFixtures.valid.find((f) => f.name === 'deleted-with-deleted-at').value;
        const data = restoredTaskData(value);
        expect(data).toMatchObject({ schemaVersion: 2, overdueAt: null, status: 'deleted' });
        expect(data).not.toHaveProperty('id');
        expect(data).not.toHaveProperty('nextNotifyAt');
        expect(data.createdAt.toMillis()).toBe(Date.parse(value.createdAt));
        expect(data.deletedAt.toMillis()).toBe(Date.parse(value.deletedAt));
    });

    it('creates a new task as active, with server times and without server-owned schedule fields', () => {
        const data = newTaskData(TASK_FIELDS);
        expect(data).toMatchObject({
            ...TASK_FIELDS, schemaVersion: 2, status: 'active', pulseMuted: false, overdueAt: null, deletedAt: null,
        });
        expect(isServerTime(data.createdAt) && isServerTime(data.updatedAt)).toBe(true);
        expect(data).not.toHaveProperty('nextNotifyAt');
    });

    it('drops server-owned fields when reading a document', () => {
        const data = {
            ...restoredTaskData({ id: 't1', ...TASK_FIELDS, status: 'active', pulseMuted: false,
                createdAt: '2026-10-01T08:00:00.000Z', updatedAt: '2026-10-01T08:00:00.000Z', deletedAt: null }),
            overdueAt: Timestamp.fromMillis(0),
            nextNotifyAt: Timestamp.fromMillis(0),
        };
        expect(Object.keys(taskFromDoc('t1', data)).sort()).toEqual(['categoryId', 'createdAt', 'deletedAt', 'description',
            'due', 'id', 'pulseMuted', 'radius', 'reminders', 'repeat', 'status', 'title', 'updatedAt']);
    });

    it('stamps every update with the server time', () => {
        const data = taskUpdateData({ title: 'Renamed', deletedAt: null });
        expect(data).toMatchObject({ title: 'Renamed', deletedAt: null });
        expect(isServerTime(data.updatedAt)).toBe(true);
    });

    it.each(['overdueAt', 'nextNotifyAt', 'createdAt', 'updatedAt', 'schemaVersion', 'id'])(
        'refuses to update the field %s, which the client does not own',
        (key) => {
            expect(() => taskUpdateData({ [key]: null })).toThrow(`not a client field of a task: ${key}`);
        },
    );
});

describe('categories', () => {
    it.each(categoryFixtures.valid)('reads back $name', ({ value }) => {
        const back = categoryFromDoc(value.id, newCategoryData(value));
        expect(back).toEqual(value);
        expect(validateCategory(back)).toEqual([]);
    });

    it('creates a category with schemaVersion and server times', () => {
        const data = newCategoryData({ name: 'Home', color: '#da3833', order: 3 });
        expect(data).toMatchObject({ schemaVersion: 2, name: 'Home', color: '#da3833', order: 3 });
        expect(isServerTime(data.createdAt) && isServerTime(data.updatedAt)).toBe(true);
    });

    it('updates only name, colour and order, with the server time', () => {
        expect(isServerTime(categoryUpdateData({ order: 1.5 }).updatedAt)).toBe(true);
        expect(() => categoryUpdateData({ createdAt: null })).toThrow('not a client field of a category: createdAt');
    });
});

describe('settings', () => {
    it.each(settingsFixtures.valid)('reads $name from the user document', ({ value }) => {
        const settings = settingsFromUserDoc(newUserDocData(value), 'en');
        expect(settings).toEqual(value);
        expect(validateSettings(settings)).toEqual([]);
    });

    it('fills settings the document lacks with the defaults', () => {
        expect(settingsFromUserDoc({ settings: { themeMode: 'dark' } }, 'uk-UA'))
            .toMatchObject({ themeMode: 'dark', language: 'uk', design: 'classic', labelFontSize: 8 });
    });

    it('creates the user document with schemaVersion and server times', () => {
        const settings = settingsFixtures.valid[0].value;
        const data = newUserDocData(settings);
        expect(data).toMatchObject({ schemaVersion: 2, settings });
        expect(isServerTime(data.createdAt) && isServerTime(data.updatedAt)).toBe(true);
    });

    it('writes each changed setting as its own field, so devices do not overwrite each other', () => {
        const data = settingsUpdateData({ themeMode: 'dark', listSort: { by: 'title', order: 'asc' } });
        expect(Object.keys(data).sort()).toEqual(['settings.listSort', 'settings.themeMode', 'updatedAt']);
        expect(data['settings.listSort']).toEqual({ by: 'title', order: 'asc' });
        expect(isServerTime(data.updatedAt)).toBe(true);
        expect(() => settingsUpdateData({ fabPosition: 1 })).toThrow('not a setting: fabPosition');
    });
});

describe('devices', () => {
    it.each(deviceFixtures.valid)('reads back $name', ({ value }) => {
        const { createdAt, updatedAt, ...fields } = value;
        const data = { ...fields, createdAt: timestampFromIso(createdAt), updatedAt: timestampFromIso(updatedAt) };
        delete data.id;
        expect(deviceFromDoc(value.id, data)).toEqual(value);
    });

    it('registers a new web device with notifications on and server times', () => {
        const data = newDeviceData({ platform: 'web', fcmToken: null });
        expect(data).toMatchObject({ platform: 'web', fcmToken: null, notificationsEnabled: true });
        expect(isServerTime(data.createdAt) && isServerTime(data.updatedAt)).toBe(true);
    });

    it('updates only the token and the switch, with the server time', () => {
        expect(isServerTime(deviceUpdateData({ fcmToken: 'token' }).updatedAt)).toBe(true);
        expect(() => deviceUpdateData({ platform: 'android' })).toThrow('not a client field of a device: platform');
    });
});
