/**
 * A v2 task as the bubble the app shows: the task's fields (backup form, ./convert.js) plus
 * tagId — its category, the name the interface keeps (spec 8.1) — and dueAt, the moment of its
 * due in ms for the canvas, the list, the pulse and the date picker (spec 4.2).
 */
import { deviceTimeZone, isValidTimeZone, toInstant } from '../../contract/time';

// The moment of the due in ms (spec 4.2). A zone this browser does not know reads the time as
// written in the zone of this device; a date that does not exist gives no moment.
const dueAtOf = (due, timeZone) => {
    if (!due) return null;
    try {
        return toInstant(due.local, isValidTimeZone(due.tz) ? due.tz : timeZone).getTime();
    } catch {
        return null;
    }
};

/** v2 task (or bubble) -> bubble fields; the Matter body, if any, is kept. */
export const bubbleFromTask = (task, timeZone = deviceTimeZone()) => ({
    ...task,
    tagId: task.categoryId,
    dueAt: dueAtOf(task.due, timeZone),
});

/** A bubble after a local write: the changes applied, tagId and dueAt recomputed, body kept. */
export const withTaskChanges = (bubble, changes, timeZone = deviceTimeZone()) => bubbleFromTask({ ...bubble, ...changes }, timeZone);
