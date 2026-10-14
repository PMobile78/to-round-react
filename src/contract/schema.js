/**
 * Data contract v2 — shared constants and defaults.
 * Spec: docs/superpowers/specs/2026-10-14-stage-0-data-contract-v2-design.md (section 3).
 */
import palette from '../../contract/palette.json';

export const SCHEMA_VERSION = 2;

/** The 20 category colours; a category's colour must be one of these. */
export const PALETTE = Object.freeze([...palette]);

export const TASK_STATUSES = Object.freeze(['active', 'done', 'deleted']);
export const REPEAT_UNITS = Object.freeze(['hours', 'days', 'weeks', 'months']);
export const THEME_MODES = Object.freeze(['light', 'dark', 'system']);
export const DESIGNS = Object.freeze(['classic', 'modern', 'aurora', 'brutalist', 'clay']);
export const LANGUAGES = Object.freeze(['en', 'uk']);
export const MAIN_VIEWS = Object.freeze(['bubbles', 'list']);
export const LIST_SORT_FIELDS = Object.freeze(['createdAt', 'updatedAt', 'title', 'category']);
export const SORT_ORDERS = Object.freeze(['asc', 'desc']);

export const LIMITS = Object.freeze({
    idMaxLength: 128,
    titleMaxLength: 1000,
    descriptionMaxLength: 100000,
    categoryNameMaxLength: 100,
    maxReminders: 10,
    reminderStepMinutes: 60,
    reminderMaxMinutes: 524160,
    repeatEveryMax: 999,
    radiusMin: 30,
    radiusMax: 80,
    fontSizeMin: 8,
    fontSizeMax: 20,
});

export const DEFAULT_RADIUS = 45;

/** "uk*" -> "uk", anything else -> "en". */
export const normalizeLanguage = (tag) => (typeof tag === 'string' && tag.toLowerCase().startsWith('uk') ? 'uk' : 'en');

/** Fresh default settings object (spec 3.5); language comes from the device. */
export const createDefaultSettings = (deviceLanguage) => ({
    themeMode: 'system',
    design: 'classic',
    language: normalizeLanguage(deviceLanguage),
    mainView: 'bubbles',
    labelFontSize: 8,
    bubbleBackground: true,
    showCategoriesPanel: false,
    showInstructions: true,
    bubbleFilter: { categoryIds: null, showUncategorized: true, plannedOnly: false },
    listFilter: { categoryIds: null, showUncategorized: true },
    listSort: { by: 'updatedAt', order: 'desc' },
});

export const SETTINGS_KEYS = Object.freeze(Object.keys(createDefaultSettings('en')));
