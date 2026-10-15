/**
 * Notification schedule of a v2 task (spec 4.4, 6). Pure functions over "plain" tasks:
 * the Firestore task fields with Timestamps already turned into epoch milliseconds
 * (`overdueAt`, `nextNotifyAt`: number | null).
 */
const { isValidTimeZone, parseLocal, toInstant } = require('./time');

const MINUTE_MS = 60 * 1000;
const REMINDER_MIN = 60;
const REMINDER_MAX = 524160; // 52 weeks
const SCHEDULE_FIELDS = ['due', 'reminders', 'repeat', 'status'];

/** Valid reminder offsets (whole hours, 1 hour .. 52 weeks), unique, ascending. Others are skipped (spec 7). */
function validReminders(reminders) {
    if (!Array.isArray(reminders)) return [];
    const ok = reminders.filter((m) => Number.isInteger(m) && m >= REMINDER_MIN && m <= REMINDER_MAX && m % 60 === 0);
    return [...new Set(ok)].sort((a, b) => a - b);
}

/** Epoch ms of the task's due moment, or null without a usable `due`. */
function dueInstantMs(task) {
    const due = task && task.due;
    if (!due || !parseLocal(due.local) || !isValidTimeZone(due.tz)) return null;
    return toInstant(due.local, due.tz).getTime();
}

/** Notification events of an active task, ascending by time: reminders D - m and the overdue moment D. */
function taskEvents(task) {
    if (!task || task.status !== 'active') return [];
    const due = dueInstantMs(task);
    if (due === null) return [];
    const events = validReminders(task.reminders).map((minutes) => ({ type: 'reminder', at: due - minutes * MINUTE_MS, minutes }));
    events.push({ type: 'overdue', at: due });
    return events.sort((a, b) => a.at - b.at);
}

/** Time of the first event strictly after `afterMs`, or null when there is none. */
function nextEventAfter(task, afterMs) {
    const next = taskEvents(task).find((e) => e.at > afterMs);
    return next ? next.at : null;
}

// JSON with sorted keys, so equal maps compare equal whatever their key order.
function canonical(value) {
    if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
    if (value && typeof value === 'object') {
        return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
    }
    return JSON.stringify(value === undefined ? null : value);
}

/** True when both tasks have the same due, reminders, repeat and status. */
function sameSchedule(a, b) {
    return SCHEDULE_FIELDS.every((f) => canonical(a[f]) === canonical(b[f]));
}

/**
 * Server fields to write after a client write (onTaskWritten, spec 6), or null when the
 * schedule did not change (create counts as a change). Values: `nextNotifyAt` ms or null
 * (= delete the field), `overdueAt` ms or null, `pulseMuted` false. Unchanged fields are omitted.
 */
function planTaskWrite(before, after, nowMs) {
    if (!after || (before && sameSchedule(before, after))) return null;
    const updates = {};
    const due = dueInstantMs(after);
    const dueChanged = before !== null && canonical(before.due) !== canonical(after.due);
    let overdueAt = after.overdueAt;
    if (dueChanged && after.pulseMuted) updates.pulseMuted = false;
    if (dueChanged && (due === null || due > nowMs) && overdueAt !== null) {
        overdueAt = null;
        updates.overdueAt = null;
    }
    if (after.status === 'active' && due !== null && due <= nowMs && overdueAt === null) updates.overdueAt = nowMs;
    const next = nextEventAfter(after, nowMs);
    if (next !== after.nextNotifyAt) updates.nextNotifyAt = next;
    return updates;
}

/**
 * What one scheduler pass does with a task whose nextNotifyAt <= now (spec 4.4): events in
 * [nextNotifyAt, now] count; the latest reminder is sent only while the due moment is still
 * ahead; overdue is sent when the due moment is in the window and overdueAt is not set yet.
 */
function planSchedulerRun(task, nowMs) {
    const from = task.nextNotifyAt === null ? nowMs : task.nextNotifyAt;
    const due = dueInstantMs(task);
    const inWindow = taskEvents(task).filter((e) => e.at >= from && e.at <= nowMs);
    const reminders = due !== null && due > nowMs ? inWindow.filter((e) => e.type === 'reminder') : [];
    return {
        reminder: reminders.length > 0 ? reminders[reminders.length - 1].minutes : null,
        overdue: task.overdueAt === null && inWindow.some((e) => e.type === 'overdue'),
        nextNotifyAt: nextEventAfter(task, nowMs),
    };
}

const dueKey = (due) => `${due.local}@${due.tz}`;

/** Dedup keys of spec 6. */
const reminderKey = (uid, taskId, minutes, due) => `reminder:${uid}:${taskId}:${minutes}:${dueKey(due)}`;
const overdueKey = (uid, taskId, due) => `overdue:${uid}:${taskId}:${dueKey(due)}`;

/** Firestore id of a dedup key: "/" (from the zone name) is not allowed in document ids. */
const notificationDocId = (key) => key.replace(/\//g, '%2F');

module.exports = {
    REMINDER_MIN,
    REMINDER_MAX,
    validReminders,
    dueInstantMs,
    taskEvents,
    nextEventAfter,
    sameSchedule,
    planTaskWrite,
    planSchedulerRun,
    reminderKey,
    overdueKey,
    notificationDocId,
};
