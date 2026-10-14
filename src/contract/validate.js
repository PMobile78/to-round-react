/**
 * Validation of plain (backup-form) v2 records: timestamps are ISO strings, ids are fields.
 * Each validator returns a list of error strings; an empty list means the record is valid.
 * Spec: docs/superpowers/specs/2026-10-14-stage-0-data-contract-v2-design.md (sections 3 and 10).
 */
import {
    PALETTE, TASK_STATUSES, REPEAT_UNITS, THEME_MODES, DESIGNS, LANGUAGES,
    MAIN_VIEWS, LIST_SORT_FIELDS, SORT_ORDERS, LIMITS, SETTINGS_KEYS,
} from './schema';
import { parseLocal, isValidTimeZone } from './time';

// 0-9 fraction digits: java.time Instant.toString() writes 6 or 9 when the value has micro/nanoseconds.
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?Z$/;
const TASK_KEYS = ['id', 'title', 'description', 'categoryId', 'status', 'due', 'reminders', 'repeat',
    'radius', 'pulseMuted', 'createdAt', 'updatedAt', 'deletedAt'];

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isIsoTimestamp = (v) => typeof v === 'string' && ISO_RE.test(v) && Number.isFinite(Date.parse(v));
const isIntIn = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;
const unknownKeys = (obj, allowed) => Object.keys(obj).filter((k) => !allowed.includes(k));
const isStrictlyAscending = (list) => list.every((v, i) => i === 0 || v > list[i - 1]);
const trimmedLengthIn = (v, max) => typeof v === 'string' && v.trim().length > 0 && v.trim().length <= max;

/** Firestore-safe document id: 1..128 chars, no "/". */
export const isValidId = (v) => typeof v === 'string' && v.length > 0 && v.length <= LIMITS.idMaxLength && !v.includes('/');

const isIdListOrNull = (v) => v === null || (Array.isArray(v) && v.every(isValidId));

const validateDue = (due, errors) => {
    if (due === null) return;
    if (!isPlainObject(due) || unknownKeys(due, ['local', 'tz']).length > 0) {
        errors.push('due: invalid shape');
        return;
    }
    if (!parseLocal(due.local)) errors.push('due.local: invalid');
    if (!isValidTimeZone(due.tz)) errors.push('due.tz: invalid');
};

const validateReminders = (reminders, errors) => {
    const ok = Array.isArray(reminders)
        && reminders.length <= LIMITS.maxReminders
        && reminders.every((m) => isIntIn(m, LIMITS.reminderStepMinutes, LIMITS.reminderMaxMinutes)
            && m % LIMITS.reminderStepMinutes === 0)
        && isStrictlyAscending(reminders);
    if (!ok) errors.push('reminders: invalid');
};

const validateRepeat = (repeat, errors) => {
    if (repeat === null) return;
    if (!isPlainObject(repeat) || unknownKeys(repeat, ['every', 'unit', 'weekdays', 'monthDay']).length > 0) {
        errors.push('repeat: invalid shape');
        return;
    }
    if (!isIntIn(repeat.every, 1, LIMITS.repeatEveryMax)) errors.push('repeat.every: invalid');
    if (!REPEAT_UNITS.includes(repeat.unit)) errors.push('repeat.unit: invalid');
    if ('weekdays' in repeat) {
        const ok = repeat.unit === 'weeks'
            && Array.isArray(repeat.weekdays)
            && repeat.weekdays.every((d) => isIntIn(d, 1, 7))
            && isStrictlyAscending(repeat.weekdays);
        if (!ok) errors.push('repeat.weekdays: invalid');
    }
    if (repeat.unit === 'months') {
        if (!isIntIn(repeat.monthDay, 1, 31)) errors.push('repeat.monthDay: required for months');
    } else if ('monthDay' in repeat) {
        errors.push('repeat.monthDay: only for months');
    }
};

export const validateTask = (task) => {
    if (!isPlainObject(task)) return ['task: not an object'];
    const errors = unknownKeys(task, TASK_KEYS).map((k) => `${k}: unknown field`);
    if (!isValidId(task.id)) errors.push('id: invalid');
    if (!trimmedLengthIn(task.title, LIMITS.titleMaxLength)) errors.push('title: invalid');
    if (typeof task.description !== 'string' || task.description.length > LIMITS.descriptionMaxLength) {
        errors.push('description: invalid');
    }
    if (task.categoryId !== null && !isValidId(task.categoryId)) errors.push('categoryId: invalid');
    if (!TASK_STATUSES.includes(task.status)) errors.push('status: invalid');
    validateDue(task.due, errors);
    validateReminders(task.reminders, errors);
    validateRepeat(task.repeat, errors);
    if (task.due === null && Array.isArray(task.reminders) && task.reminders.length > 0) {
        errors.push('reminders: require due');
    }
    if (task.due === null && task.repeat !== null) errors.push('repeat: requires due');
    if (!isIntIn(task.radius, LIMITS.radiusMin, LIMITS.radiusMax)) errors.push('radius: invalid');
    if (typeof task.pulseMuted !== 'boolean') errors.push('pulseMuted: invalid');
    if (!isIsoTimestamp(task.createdAt)) errors.push('createdAt: invalid');
    if (!isIsoTimestamp(task.updatedAt)) errors.push('updatedAt: invalid');
    const deletedOk = task.status === 'deleted' ? isIsoTimestamp(task.deletedAt) : task.deletedAt === null;
    if (!deletedOk) errors.push('deletedAt: invalid');
    return errors;
};

export const validateCategory = (category) => {
    if (!isPlainObject(category)) return ['category: not an object'];
    const errors = unknownKeys(category, ['id', 'name', 'color', 'order']).map((k) => `${k}: unknown field`);
    if (!isValidId(category.id)) errors.push('id: invalid');
    if (!trimmedLengthIn(category.name, LIMITS.categoryNameMaxLength)) errors.push('name: invalid');
    if (!PALETTE.includes(category.color)) errors.push('color: not in palette');
    if (typeof category.order !== 'number' || !Number.isFinite(category.order)) errors.push('order: invalid');
    return errors;
};

export const validateSettings = (settings) => {
    if (!isPlainObject(settings)) return ['settings: not an object'];
    const errors = unknownKeys(settings, SETTINGS_KEYS).map((k) => `${k}: unknown field`);
    const s = settings;
    if (!THEME_MODES.includes(s.themeMode)) errors.push('themeMode: invalid');
    if (!DESIGNS.includes(s.design)) errors.push('design: invalid');
    if (!LANGUAGES.includes(s.language)) errors.push('language: invalid');
    if (!MAIN_VIEWS.includes(s.mainView)) errors.push('mainView: invalid');
    if (!isIntIn(s.labelFontSize, LIMITS.fontSizeMin, LIMITS.fontSizeMax)) errors.push('labelFontSize: invalid');
    ['bubbleBackground', 'showCategoriesPanel', 'showInstructions'].forEach((key) => {
        if (typeof s[key] !== 'boolean') errors.push(`${key}: invalid`);
    });
    const bf = s.bubbleFilter;
    if (!isPlainObject(bf) || unknownKeys(bf, ['categoryIds', 'showUncategorized', 'plannedOnly']).length > 0
        || !isIdListOrNull(bf.categoryIds) || typeof bf.showUncategorized !== 'boolean'
        || typeof bf.plannedOnly !== 'boolean') {
        errors.push('bubbleFilter: invalid');
    }
    const lf = s.listFilter;
    if (!isPlainObject(lf) || unknownKeys(lf, ['categoryIds', 'showUncategorized']).length > 0
        || !isIdListOrNull(lf.categoryIds) || typeof lf.showUncategorized !== 'boolean') {
        errors.push('listFilter: invalid');
    }
    const ls = s.listSort;
    if (!isPlainObject(ls) || unknownKeys(ls, ['by', 'order']).length > 0
        || !LIST_SORT_FIELDS.includes(ls.by) || !SORT_ORDERS.includes(ls.order)) {
        errors.push('listSort: invalid');
    }
    return errors;
};
