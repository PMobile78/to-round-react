const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fns = require('../../index');

const schedule = (fn) => fn.__endpoint.scheduleTrigger.schedule;
const eventPath = (fn) => fn.__endpoint.eventTrigger.eventFilterPathPatterns.document;

describe('index.js', () => {
    it('exports exactly the v2 functions (the v1 notifier and trigger are gone)', () => {
        assert.deepEqual(Object.keys(fns).sort(), [
            'cleanupNotificationSent', 'onCategoryDeleted', 'onTaskWritten', 'purgeDeletedTasks', 'scheduleNotifications',
        ]);
    });

    it('runs everything in europe-west1', () => {
        for (const fn of Object.values(fns)) assert.deepEqual(fn.__endpoint.region, ['europe-west1']);
    });

    it('uses crontab schedules: notifier every minute, purge daily, cleanup hourly', () => {
        assert.equal(schedule(fns.scheduleNotifications), '* * * * *');
        assert.equal(schedule(fns.purgeDeletedTasks), '0 3 * * *');
        assert.equal(schedule(fns.cleanupNotificationSent), '0 * * * *');
    });

    it('listens to v2 task writes and category deletes', () => {
        assert.equal(eventPath(fns.onTaskWritten), 'users/{uid}/tasks/{taskId}');
        assert.equal(fns.onTaskWritten.__endpoint.eventTrigger.eventType, 'google.cloud.firestore.document.v1.written');
        assert.equal(eventPath(fns.onCategoryDeleted), 'users/{uid}/categories/{categoryId}');
        assert.equal(fns.onCategoryDeleted.__endpoint.eventTrigger.eventType, 'google.cloud.firestore.document.v1.deleted');
    });

    it('retries a failed trigger run instead of dropping the event (both handlers are idempotent)', () => {
        assert.equal(fns.onTaskWritten.__endpoint.eventTrigger.retry, true);
        assert.equal(fns.onCategoryDeleted.__endpoint.eventTrigger.retry, true);
    });
});
