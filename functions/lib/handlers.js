/**
 * Firestore side of the v2 Cloud Functions (spec 4.4, 6). Every handler gets its dependencies
 * (`db`, `messaging`, `now` in epoch ms) as arguments, so the emulator tests run them directly.
 */
const { FieldValue, Timestamp } = require('firebase-admin/firestore');
const {
    planSchedulerRun, sameSchedule, dueInstantMs, reminderKey, overdueKey, notificationDocId,
} = require('./schedule');
const { INVALID_TOKEN_CODES, buildMessages, pickLanguage, pickRecipients } = require('./messages');

const MINUTE_MS = 60 * 1000;
// A notification nobody received (no recipients, every send failed) is retried by the next
// passes for this long after its moment, then dropped (issue #93).
const RETRY_WINDOW_MS = 10 * MINUTE_MS;

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

/** Claims a dedup key; false when another run already sent this notification. */
async function claimKey(db, key, now) {
    try {
        await db.collection('notification-sent').doc(notificationDocId(key)).create({ sentAt: Timestamp.fromMillis(now) });
        return true;
    } catch (e) {
        if (e && (e.code === 6 || String(e.code).toUpperCase().includes('ALREADY_EXISTS'))) return false;
        throw e;
    }
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
 * Sends a notification once (issue #93): true when at least one device got it or another run
 * already did. Without recipients nothing is claimed; when every send fails the key is freed,
 * so a later pass can retry.
 */
async function deliverOnce({ db, messaging, uid, recipients, key, message, now }) {
    if (recipients.length === 0) return false;
    if (!(await claimKey(db, key, now))) return true;
    try {
        if (await sendToRecipients({ db, messaging, uid, recipients, message }) > 0) return true;
    } catch (e) {
        console.error('scheduleNotifications: send failed', uid, message.taskId, e && e.code);
    }
    await db.collection('notification-sent').doc(notificationDocId(key)).delete();
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
        delivered = await deliverOnce({ db, messaging, uid, recipients, now,
            key: overdueKey(uid, snap.id, task.due), message: { ...message, type: 'overdue' } });
    } else if (plan.reminder !== null) {
        eventAt = due - plan.reminder * MINUTE_MS;
        delivered = await deliverOnce({ db, messaging, uid, recipients, now,
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

module.exports = {
    toPlainTask,
    processTask,
    runScheduler,
};
