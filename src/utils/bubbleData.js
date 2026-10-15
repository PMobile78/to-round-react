/**
 * Pure data helpers for bubbles/tags extracted from BubblesPage.
 * No Matter.js / Firestore / DOM side effects.
 */
import { lsGet } from './storage';

/** Режим «Запланированные» на холсте (как вкладка в списке задач): совпадает с фильтром по дате. */
export const BUBBLES_PLANNED_TASKS_VIEW_LS_KEY = 'bubbles-planned-tasks-only';

export function readBubbleViewPlannedTasksFromLS() {
    return lsGet(BUBBLES_PLANNED_TASKS_VIEW_LS_KEY, false) === true;
}
