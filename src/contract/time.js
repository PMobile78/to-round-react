/**
 * Wall-clock ("local") time <-> instant conversion for the v2 data contract.
 * `local` is "YYYY-MM-DDTHH:mm" without offset; `tz` is an IANA zone.
 * Resolution rules match java.time.ZonedDateTime.of:
 *  - nonexistent local time (spring-forward gap) is shifted forward by the gap length;
 *  - ambiguous local time (fall-back overlap) uses the earlier offset (earlier instant).
 */

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;
const LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

const formatters = new Map();

const formatterFor = (tz) => {
    let fmt = formatters.get(tz);
    if (!fmt) {
        fmt = new Intl.DateTimeFormat('en-US', {
            timeZone: tz,
            hourCycle: 'h23',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
        formatters.set(tz, fmt);
    }
    return fmt;
};

// Wall-clock of `epochMs` in `tz`, encoded as a UTC epoch value (minute precision).
const wallClockMs = (epochMs, tz) => {
    const parts = formatterFor(tz).formatToParts(new Date(epochMs));
    const get = (type) => Number(parts.find((p) => p.type === type).value);
    return Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'));
};

const offsetMs = (epochMs, tz) => wallClockMs(epochMs, tz) - Math.floor(epochMs / MINUTE_MS) * MINUTE_MS;

/** Parses "YYYY-MM-DDTHH:mm" into calendar fields, or returns null when malformed. */
export const parseLocal = (local) => {
    const m = typeof local === 'string' ? LOCAL_RE.exec(local) : null;
    if (!m) return null;
    const [year, month, day, hour, minute] = m.slice(1).map(Number);
    const probe = new Date(Date.UTC(year, month - 1, day, hour, minute));
    if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day
        || probe.getUTCHours() !== hour || probe.getUTCMinutes() !== minute) {
        return null;
    }
    return { year, month, day, hour, minute };
};

/** Formats calendar fields (month 1-12) as "YYYY-MM-DDTHH:mm". */
export const formatLocal = ({ year, month, day, hour, minute }) => {
    const pad = (n, w = 2) => String(n).padStart(w, '0');
    return `${pad(year, 4)}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}`;
};

/** True when `tz` is an IANA zone known to this runtime. */
export const isValidTimeZone = (tz) => {
    if (typeof tz !== 'string' || tz.length === 0 || tz.length > 64) return false;
    try {
        formatterFor(tz);
        return true;
    } catch {
        return false;
    }
};

/** Instant (Date) of a wall-clock `local` time in zone `tz`. Throws on malformed input. */
export const toInstant = (local, tz) => {
    const f = parseLocal(local);
    if (!f) throw new Error(`Invalid local date-time: ${local}`);
    const localMs = Date.UTC(f.year, f.month - 1, f.day, f.hour, f.minute);
    const before = offsetMs(localMs - DAY_MS, tz);
    const after = offsetMs(localMs + DAY_MS, tz);
    const earlier = localMs - before;
    if (before === after || wallClockMs(earlier, tz) === localMs) return new Date(earlier);
    const later = localMs - after;
    if (wallClockMs(later, tz) === localMs) return new Date(later);
    return new Date(earlier); // gap: java.time shifts forward by the gap length
};

/** Wall-clock "YYYY-MM-DDTHH:mm" of an instant (Date or epoch ms) in zone `tz`. */
export const toLocal = (instant, tz) => {
    const ms = wallClockMs(instant instanceof Date ? instant.getTime() : instant, tz);
    const d = new Date(ms);
    return formatLocal({
        year: d.getUTCFullYear(),
        month: d.getUTCMonth() + 1,
        day: d.getUTCDate(),
        hour: d.getUTCHours(),
        minute: d.getUTCMinutes(),
    });
};

/** IANA zone of this device, falling back to "UTC". */
export const deviceTimeZone = () => {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
        return 'UTC';
    }
};
