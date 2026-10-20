/**
 * Interim bridge until sub-plan 0.5 brings the v2 editors: a v2 task <-> the bubble the app shows.
 * The canvas and the list read tagId and dueAt (the moment of the due); the current dialogs read
 * the old fields (dueDate, notifications, recurrence, …).
 * The old editors still offer minutes. Their values are written by the migration rules
 * (spec 9.2: minutes round up to whole hours); the description is the Markdown of the editor.
 * The bubble keeps every v2 field next to the old names; 0.5 drops the old names.
 */
import { deviceTimeZone, isValidTimeZone, toInstant, toLocal } from '../../contract/time';
import { remindersFromV1, repeatFromV1 } from '../../contract/migrateV1';

const HOUR = 60;
const DAY = 1440;
const WEEK = 10080;

const reminderForEditor = (minutes) => {
    if (minutes === HOUR) return '1h';
    if (minutes === DAY) return '1d';
    if (minutes % WEEK === 0) return { type: 'custom', value: minutes / WEEK, unit: 'weeks' };
    if (minutes % DAY === 0) return { type: 'custom', value: minutes / DAY, unit: 'days' };
    return { type: 'custom', value: minutes / HOUR, unit: 'hours' };
};

// The old repeat editor knows weekdays as 0 = Sunday … 6 = Saturday and has no month day.
const recurrenceForEditor = (repeat) => {
    if (!repeat) return null;
    const recurrence = { every: repeat.every, unit: repeat.unit };
    if (repeat.weekdays) recurrence.weekDays = repeat.weekdays.map((day) => day % 7);
    return recurrence;
};

// Device-local "YYYY-MM-DDTHH:mm:ss", the string parseLocalDateTime and the list read (spec 4.2:
// shown in the time of this device). A zone this browser does not know shows the time as written.
const dueDateForEditor = (due, timeZone) => {
    if (!due) return null;
    try {
        return `${toLocal(toInstant(due.local, due.tz), timeZone)}:00`;
    } catch {
        return `${due.local}:00`;
    }
};

// The moment of the due in ms (spec 4.2). A zone this browser does not know reads the time as
// written in the zone of this device; a date that does not exist gives no moment.
const dueAtOf = (due, timeZone) => {
    if (!due) return null;
    try {
        return toInstant(due.local, isValidTimeZone(due.tz) ? due.tz : timeZone).getTime();
    } catch {
        return null;
    }
};

/** v2 task (or bubble) -> bubble fields; the Matter body, if any, is kept. */
export const bubbleFromTask = (task, timeZone = deviceTimeZone()) => ({
    ...task,
    tagId: task.categoryId,
    dueAt: dueAtOf(task.due, timeZone),
    dueDate: dueDateForEditor(task.due, timeZone),
    notifications: task.reminders.map(reminderForEditor),
    recurrence: recurrenceForEditor(task.repeat),
    overduePulseSuppressed: task.pulseMuted,
});

/** A bubble after a local write: v2 fields with the changes, old names recomputed, body kept. */
export const withTaskChanges = (bubble, changes, timeZone = deviceTimeZone()) => bubbleFromTask({ ...bubble, ...changes }, timeZone);

const dueFromForm = (dueDate, timeZone) => (dueDate ? { local: toLocal(dueDate, timeZone), tz: timeZone } : null);

/**
 * The create dialog -> fields for createTask (spec 4.2: the due is written in the zone of this
 * device). form = { title, description (Markdown), tagId, radius, dueDate: Date | null,
 * notifications, recurrence } in the old editors' shapes.
 */
export const taskFieldsFromForm = (form, timeZone = deviceTimeZone()) => {
    const due = dueFromForm(form.dueDate, timeZone);
    return {
        title: form.title,
        description: form.description,
        categoryId: form.tagId || null,
        due,
        reminders: due ? remindersFromV1(form.notifications) : [],
        repeat: repeatFromV1(form.recurrence, due),
        radius: form.radius,
    };
};

const isEqual = (a, b) => {
    if (a === b) return true;
    if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    const keys = Object.keys(a);
    return keys.length === Object.keys(b).length && keys.every((key) => isEqual(a[key], b[key]));
};

const sameMinute = (due, date) => {
    try {
        return Math.floor(toInstant(due.local, due.tz).getTime() / 60000) === Math.floor(date.getTime() / 60000);
    } catch {
        return false;
    }
};

/**
 * The edit dialog -> partial changes for updateTask: only the fields the user changed (spec 3).
 * An unchanged moment keeps the due and its zone even on a device in another zone; a changed due
 * takes the zone of this device and the month day of the new due (spec 4.2), and lets a muted
 * task pulse again.
 */
export const taskChangesFromForm = (task, form, timeZone = deviceTimeZone()) => {
    const formDue = dueFromForm(form.dueDate, timeZone);
    const dueChanged = task.due === null ? formDue !== null : formDue === null || !sameMinute(task.due, form.dueDate);
    const due = dueChanged ? formDue : task.due;
    let repeat = repeatFromV1(form.recurrence, due);
    if (!dueChanged && repeat && repeat.unit === 'months' && task.repeat && task.repeat.unit === 'months') {
        // "Done" may have moved a day-31 task to the 28th: without a due change the month day stays.
        repeat = { ...repeat, monthDay: task.repeat.monthDay };
    }
    const next = {
        title: form.title,
        description: form.description,
        categoryId: form.tagId || null,
        due,
        reminders: due ? remindersFromV1(form.notifications) : [],
        repeat,
        radius: form.radius,
    };
    const changes = {};
    Object.keys(next).forEach((key) => {
        if (!isEqual(next[key], task[key])) changes[key] = next[key];
    });
    if (dueChanged && task.pulseMuted) changes.pulseMuted = false;
    return changes;
};
