/**
 * Firestore side of the v2 Cloud Functions (spec 4.4, 6). Every handler gets its dependencies
 * (`db`, `messaging`, `now` in epoch ms) as arguments, so the emulator tests run them directly.
 */
const { FieldValue, Timestamp } = require('firebase-admin/firestore');
const {
    planSchedulerRun, planTaskWrite, sameSchedule, dueInstantMs, reminderKey, overdueKey, notificationDocId,
} = require('./schedule');
const { INVALID_TOKEN_CODES, buildMessages, pickLanguage, pickRecipients } = require('./messages');

const BATCH_LIMIT = 450;
const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;
const TRASH_DAYS = 30;
const SENT_KEEP_DAYS = 7;
// A notification nobody received (no recipients, every send failed) is retried by the next
// passes for this long after its moment, then dropped (issue #93).
const RETRY_WINDOW_MS = 10 * MINUTE_MS;
// A key still 'pending' after this long was left by a pass that died mid-send (a pass runs at
// most 60 s, timeoutSeconds in index.js): the next pass takes it over and sends again.
const STALE_CLAIM_MS = 2 * MINUTE_MS;

const msOf = (value) => (value && typeof value.toMillis === 'function' ? value.toMillis() : null);

/** Firestore task data -> plain task for schedule.js (Timestamps as epoch ms). */
function toPlainTask(data) {
    return {
        status: data.status,
        due: data.due === undefined ? null : data.due,
        reminders: Array.isArray(data.reminders) ? data.reminders : [],
        repeat: data.repeat === undefined ? null : data.repeat,
        title: typeof data.title === 'string' ? data.title : '',
        pulseMuted: data.pulseMuted === true,
        overdueAt: msOf(data.overdueAt),
        nextNotifyAt: msOf(data.nextNotifyAt),
    };
}

// Only the root path users/{uid}/tasks/{taskId}: a collection group query also sees any other
// "tasks" collection, including user-mindmaps/{other}/users/{uid}/tasks/... written by another user.
const USER_TASK_PATH = /^users\/[^/]+\/tasks\/[^/]+$/;
const isUserTaskRef = (ref) => USER_TASK_PATH.test(ref.path);

// overdueAt is never deleted, only set to null: the rules compare it on every client update.
const serverMs = (ms) => (ms === null ? FieldValue.delete() : Timestamp.fromMillis(ms));

async function deleteInBatches(db, refs) {
    for (let i = 0; i < refs.length; i += BATCH_LIMIT) {
        const batch = db.batch();
        refs.slice(i, i + BATCH_LIMIT).forEach((ref) => batch.delete(ref));
        await batch.commit();
    }
}

/**
 * Claims a dedup key: 'claimed' — this pass sends; 'sent' — delivered before; 'busy' — another
 * pass holds the claim and has not delivered yet (its send may still fail and free the key).
 * A claim left pending for STALE_CLAIM_MS is taken over while a retry is allowed (`mayTakeOver`):
 * if its dead pass did reach a device, the notification comes twice, which is better than not at all.
 */
async function claimKey(db, ref, now, mayTakeOver) {
    try {
        await ref.create({ sentAt: Timestamp.fromMillis(now), state: 'pending' });
        return 'claimed';
    } catch (e) {
        if (!(e && (e.code === 6 || String(e.code).toUpperCase().includes('ALREADY_EXISTS')))) throw e;
    }
    return db.runTransaction(async (tx) => {
        const existing = await tx.get(ref);
        // A key that vanished meanwhile was freed by a failed send; a key without a state counts as sent.
        if (!existing.exists) return 'busy';
        if (existing.get('state') !== 'pending') return 'sent';
        if (!mayTakeOver || now - msOf(existing.get('sentAt')) < STALE_CLAIM_MS) return 'busy';
        tx.update(ref, { sentAt: Timestamp.fromMillis(now) });
        return 'claimed';
    });
}

// A dead token is cleared only if the device still has it: it may have registered a new one meanwhile.
async function clearDeadToken(db, uid, deviceId, token) {
    const ref = db.doc(`users/${uid}/devices/${deviceId}`);
    await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (snap.exists && snap.get('fcmToken') === token) tx.update(ref, { fcmToken: null });
    });
}

/** Sends one notification to the user's devices; returns how many devices got it. */
async function sendToRecipients({ db, messaging, uid, recipients, message }) {
    const messages = buildMessages({ ...message, tokens: recipients.map((r) => r.token) });
    const result = await messaging.sendEach(messages);
    await Promise.all(result.responses.map((response, i) => {
        if (response.success || !INVALID_TOKEN_CODES.has(response.error && response.error.code)) return null;
        return clearDeadToken(db, uid, recipients[i].id, recipients[i].token).catch(() => null);
    }));
    return result.successCount;
}

/**
 * Sends a notification once (issue #93): true when at least one device got it, now or in an
 * earlier pass. Without recipients nothing is claimed; when every send fails the key is freed,
 * and while another pass holds the claim this one does not count it as delivered: either way a
 * later pass can retry. A stale claim is taken over only within the retry window of the event.
 */
async function deliverOnce({ db, messaging, uid, recipients, key, message, now, eventAt }) {
    if (recipients.length === 0) return false;
    const ref = db.collection('notification-sent').doc(notificationDocId(key));
    const claim = await claimKey(db, ref, now, now - eventAt < RETRY_WINDOW_MS);
    if (claim !== 'claimed') return claim === 'sent';
    let delivered = 0;
    try {
        delivered = await sendToRecipients({ db, messaging, uid, recipients, message });
    } catch (e) {
        console.error('scheduleNotifications: send failed', uid, message.taskId, e && e.code);
    }
    if (delivered > 0) {
        // If this write fails, the pending key still keeps other passes from sending it again.
        await ref.update({ state: 'sent' }).catch(() => null);
        return true;
    }
    await ref.delete();
    return false;
}

/** One scheduler pass over one due task (spec 4.4). */
async function processTask({ db, messaging, uid, snap, lang, recipients, now }) {
    const task = toPlainTask(snap.data());
    const plan = planSchedulerRun(task, now);
    const message = { taskId: snap.id, taskTitle: task.title, lang };
    const due = dueInstantMs(task);
    let eventAt = null;
    let delivered = true;
    if (plan.overdue) {
        eventAt = due;
        delivered = await deliverOnce({ db, messaging, uid, recipients, now, eventAt,
            key: overdueKey(uid, snap.id, task.due), message: { ...message, type: 'overdue' } });
    } else if (plan.reminder !== null) {
        eventAt = due - plan.reminder * MINUTE_MS;
        delivered = await deliverOnce({ db, messaging, uid, recipients, now, eventAt,
            key: reminderKey(uid, snap.id, plan.reminder, task.due), message: { ...message, type: 'reminder', minutes: plan.reminder } });
    }
    // Not delivered yet: nextNotifyAt stays, so the next passes retry within the window.
    if (!delivered && now - eventAt < RETRY_WINDOW_MS) return;
    // Server fields are written only if the task still has the schedule this pass worked from.
    await db.runTransaction(async (tx) => {
        const fresh = await tx.get(snap.ref);
        if (!fresh.exists) return;
        const current = toPlainTask(fresh.data());
        if (!sameSchedule(current, task) || current.nextNotifyAt !== task.nextNotifyAt) return;
        const updates = { nextNotifyAt: serverMs(plan.nextNotifyAt) };
        if (plan.overdue && current.overdueAt === null) updates.overdueAt = Timestamp.fromMillis(now);
        tx.update(snap.ref, updates);
    });
}

/** scheduleNotifications: every active task with nextNotifyAt <= now, grouped by user. */
async function runScheduler({ db, messaging, now }) {
    const snap = await db.collectionGroup('tasks')
        .where('status', '==', 'active')
        .where('nextNotifyAt', '<=', Timestamp.fromMillis(now))
        .orderBy('nextNotifyAt')
        .get();
    const byUser = new Map();
    for (const doc of snap.docs) {
        if (!isUserTaskRef(doc.ref)) continue;
        const uid = doc.ref.parent.parent.id;
        if (!byUser.has(uid)) byUser.set(uid, []);
        byUser.get(uid).push(doc);
    }
    await Promise.all([...byUser].map(async ([uid, docs]) => {
        try {
            const [userSnap, devicesSnap] = await Promise.all([
                db.doc(`users/${uid}`).get(),
                db.collection(`users/${uid}/devices`).get(),
            ]);
            const lang = pickLanguage(userSnap.exists ? userSnap.get('settings') : null);
            const recipients = pickRecipients(devicesSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
            for (const doc of docs) {
                try {
                    await processTask({ db, messaging, uid, snap: doc, lang, recipients, now });
                } catch (e) {
                    console.error('scheduleNotifications: task failed', uid, doc.id, e);
                }
            }
        } catch (e) {
            console.error('scheduleNotifications: user failed', uid, e);
        }
    }));
    return { tasks: [...byUser.values()].reduce((n, docs) => n + docs.length, 0) };
}

/**
 * onTaskWritten: keeps nextNotifyAt, overdueAt and pulseMuted in step with the schedule (spec 6).
 * Returns the applied plan or null.
 */
async function handleTaskWritten({ db, ref, before, after, now }) {
    if (!after) return null;
    const beforeTask = before ? toPlainTask(before) : null;
    if (beforeTask && sameSchedule(beforeTask, toPlainTask(after))) return null;
    let applied = null;
    await db.runTransaction(async (tx) => {
        const fresh = await tx.get(ref);
        if (!fresh.exists) return;
        // Planned against the current document, not the event's after-state: when a later write
        // landed first, this event's due change (pulse, overdue mark) is still applied.
        const plan = planTaskWrite(beforeTask, toPlainTask(fresh.data()), now);
        if (!plan || Object.keys(plan).length === 0) return;
        const updates = {};
        if ('nextNotifyAt' in plan) updates.nextNotifyAt = serverMs(plan.nextNotifyAt);
        if ('overdueAt' in plan) updates.overdueAt = plan.overdueAt === null ? null : Timestamp.fromMillis(plan.overdueAt);
        if ('pulseMuted' in plan) updates.pulseMuted = plan.pulseMuted;
        tx.update(ref, updates);
        applied = plan;
    });
    return applied;
}

/** onCategoryDeleted: tasks of the deleted category become uncategorized. */
async function clearDeletedCategory({ db, uid, categoryId }) {
    // A category created again with the same id (backup restored right after the delete) keeps its tasks.
    if ((await db.doc(`users/${uid}/categories/${categoryId}`).get()).exists) return 0;
    const snap = await db.collection(`users/${uid}/tasks`).where('categoryId', '==', categoryId).get();
    const writer = db.bulkWriter();
    writer.onWriteError(() => false); // a task deleted meanwhile fails alone, the rest still go through
    snap.docs.forEach((d) => writer.update(d.ref, { categoryId: null }).catch(() => null));
    await writer.close();
    return snap.size;
}

/** purgeDeletedTasks: removes tasks that have been in the trash for more than 30 days. */
async function purgeDeletedTasks({ db, now }) {
    const snap = await db.collectionGroup('tasks')
        .where('status', '==', 'deleted')
        .where('deletedAt', '<=', Timestamp.fromMillis(now - TRASH_DAYS * DAY_MS))
        .get();
    const refs = snap.docs.map((d) => d.ref).filter(isUserTaskRef);
    await deleteInBatches(db, refs);
    return refs.length;
}

/** cleanupNotificationSent: drops dedup keys older than 7 days. */
async function cleanupNotificationSent({ db, now }) {
    const snap = await db.collection('notification-sent')
        .where('sentAt', '<=', Timestamp.fromMillis(now - SENT_KEEP_DAYS * DAY_MS))
        .get();
    await deleteInBatches(db, snap.docs.map((d) => d.ref));
    return snap.size;
}

module.exports = {
    STALE_CLAIM_MS,
    toPlainTask,
    processTask,
    runScheduler,
    handleTaskWritten,
    clearDeletedCategory,
    purgeDeletedTasks,
    cleanupNotificationSent,
};
