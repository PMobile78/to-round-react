/**
 * v1 -> v2 mapping (spec section 9.2). Used by the one-time migration and by importing v1 backups.
 * Every mapper is pure: the caller supplies `now`, the fallback zone and the UI language.
 */
import { DEFAULT_RADIUS, LIMITS, PALETTE, THEME_MODES, DESIGNS, LIST_SORT_FIELDS, SORT_ORDERS,
    createDefaultSettings, normalizeLanguage } from './schema';
import { parseLocal, isValidTimeZone, toLocal } from './time';
import { htmlToMarkdown, plainTextToMarkdown } from './markdown';
import { isValidId } from './validate';
import { LS } from '../utils/storageKeys';

const PRESET_MINUTES = { '5m': 5, '10m': 10, '15m': 15, '1h': 60, '1d': 1440 };
const UNIT_MINUTES = { minutes: 1, hours: 60, days: 1440, weeks: 10080 };
const NAIVE_LOCAL_RE = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})(:\d{2}(\.\d+)?)?$/;
const UNTITLED = { en: 'Untitled', uk: 'Без назви' };

const reminderMinutes = (n) => {
    if (typeof n === 'string') return PRESET_MINUTES[n] ?? NaN;
    if (typeof n === 'number') return n;
    if (n && typeof n === 'object') {
        if (n.type === 'custom') return Number(n.value) * (UNIT_MINUTES[n.unit] ?? NaN);
        if ('minutesBefore' in n) return Number(n.minutesBefore);
    }
    return NaN;
};

const mapReminders = (list, notes) => {
    const minutesSet = new Set();
    (Array.isArray(list) ? list : []).forEach((n) => {
        const minutes = reminderMinutes(n);
        if (!Number.isFinite(minutes) || minutes <= 0) {
            notes.add('reminder-dropped');
            return;
        }
        const rounded = Math.min(LIMITS.reminderMaxMinutes,
            Math.max(LIMITS.reminderStepMinutes, Math.ceil(minutes / LIMITS.reminderStepMinutes) * LIMITS.reminderStepMinutes));
        if (rounded !== minutes) notes.add('reminders-rounded');
        minutesSet.add(rounded);
    });
    const sorted = [...minutesSet].sort((a, b) => a - b);
    if (sorted.length > LIMITS.maxReminders) notes.add('reminders-truncated');
    return sorted.slice(0, LIMITS.maxReminders);
};

const mapDue = (dueDate, tz, ctx, notes) => {
    if (dueDate === null || dueDate === undefined || dueDate === '') return null;
    const zone = isValidTimeZone(tz) ? tz : ctx.timeZone;
    if (typeof dueDate === 'string') {
        const naive = NAIVE_LOCAL_RE.exec(dueDate);
        if (naive && parseLocal(naive[1])) return { local: naive[1], tz: zone };
        const instant = new Date(dueDate);
        if (Number.isFinite(instant.getTime())) return { local: toLocal(instant, zone), tz: zone };
    }
    notes.add('due-dropped');
    return null;
};

const mapRepeat = (recurrence, due, notes) => {
    if (!due || !recurrence || typeof recurrence !== 'object') return null;
    let every = Math.max(1, Math.floor(Number(recurrence.every) || 1));
    let unit = recurrence.unit;
    if (unit === 'minutes') {
        every = Math.ceil(every / 60);
        unit = 'hours';
        notes.add('repeat-rounded');
    }
    if (!['hours', 'days', 'weeks', 'months'].includes(unit)) {
        notes.add('repeat-dropped');
        return null;
    }
    const repeat = { every: Math.min(every, LIMITS.repeatEveryMax), unit };
    if (unit === 'weeks' && Array.isArray(recurrence.weekDays)) {
        const days = [...new Set(recurrence.weekDays
            .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
            .map((d) => (d === 0 ? 7 : d)))].sort((a, b) => a - b);
        if (days.length > 0) repeat.weekdays = days;
    }
    if (unit === 'months') repeat.monthDay = parseLocal(due.local).day;
    return repeat;
};

// Accepts ISO strings and Firestore Timestamp-like objects ({ toDate() }).
const timestampMs = (value) => {
    if (typeof value === 'string') return Date.parse(value);
    if (value && typeof value.toDate === 'function') return value.toDate().getTime();
    return NaN;
};

const isoOrNow = (value, ctx, notes) => {
    const ms = timestampMs(value);
    if (Number.isFinite(ms) && ms <= ctx.now.getTime()) return new Date(ms).toISOString();
    notes.add('timestamp-fixed');
    return ctx.now.toISOString();
};

const mapDescription = (v1, notes) => {
    if (typeof v1.description !== 'string' || v1.description === '') return '';
    let description;
    if (v1.useRichText === true) {
        const converted = htmlToMarkdown(v1.description);
        if (converted.lossy) notes.add('formatting-lost');
        description = converted.markdown;
    } else {
        description = plainTextToMarkdown(v1.description);
    }
    if (description.length > LIMITS.descriptionMaxLength) {
        notes.add('description-truncated');
        return description.slice(0, LIMITS.descriptionMaxLength);
    }
    return description;
};

/**
 * Maps one v1 task record. ctx = { now: Date, timeZone: string, language: 'en'|'uk', categoryIds: Set<string> }.
 * Returns { task: v2 plain task | null, notes: string[] (sorted note codes) }.
 */
export const mapTaskV1 = (v1, ctx) => {
    const id = v1 && v1.id !== undefined && v1.id !== null ? String(v1.id) : '';
    if (!isValidId(id)) return { task: null, notes: ['invalid-record'] };
    const notes = new Set();

    let title = typeof v1.title === 'string' ? v1.title.trim() : '';
    if (!title) {
        title = UNTITLED[ctx.language] || UNTITLED.en;
        notes.add('title-defaulted');
    }
    if (title.length > LIMITS.titleMaxLength) {
        title = title.slice(0, LIMITS.titleMaxLength);
        notes.add('title-truncated');
    }

    let status = v1.status;
    if (status === 'postpone') {
        status = 'active';
        notes.add('status-postpone');
    }
    if (!['active', 'done', 'deleted'].includes(status)) status = 'active';

    const due = mapDue(v1.dueDate, v1.tz, ctx, notes);
    const radius = Number(v1.radius);
    const task = {
        id,
        title,
        description: mapDescription(v1, notes),
        categoryId: typeof v1.tagId === 'string' && ctx.categoryIds.has(v1.tagId) ? v1.tagId : null,
        status,
        due,
        reminders: due ? mapReminders(v1.notifications, notes) : [],
        repeat: mapRepeat(v1.recurrence, due, notes),
        radius: Number.isFinite(radius) && radius > 0
            ? Math.min(LIMITS.radiusMax, Math.max(LIMITS.radiusMin, Math.round(radius)))
            : DEFAULT_RADIUS,
        pulseMuted: v1.overduePulseSuppressed === true,
        createdAt: isoOrNow(v1.createdAt, ctx, notes),
        updatedAt: isoOrNow(v1.updatedAt, ctx, notes),
        deletedAt: status === 'deleted' ? isoOrNow(v1.deletedAt, ctx, notes) : null,
    };
    return { task, notes: [...notes].sort() };
};

/**
 * Maps the v1 tags array. Keeps ids and order; a colour outside the palette or already taken
 * is replaced by the first free palette colour. Returns { categories, notes: [{ id, code }] }.
 */
export const mapCategoriesV1 = (tags) => {
    const records = [];
    const notes = [];
    (Array.isArray(tags) ? tags : []).forEach((tag) => {
        const id = tag && tag.id !== undefined && tag.id !== null ? String(tag.id) : '';
        if (!isValidId(id) || records.some((r) => r.id === id)) {
            notes.push({ id: id || null, code: 'invalid-record' });
            return;
        }
        records.push({
            id,
            name: typeof tag.name === 'string' ? tag.name.trim() : '',
            color: typeof tag.color === 'string' ? tag.color.toLowerCase() : null,
        });
    });

    const used = new Set();
    records.forEach((r) => {
        if (PALETTE.includes(r.color) && !used.has(r.color)) used.add(r.color);
        else r.color = null;
    });

    const categories = [];
    records.forEach((r) => {
        let color = r.color;
        if (color === null) {
            color = PALETTE.find((c) => !used.has(c));
            if (!color) {
                notes.push({ id: r.id, code: 'category-dropped' });
                return;
            }
            used.add(color);
            notes.push({ id: r.id, code: 'color-changed' });
        }
        let name = r.name;
        if (!name) {
            name = 'Category';
            notes.push({ id: r.id, code: 'name-defaulted' });
        }
        if (name.length > LIMITS.categoryNameMaxLength) {
            name = name.slice(0, LIMITS.categoryNameMaxLength);
            notes.push({ id: r.id, code: 'name-truncated' });
        }
        categories.push({ id: r.id, name, color, order: categories.length + 1 });
    });
    return { categories, notes };
};

// localStorage can throw (blocked storage, private mode): treat that as "not stored".
const readRaw = (getItem, key) => {
    try {
        const raw = getItem(key);
        return raw === undefined ? null : raw;
    } catch {
        return null;
    }
};

const readString = (getItem, key) => {
    const raw = readRaw(getItem, key);
    if (raw === null) return null;
    try {
        const parsed = JSON.parse(raw);
        return typeof parsed === 'string' ? parsed : raw;
    } catch {
        return raw;
    }
};

const readJson = (getItem, key) => {
    const raw = readRaw(getItem, key);
    if (raw === null) return undefined;
    try {
        return JSON.parse(raw);
    } catch {
        return undefined;
    }
};

const readBoolean = (getItem, key, fallback) => {
    const value = readJson(getItem, key);
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return fallback;
};

const readIdList = (getItem, key) => {
    const value = readJson(getItem, key);
    return Array.isArray(value) ? value.filter(isValidId) : null;
};

/** Builds v2 settings from the legacy localStorage keys (spec table 3.5). getItem = localStorage.getItem. */
export const settingsFromLocalStorage = (getItem, deviceLanguage) => {
    const s = createDefaultSettings(deviceLanguage);
    const theme = readString(getItem, LS.THEME_MODE);
    if (THEME_MODES.includes(theme)) s.themeMode = theme;
    const design = readString(getItem, LS.DESIGN);
    if (DESIGNS.includes(design)) s.design = design;
    const language = readString(getItem, LS.I18N_LNG);
    if (language) s.language = normalizeLanguage(language);
    s.mainView = readString(getItem, LS.MAIN_VIEW) === 'tasks' ? 'list' : 'bubbles';
    const fontSize = Number.parseInt(readString(getItem, LS.FONT_SIZE), 10);
    if (Number.isInteger(fontSize) && fontSize >= LIMITS.fontSizeMin && fontSize <= LIMITS.fontSizeMax) {
        s.labelFontSize = fontSize;
    }
    s.bubbleBackground = readBoolean(getItem, LS.BACKGROUND_ENABLED, true);
    s.showCategoriesPanel = readBoolean(getItem, LS.CATEGORIES_PANEL_ENABLED, false);
    s.showInstructions = readBoolean(getItem, LS.SHOW_INSTRUCTIONS, true);
    s.bubbleFilter = {
        categoryIds: readIdList(getItem, LS.FILTER_TAGS),
        showUncategorized: readBoolean(getItem, LS.SHOW_NO_TAG, true),
        plannedOnly: readBoolean(getItem, LS.PLANNED_TASKS_ONLY, false),
    };
    s.listFilter = {
        categoryIds: readIdList(getItem, LS.LIST_FILTER_TAGS),
        showUncategorized: readBoolean(getItem, LS.LIST_SHOW_NO_TAG, true),
    };
    const sortBy = readString(getItem, LS.LIST_SORT_BY);
    const by = sortBy === 'tag' ? 'category' : sortBy;
    const order = readString(getItem, LS.LIST_SORT_ORDER);
    s.listSort = {
        by: LIST_SORT_FIELDS.includes(by) ? by : 'updatedAt',
        order: SORT_ORDERS.includes(order) ? order : 'desc',
    };
    return s;
};
