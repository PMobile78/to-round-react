/**
 * Firestore documents <-> backup-form records of data contract v2.
 * Backup form (spec section 10): the id is a field, times are ISO strings, no schemaVersion and
 * no server-owned fields (overdueAt, nextNotifyAt). Writes follow spec section 3: a new document
 * gets createdAt/updatedAt = serverTimestamp(), a restored one (migration and import, sub-plan 0.6)
 * keeps its original times, and every update is partial and stamps updatedAt with the server time.
 */
import { Timestamp, serverTimestamp } from 'firebase/firestore';
import { SCHEMA_VERSION, SETTINGS_KEYS, createDefaultSettings } from '../../contract/schema';

const TASK_CLIENT_FIELDS = ['title', 'description', 'categoryId', 'status', 'due', 'reminders', 'repeat',
    'radius', 'pulseMuted', 'deletedAt'];
const CATEGORY_CLIENT_FIELDS = ['name', 'color', 'order'];
const DEVICE_CLIENT_FIELDS = ['fcmToken', 'notificationsEnabled'];

/** Firestore Timestamp (or null) -> ISO string (or null), to the millisecond. */
export const isoFromTimestamp = (value) => (value === null || value === undefined ? null : value.toDate().toISOString());

/** ISO string -> Firestore Timestamp. */
export const timestampFromIso = (iso) => {
    const ms = Date.parse(iso);
    if (!Number.isFinite(ms)) throw new Error(`not an ISO time: ${iso}`);
    return Timestamp.fromMillis(ms);
};

const assertFields = (changes, allowed, kind) => {
    Object.keys(changes).forEach((key) => {
        if (!allowed.includes(key)) throw new Error(`not a client field of a ${kind}: ${key}`);
    });
};

// ---------- tasks: users/{uid}/tasks/{taskId} ----------

/** Task document -> backup-form task. Read with { serverTimestamps: 'estimate' } so pending times are set. */
export const taskFromDoc = (id, data) => ({
    id,
    title: data.title,
    description: data.description,
    categoryId: data.categoryId,
    status: data.status,
    due: data.due,
    reminders: data.reminders,
    repeat: data.repeat,
    radius: data.radius,
    pulseMuted: data.pulseMuted,
    createdAt: isoFromTimestamp(data.createdAt),
    updatedAt: isoFromTimestamp(data.updatedAt),
    deletedAt: isoFromTimestamp(data.deletedAt),
});

/** A task the user creates now (spec 4.1). fields = { title, description, categoryId, due, reminders, repeat, radius }. */
export const newTaskData = ({ title, description, categoryId, due, reminders, repeat, radius }) => ({
    schemaVersion: SCHEMA_VERSION,
    title,
    description,
    categoryId,
    status: 'active',
    due,
    reminders,
    repeat,
    radius,
    pulseMuted: false,
    overdueAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    deletedAt: null,
});

/** A backup-form task written back with its original times (migration and import). */
export const restoredTaskData = ({ id, createdAt, updatedAt, deletedAt, ...fields }) => ({
    schemaVersion: SCHEMA_VERSION,
    ...fields,
    overdueAt: null,
    createdAt: timestampFromIso(createdAt),
    updatedAt: timestampFromIso(updatedAt),
    deletedAt: deletedAt === null ? null : timestampFromIso(deletedAt),
});

/** Partial task update: only client fields, always with the server updatedAt. */
export const taskUpdateData = (changes) => {
    assertFields(changes, TASK_CLIENT_FIELDS, 'task');
    return { ...changes, updatedAt: serverTimestamp() };
};

// ---------- categories: users/{uid}/categories/{categoryId} ----------

export const categoryFromDoc = (id, data) => ({ id, name: data.name, color: data.color, order: data.order });

export const newCategoryData = ({ name, color, order }) => ({
    schemaVersion: SCHEMA_VERSION,
    name,
    color,
    order,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
});

export const categoryUpdateData = (changes) => {
    assertFields(changes, CATEGORY_CLIENT_FIELDS, 'category');
    return { ...changes, updatedAt: serverTimestamp() };
};

// ---------- settings: users/{uid}.settings ----------

/** User document -> complete settings; a missing field gets its default (spec 3.5). */
export const settingsFromUserDoc = (data, deviceLanguage) => ({
    ...createDefaultSettings(deviceLanguage),
    ...(data && data.settings),
});

export const newUserDocData = (settings) => ({
    schemaVersion: SCHEMA_VERSION,
    settings,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
});

/** Each changed setting is written as its own field path, so two devices do not overwrite each other. */
export const settingsUpdateData = (changes) => {
    const data = { updatedAt: serverTimestamp() };
    Object.keys(changes).forEach((key) => {
        if (!SETTINGS_KEYS.includes(key)) throw new Error(`not a setting: ${key}`);
        data[`settings.${key}`] = changes[key];
    });
    return data;
};

// ---------- devices: users/{uid}/devices/{deviceId} ----------

export const deviceFromDoc = (id, data) => ({
    id,
    platform: data.platform,
    fcmToken: data.fcmToken,
    notificationsEnabled: data.notificationsEnabled,
    createdAt: isoFromTimestamp(data.createdAt),
    updatedAt: isoFromTimestamp(data.updatedAt),
});

/** A device registering for the first time: notifications on (spec 3.3). */
export const newDeviceData = ({ platform, fcmToken }) => ({
    platform,
    fcmToken,
    notificationsEnabled: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
});

export const deviceUpdateData = (changes) => {
    assertFields(changes, DEVICE_CLIENT_FIELDS, 'device');
    return { ...changes, updatedAt: serverTimestamp() };
};
