/**
 * Pure data helpers for bubbles/tags extracted from BubblesPage.
 * No Matter.js / Firestore / DOM side effects.
 */
import { lsGet } from './storage';

// Whitelist-validate a single imported bubble — strips unknown/dangerous fields.
const ALLOWED_BUBBLE_STATUSES = new Set(['active', 'done', 'postpone', 'deleted']);
export const sanitizeBubble = (raw) => {
    if (!raw || typeof raw !== 'object') return null;
    const id = raw.id != null ? String(raw.id) : null;
    if (!id) return null;
    return {
        id,
        title: typeof raw.title === 'string' ? raw.title : '',
        description: typeof raw.description === 'string' ? raw.description : '',
        radius: typeof raw.radius === 'number' && raw.radius > 0 ? raw.radius : 50,
        status: ALLOWED_BUBBLE_STATUSES.has(raw.status) ? raw.status : 'active',
        fillStyle: typeof raw.fillStyle === 'string' ? raw.fillStyle : 'transparent',
        strokeStyle: typeof raw.strokeStyle === 'string' ? raw.strokeStyle : '#2f6bdb',
        tagId: typeof raw.tagId === 'string' ? raw.tagId : null,
        dueDate: typeof raw.dueDate === 'string' ? raw.dueDate : null,
        tz: typeof raw.tz === 'string' ? raw.tz : null,
        notifications: Array.isArray(raw.notifications) ? raw.notifications : [],
        recurrence: raw.recurrence && typeof raw.recurrence === 'object' ? raw.recurrence : null,
        overdueSticky: typeof raw.overdueSticky === 'boolean' ? raw.overdueSticky : false,
        overdueAt: typeof raw.overdueAt === 'string' ? raw.overdueAt : null,
        overduePulseSuppressed: typeof raw.overduePulseSuppressed === 'boolean' ? raw.overduePulseSuppressed : false,
        useRichText: typeof raw.useRichText === 'boolean' ? raw.useRichText : false,
        createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
        updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
        deletedAt: typeof raw.deletedAt === 'string' ? raw.deletedAt : null,
    };
};

// Whitelist-validate a single imported tag — strips unknown/dangerous fields.
export const sanitizeTag = (raw) => {
    if (!raw || typeof raw !== 'object') return null;
    const id = raw.id != null ? String(raw.id) : null;
    if (!id) return null;
    return {
        id,
        name: typeof raw.name === 'string' ? raw.name : '',
        color: typeof raw.color === 'string' ? raw.color : '#2f6bdb',
    };
};

// Normalize a date-like value to an ISO string (or null).
export const toIsoOrNull = (value) => {
    try {
        if (!value) return null;
        if (typeof value === 'string') return value;
        // Firestore Timestamp
        if (value && typeof value.toDate === 'function') {
            const d = value.toDate();
            return Number.isFinite(d?.getTime?.()) ? d.toISOString() : null;
        }
        const d = new Date(value);
        return Number.isFinite(d?.getTime?.()) ? d.toISOString() : null;
    } catch (_) {
        return null;
    }
};

// Подготовка данных пузырей к экспорту (без Matter.js ссылок)
export const sanitizeBubblesForExport = (bubblesData) => {
    return (bubblesData || []).map((bubble) => ({
        id: bubble.id,
        radius: bubble.radius,
        title: bubble.title || '',
        description: bubble.description || '',
        fillStyle: bubble.body?.render?.fillStyle || bubble.fillStyle || 'transparent',
        strokeStyle: bubble.body?.render?.strokeStyle || bubble.strokeStyle || '#2f6bdb',
        tagId: bubble.tagId || null,
        status: bubble.status || 'active',
        createdAt: typeof bubble.createdAt === 'string' ? bubble.createdAt : toIsoOrNull(bubble.createdAt) || new Date().toISOString(),
        updatedAt: typeof bubble.updatedAt === 'string' ? bubble.updatedAt : toIsoOrNull(bubble.updatedAt) || new Date().toISOString(),
        deletedAt: toIsoOrNull(bubble.deletedAt),
        dueDate: toIsoOrNull(bubble.dueDate),
        tz: typeof bubble.tz === 'string' ? bubble.tz : null,
        notifications: Array.isArray(bubble.notifications) ? bubble.notifications : [],
        recurrence: bubble.recurrence || null,
        overdueSticky: typeof bubble.overdueSticky === 'boolean' ? bubble.overdueSticky : false,
        overdueAt: toIsoOrNull(bubble.overdueAt),
        overduePulseSuppressed: typeof bubble.overduePulseSuppressed === 'boolean' ? bubble.overduePulseSuppressed : false
    }));
};

/** Режим «Запланированные» на холсте (как вкладка в списке задач): совпадает с фильтром по дате. */
export const BUBBLES_PLANNED_TASKS_VIEW_LS_KEY = 'bubbles-planned-tasks-only';

export function readBubbleViewPlannedTasksFromLS() {
    return lsGet(BUBBLES_PLANNED_TASKS_VIEW_LS_KEY, false) === true;
}
