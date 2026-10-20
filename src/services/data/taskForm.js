/**
 * The task dialogs' values -> the fields of a new task and the changes of an edited one (data
 * contract v2, spec 3.1 and 4.2). form = { title, description (Markdown), categoryId ('' or null
 * for none), radius, due: Date | null (the date picker), reminders: minutes before the due,
 * repeat: { every, unit, weekdays? } | null (the repeat editor) }. The rules cannot check the
 * reminders one by one (spec 7), so they are put in the stored shape here.
 */
import { LIMITS } from '../../contract/schema';
import { deviceTimeZone, parseLocal, toLocal } from '../../contract/time';

const MINUTE_MS = 60 * 1000;

/** What the date picker shows for a bubble: the moment of its due, or null. */
export const dueForPicker = (bubble) => (bubble.dueAt === null ? null : new Date(bubble.dueAt));

const dueFromPicker = (date, timeZone) => (date ? { local: toLocal(date, timeZone), tz: timeZone } : null);

// Whole hours from 1 hour to 52 weeks, without repeats, ascending, at most 10.
const storedReminders = (reminders) => [...new Set(reminders)]
    .filter((m) => Number.isInteger(m) && m >= LIMITS.reminderStepMinutes && m <= LIMITS.reminderMaxMinutes
        && m % LIMITS.reminderStepMinutes === 0)
    .sort((a, b) => a - b)
    .slice(0, LIMITS.maxReminders);

// every 1–999; ISO weekdays only for weeks; monthDay for months: the one given (the task's, kept
// while its due stays) or the day of the due (spec 4.2: a new due or a newly monthly repeat).
const storedRepeat = (repeat, due, monthDay) => {
    if (!repeat || !due) return null;
    const stored = {
        every: Math.min(LIMITS.repeatEveryMax, Math.max(1, Math.floor(Number(repeat.every)) || 1)),
        unit: repeat.unit,
    };
    if (repeat.unit === 'weeks' && Array.isArray(repeat.weekdays)) {
        const days = [...new Set(repeat.weekdays)].filter((d) => Number.isInteger(d) && d >= 1 && d <= 7).sort((a, b) => a - b);
        if (days.length > 0) stored.weekdays = days;
    }
    if (repeat.unit === 'months') stored.monthDay = monthDay ?? parseLocal(due.local).day;
    return stored;
};

/** The create dialog -> fields for createTask; the due is written in the zone of this device. */
export const taskFieldsFromForm = (form, timeZone = deviceTimeZone()) => {
    const due = dueFromPicker(form.due, timeZone);
    return {
        title: form.title.trim(),
        description: form.description,
        categoryId: form.categoryId || null,
        due,
        reminders: due ? storedReminders(form.reminders) : [],
        repeat: storedRepeat(form.repeat, due, null),
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

/**
 * The edit dialog -> partial changes for updateTask: only the fields the user changed (spec 3).
 * The due counts as unchanged while the picker shows the moment it showed when the dialog opened
 * (bubble.dueAt): the due and its zone stay, also on a device in another zone or with a zone this
 * browser does not know. A changed due takes the zone of this device and lets a muted task pulse.
 */
export const taskChangesFromForm = (bubble, form, timeZone = deviceTimeZone()) => {
    const dueChanged = bubble.dueAt === null
        ? form.due !== null
        : form.due === null || Math.floor(form.due.getTime() / MINUTE_MS) !== Math.floor(bubble.dueAt / MINUTE_MS);
    const due = dueChanged ? dueFromPicker(form.due, timeZone) : bubble.due;
    // "Done" may have moved a day-31 task to the 28th: while the due stays, so does the month day.
    const keptMonthDay = !dueChanged && bubble.repeat && bubble.repeat.unit === 'months' ? bubble.repeat.monthDay : null;
    const next = {
        title: form.title.trim(),
        description: form.description,
        categoryId: form.categoryId || null,
        due,
        reminders: due ? storedReminders(form.reminders) : [],
        repeat: storedRepeat(form.repeat, due, keptMonthDay),
        radius: form.radius,
    };
    const changes = {};
    Object.keys(next).forEach((key) => {
        if (!isEqual(next[key], bubble[key])) changes[key] = next[key];
    });
    if (dueChanged && bubble.pulseMuted) changes.pulseMuted = false;
    return changes;
};
