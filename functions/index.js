/**
 * Cloud Functions for data contract v2 (spec docs/superpowers/specs/2026-10-14-stage-0-data-contract-v2-design.md,
 * sections 4.4 and 6). This file only wires triggers to lib/handlers.js.
 */
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onDocumentWritten, onDocumentDeleted } = require('firebase-functions/v2/firestore');
const handlers = require('./lib/handlers');

initializeApp();
const db = getFirestore();
const messaging = getMessaging();
const REGION = 'europe-west1';

// Every minute: reminders and overdue notifications of tasks whose nextNotifyAt has come.
exports.scheduleNotifications = onSchedule({ schedule: '* * * * *', region: REGION, maxInstances: 10 }, async () => {
    await handlers.runScheduler({ db, messaging, now: Date.now() });
});

// Any client write of a task: keeps nextNotifyAt, overdueAt and pulseMuted in step with its schedule.
// `now` is the time of the write, not of this (possibly late) run: events after the write still count.
// A failed run is retried (the handler is idempotent): a dropped event would leave the task unscheduled.
exports.onTaskWritten = onDocumentWritten({ document: 'users/{uid}/tasks/{taskId}', region: REGION, maxInstances: 10, retry: true }, async (event) => {
    const before = event.data.before.exists ? event.data.before.data() : null;
    const after = event.data.after.exists ? event.data.after.data() : null;
    const now = Date.parse(event.time) || Date.now();
    await handlers.handleTaskWritten({ db, ref: event.data.after.ref, before, after, now });
});

// A deleted category leaves its tasks without a category; a failed run is retried (idempotent).
exports.onCategoryDeleted = onDocumentDeleted({ document: 'users/{uid}/categories/{categoryId}', region: REGION, retry: true }, async (event) => {
    await handlers.clearDeletedCategory({ db, uid: event.params.uid, categoryId: event.params.categoryId });
});

// Daily: tasks in the trash for more than 30 days are deleted for good.
exports.purgeDeletedTasks = onSchedule({ schedule: '0 3 * * *', timeZone: 'Etc/UTC', region: REGION, maxInstances: 1 }, async () => {
    await handlers.purgeDeletedTasks({ db, now: Date.now() });
});

// Hourly: dedup keys older than 7 days are dropped.
exports.cleanupNotificationSent = onSchedule({ schedule: '0 * * * *', region: REGION, maxInstances: 1 }, async () => {
    await handlers.cleanupNotificationSent({ db, now: Date.now() });
});
