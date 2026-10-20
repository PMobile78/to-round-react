// Task statuses as the UI uses them (spec 3.1).
export const BUBBLE_STATUS = {
    ACTIVE: 'active',
    DONE: 'done',
    DELETED: 'deleted'
};

// The list's "planned" tab filters by due, not by status.
const PLANNED_TAB = 'postpone';

/** An active task whose due (dueAt, ms) is still ahead of `now` (ms): the "planned" tab and filter. */
export const isPlannedTask = (bubble, now) => bubble.status === BUBBLE_STATUS.ACTIVE
    && Number.isFinite(bubble.dueAt) && bubble.dueAt > now;

/** "Finish series" (spec 4.1) is offered for an active repeating task. */
export const canFinishSeries = (bubble) => bubble.status === BUBBLE_STATUS.ACTIVE && bubble.repeat !== null;

// Get bubbles by status (a list tab); `now` (ms) decides the "planned" tab
export const getBubblesByStatus = (bubblesData, status, now = Date.now()) => {
    if (!status) return bubblesData;
    if (status === PLANNED_TAB) return bubblesData.filter(bubble => isPlannedTask(bubble, now));
    return bubblesData.filter(bubble => bubble.status === status);
};
