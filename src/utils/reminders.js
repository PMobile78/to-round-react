/**
 * Reminders of a task (data contract v2, spec 3.1): minutes before the due, whole hours from
 * 1 hour to 52 weeks, without repeats, ascending, at most 10.
 */
import { LIMITS } from '../contract/schema';

const UNIT_MINUTES = { hours: 60, days: 1440, weeks: 10080 };

/** The ready-made reminders of the task dialog: 1 hour and 1 day before the due. */
export const REMINDER_PRESETS = [60, 1440];

/** A reminder in its largest whole unit: 2880 -> { count: 2, unit: 'days' }. */
export const reminderParts = (minutes) => {
    if (minutes % UNIT_MINUTES.weeks === 0) return { count: minutes / UNIT_MINUTES.weeks, unit: 'weeks' };
    if (minutes % UNIT_MINUTES.days === 0) return { count: minutes / UNIT_MINUTES.days, unit: 'days' };
    return { count: minutes / UNIT_MINUTES.hours, unit: 'hours' };
};

/** count (as typed) hours, days or weeks -> minutes, or null when it is not a whole number in 1 hour..52 weeks. */
export const reminderMinutes = (count, unit) => {
    const n = count === '' ? NaN : Number(count);
    if (!Number.isInteger(n) || n < 1) return null;
    const minutes = n * UNIT_MINUTES[unit];
    return minutes <= LIMITS.reminderMaxMinutes ? minutes : null;
};

/** The list with one more reminder: sorted, without repeats, at most 10. */
export const withReminder = (reminders, minutes) => (reminders.includes(minutes) || reminders.length >= LIMITS.maxReminders
    ? reminders
    : [...reminders, minutes].sort((a, b) => a - b));
