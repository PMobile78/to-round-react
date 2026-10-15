/**
 * Tasks of one user, users/{uid}/tasks (data contract v2, spec sections 3.1 and 4.1).
 * db and uid are arguments: the app passes its own, the emulator tests theirs. Records are in
 * backup form (./convert.js); writes are creates with server times and partial updates.
 */
import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { nextFutureOccurrence } from '../../contract/recurrence';
import { newTaskData, taskFromDoc, taskUpdateData } from './convert';

// Pending serverTimestamp() fields read as the local estimate instead of null.
const READ_OPTIONS = { serverTimestamps: 'estimate' };

const tasksCollection = (db, uid) => collection(db, 'users', uid, 'tasks');
const taskRef = (db, uid, id) => doc(db, 'users', uid, 'tasks', id);

/** "Done" (spec 4.1): a one-off task becomes done; a repeating one moves to its next future due. */
export const completionChanges = (task, now) => {
    if (!task.repeat || !task.due) return { status: 'done' };
    const changes = {
        due: { local: nextFutureOccurrence(task.due.local, task.due.tz, task.repeat, now), tz: task.due.tz },
    };
    if (task.pulseMuted) changes.pulseMuted = false;
    return changes;
};

/** A new automatic id, known before the write so the canvas can show the task at once. */
export const newTaskId = (db, uid) => doc(tasksCollection(db, uid)).id;

/**
 * Live changes, one by one (#94): onChanges([{ type: 'added' | 'modified' | 'removed', task }], { initial }).
 * The first delivery of a subscription has initial: true and lists every task as 'added'.
 */
export const subscribeTasks = (db, uid, onChanges, onError) => {
    let initial = true;
    return onSnapshot(tasksCollection(db, uid), (snapshot) => {
        const changes = snapshot.docChanges().map((change) => ({
            type: change.type,
            task: taskFromDoc(change.doc.id, change.doc.data(READ_OPTIONS)),
        }));
        const meta = { initial };
        initial = false;
        onChanges(changes, meta);
    }, onError);
};

/** fields = { title, description, categoryId, due, reminders, repeat, radius }. */
export const createTask = (db, uid, id, fields) => setDoc(taskRef(db, uid, id), newTaskData(fields));

/** Partial update of client fields. A task deleted meanwhile is not re-created: the rules deny the write. */
export const updateTask = (db, uid, id, changes) => updateDoc(taskRef(db, uid, id), taskUpdateData(changes));

export const trashTask = (db, uid, id) => updateTask(db, uid, id, { status: 'deleted', deletedAt: serverTimestamp() });

/** Back from the trash or from done. */
export const restoreTask = (db, uid, id) => updateTask(db, uid, id, { status: 'active', deletedAt: null });

export const deleteTaskForever = (db, uid, id) => deleteDoc(taskRef(db, uid, id));

export const completeTask = (db, uid, task, now = new Date()) => updateTask(db, uid, task.id, completionChanges(task, now));

/** "Finish series" of a repeating task (spec 4.1): done, like a one-off task. */
export const finishSeries = (db, uid, id) => updateTask(db, uid, id, { status: 'done' });

/** "Stop pulsing" (spec 4.1); the server sets it back to false when the due changes. */
export const muteTaskPulse = (db, uid, id) => updateTask(db, uid, id, { pulseMuted: true });
