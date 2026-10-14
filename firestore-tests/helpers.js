/**
 * Shared setup for the Firestore security rules tests (run under the emulator by `npm run test:rules`).
 * Contract fixtures are in backup form (ISO strings, id as a field); these helpers turn them into
 * the Firestore form the rules see (Timestamps, schemaVersion, server-owned fields).
 */
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { Timestamp, doc, setDoc } from 'firebase/firestore';

export const OWNER = 'alice';
export const OTHER = 'bob';

/** A fixed time in the past: creates may carry historical times, never future ones. */
export const PAST = Timestamp.fromDate(new Date('2026-01-01T00:00:00.000Z'));

export const setupRulesEnv = () => initializeTestEnvironment({
    projectId: 'demo-to-round',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
});

/** ISO string -> Timestamp; anything else is left as is so the rules can reject it. */
export const toTimestamp = (value) => {
    if (typeof value !== 'string') return value;
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? Timestamp.fromMillis(ms) : value;
};

/** Backup-form task -> [id, Firestore document as a client creates it]. */
export const taskFromFixture = ({ id, createdAt, updatedAt, deletedAt, ...rest }) => [id, {
    ...rest,
    schemaVersion: 2,
    overdueAt: null,
    createdAt: toTimestamp(createdAt),
    updatedAt: toTimestamp(updatedAt),
    deletedAt: toTimestamp(deletedAt),
}];

/** Backup-form category -> [id, Firestore document]. */
export const categoryFromFixture = ({ id, ...rest }) => [id, {
    ...rest,
    schemaVersion: 2,
    createdAt: PAST,
    updatedAt: PAST,
}];

/** Device fixture -> [id, Firestore document]. */
export const deviceFromFixture = ({ id, createdAt, updatedAt, ...rest }) => [id, {
    ...rest,
    createdAt: toTimestamp(createdAt),
    updatedAt: toTimestamp(updatedAt),
}];

/** Settings object -> users/{uid} document. */
export const userDocWith = (settings) => ({
    schemaVersion: 2,
    settings,
    createdAt: PAST,
    updatedAt: PAST,
});

/** A valid active task without a due date, in Firestore form. */
export const baseTask = (overrides = {}) => ({
    schemaVersion: 2,
    title: 'Buy milk',
    description: '',
    categoryId: null,
    status: 'active',
    due: null,
    reminders: [],
    repeat: null,
    radius: 45,
    pulseMuted: false,
    overdueAt: null,
    createdAt: PAST,
    updatedAt: PAST,
    deletedAt: null,
    ...overrides,
});

/** Writes a document with the rules switched off (test setup). */
export const seed = (env, path, data) => env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), path), data));
