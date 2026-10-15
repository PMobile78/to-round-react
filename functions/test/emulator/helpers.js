/**
 * Shared setup for the functions tests on the Firestore emulator (`npm run test:emulator`,
 * started by `firebase emulators:exec`, which sets FIRESTORE_EMULATOR_HOST).
 */
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');

const PROJECT_ID = 'demo-to-round';
const app = initializeApp({ projectId: PROJECT_ID }, 'emulator-tests');
const db = getFirestore(app);

/** Removes every document from the emulator database. */
async function clearFirestore() {
    const host = process.env.FIRESTORE_EMULATOR_HOST;
    if (!host) throw new Error('FIRESTORE_EMULATOR_HOST is not set: run through npm run test:emulator');
    const res = await fetch(`http://${host}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`clearFirestore: HTTP ${res.status}`);
}

/**
 * Stand-in for firebase-admin messaging: records messages, fails the tokens listed in failTokens.
 * `onSend` runs before the answer comes back, to change Firestore while a send is in flight.
 */
function fakeMessaging(failTokens = {}, onSend = null) {
    const sent = [];
    return {
        sent,
        async sendEach(messages) {
            if (onSend) await onSend(messages);
            const responses = messages.map((m) => {
                sent.push(m);
                const code = failTokens[m.token];
                return code ? { success: false, error: { code } } : { success: true, messageId: `m${sent.length}` };
            });
            const successCount = responses.filter((r) => r.success).length;
            return { responses, successCount, failureCount: responses.length - successCount };
        },
    };
}

const at = (iso) => Date.parse(iso);
const ts = (iso) => Timestamp.fromMillis(Date.parse(iso));

// Due 2026-10-15 12:00 in Berlin (CEST, UTC+2) = 10:00Z.
const DUE = '2026-10-15T10:00:00.000Z';

/** A v2 task in Firestore form. */
const task = (overrides = {}) => ({
    schemaVersion: 2,
    title: 'Buy milk',
    description: '',
    categoryId: null,
    status: 'active',
    due: { local: '2026-10-15T12:00', tz: 'Europe/Berlin' },
    reminders: [60, 1440],
    repeat: null,
    radius: 45,
    pulseMuted: false,
    overdueAt: null,
    createdAt: ts('2026-10-01T08:00:00.000Z'),
    updatedAt: ts('2026-10-01T08:00:00.000Z'),
    deletedAt: null,
    ...overrides,
});

/** users/alice with Ukrainian notifications and three devices: only "phone" should get messages. */
async function seedAlice() {
    await db.doc('users/alice').set({ schemaVersion: 2, settings: { language: 'uk' } });
    await db.doc('users/alice/devices/phone').set({ platform: 'android', fcmToken: 'tok-phone', notificationsEnabled: true });
    await db.doc('users/alice/devices/laptop').set({ platform: 'web', fcmToken: 'tok-laptop', notificationsEnabled: false });
    await db.doc('users/alice/devices/tablet').set({ platform: 'web', fcmToken: null, notificationsEnabled: true });
}

module.exports = { db, clearFirestore, fakeMessaging, at, ts, DUE, task, seedAlice };
