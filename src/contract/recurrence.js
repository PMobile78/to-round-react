/**
 * Next occurrence of a repeating task (data contract v2, spec section 4.3).
 * `local` is "YYYY-MM-DDTHH:mm", `tz` an IANA zone,
 * `repeat` = { every, unit: 'hours'|'days'|'weeks'|'months', weekdays?: number[] (ISO 1..7), monthDay?: number }.
 */
import { parseLocal, formatLocal, toInstant, toLocal } from './time';

const HOUR_MS = 60 * 60 * 1000;
const MAX_STEPS = 100000;

// Calendar arithmetic on wall-clock fields (zone-free): add whole days.
const addDays = (f, days) => {
    const d = new Date(Date.UTC(f.year, f.month - 1, f.day + days));
    return { ...f, year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
};

// ISO day of week: 1 = Monday ... 7 = Sunday.
const isoWeekday = (f) => {
    const dow = new Date(Date.UTC(f.year, f.month - 1, f.day)).getUTCDay();
    return dow === 0 ? 7 : dow;
};

const daysInMonth = (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate();

const stepHours = (local, tz, every) => {
    let t = toInstant(local, tz).getTime();
    for (let i = 0; i < MAX_STEPS; i += 1) {
        t += every * HOUR_MS;
        const candidate = toLocal(t, tz);
        // Skip instants whose wall-clock is ambiguous (second pass of a fall-back hour).
        if (toInstant(candidate, tz).getTime() === t) return candidate;
    }
    throw new Error('Hourly recurrence did not advance');
};

const stepWeekdays = (f, every, weekdays) => {
    const days = [...new Set(weekdays)].sort((a, b) => a - b);
    const current = isoWeekday(f);
    const laterThisWeek = days.find((d) => d > current);
    if (laterThisWeek !== undefined) return addDays(f, laterThisWeek - current);
    const weekStart = addDays(f, 1 - current);
    return addDays(weekStart, 7 * every + (days[0] - 1));
};

const stepMonths = (f, every, monthDay) => {
    const monthIndex = f.year * 12 + (f.month - 1) + every;
    const year = Math.floor(monthIndex / 12);
    const month = (monthIndex % 12) + 1;
    return { ...f, year, month, day: Math.min(monthDay, daysInMonth(year, month)) };
};

/** One recurrence step from `local`; returns the next wall-clock "YYYY-MM-DDTHH:mm". */
export const stepOccurrence = (local, tz, repeat) => {
    const f = parseLocal(local);
    if (!f) throw new Error(`Invalid local date-time: ${local}`);
    const every = repeat.every;
    switch (repeat.unit) {
        case 'hours':
            return stepHours(local, tz, every);
        case 'days':
            return formatLocal(addDays(f, every));
        case 'weeks':
            if (Array.isArray(repeat.weekdays) && repeat.weekdays.length > 0) {
                return formatLocal(stepWeekdays(f, every, repeat.weekdays));
            }
            return formatLocal(addDays(f, 7 * every));
        case 'months':
            return formatLocal(stepMonths(f, every, repeat.monthDay));
        default:
            throw new Error(`Unknown repeat unit: ${repeat.unit}`);
    }
};

/** First occurrence after `local` whose instant is strictly later than `now` (Date). */
export const nextFutureOccurrence = (local, tz, repeat, now) => {
    const nowMs = now.getTime();
    if (repeat.unit === 'hours') {
        const stepMs = repeat.every * HOUR_MS;
        let t = toInstant(local, tz).getTime();
        // Fast-forward to the last step at or before `now`; the result is the same as stepping one by one.
        if (t < nowMs) t += Math.floor((nowMs - t) / stepMs) * stepMs;
        for (let i = 0; i < MAX_STEPS; i += 1) {
            t += stepMs;
            const candidate = toLocal(t, tz);
            if (t > nowMs && toInstant(candidate, tz).getTime() === t) return candidate;
        }
        throw new Error('Hourly recurrence did not advance');
    }
    let current = local;
    for (let i = 0; i < MAX_STEPS; i += 1) {
        current = stepOccurrence(current, tz, repeat);
        if (toInstant(current, tz).getTime() > nowMs) return current;
    }
    throw new Error('Recurrence did not reach the future');
};
