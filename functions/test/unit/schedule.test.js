const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const taskFixtures = require('../../../contract/fixtures/tasks.json');
const {
    validReminders, dueInstantMs, taskEvents, nextEventAfter, sameSchedule,
    planTaskWrite, planSchedulerRun, reminderKey, overdueKey, notificationDocId,
} = require('../../lib/schedule');

const at = (iso) => Date.parse(iso);
// Due 2026-10-15 12:00 in Berlin (CEST, UTC+2) = 10:00Z; reminders 1 hour and 1 day before.
const DUE = at('2026-10-15T10:00:00.000Z');
const plain = (overrides = {}) => ({
    status: 'active',
    due: { local: '2026-10-15T12:00', tz: 'Europe/Berlin' },
    reminders: [60, 1440],
    repeat: null,
    title: 'Buy milk',
    pulseMuted: false,
    overdueAt: null,
    nextNotifyAt: null,
    ...overrides,
});

describe('validReminders', () => {
    it('keeps whole hours from 1 hour to 52 weeks, unique and ascending', () => {
        assert.deepEqual(validReminders([1440, 60, 60, 524160]), [60, 1440, 524160]);
    });

    it('skips values the rules cannot check (spec 7)', () => {
        assert.deepEqual(validReminders([0, 30, 90, 59.5, -60, 524220, '60', null]), []);
        assert.deepEqual(validReminders(undefined), []);
    });
});

describe('dueInstantMs and taskEvents', () => {
    it('reads due.local in due.tz', () => {
        assert.equal(dueInstantMs(plain()), DUE);
    });

    it('gives no due moment for a missing, malformed or unknown-zone due', () => {
        assert.equal(dueInstantMs(plain({ due: null })), null);
        assert.equal(dueInstantMs(plain({ due: { local: '2026-10-15 12:00', tz: 'Europe/Berlin' } })), null);
        assert.equal(dueInstantMs(plain({ due: { local: '2026-10-15T12:00', tz: 'Mars/Olympus' } })), null);
        assert.equal(dueInstantMs(plain({ due: { local: '2026-02-30T12:00', tz: 'Europe/Berlin' } })), null);
    });

    it('lists reminders and the overdue moment in time order', () => {
        assert.deepEqual(taskEvents(plain()), [
            { type: 'reminder', at: DUE - 1440 * 60000, minutes: 1440 },
            { type: 'reminder', at: DUE - 60 * 60000, minutes: 60 },
            { type: 'overdue', at: DUE },
        ]);
    });

    it('has no events unless the task is active and has a due moment', () => {
        assert.deepEqual(taskEvents(plain({ status: 'done' })), []);
        assert.deepEqual(taskEvents(plain({ status: 'deleted' })), []);
        assert.deepEqual(taskEvents(plain({ due: null, reminders: [] })), []);
    });

    it('accepts every valid contract task fixture', () => {
        for (const { name, value } of taskFixtures.valid) {
            assert.doesNotThrow(() => taskEvents({ ...value, overdueAt: null, nextNotifyAt: null }), name);
        }
    });
});

describe('nextEventAfter', () => {
    it('is the first event strictly after the given moment', () => {
        assert.equal(nextEventAfter(plain(), at('2026-10-14T09:00:00.000Z')), DUE - 1440 * 60000);
        assert.equal(nextEventAfter(plain(), DUE - 60 * 60000), DUE);
        assert.equal(nextEventAfter(plain(), DUE), null);
    });
});

describe('sameSchedule', () => {
    it('ignores key order and fields outside due, reminders, repeat, status', () => {
        const a = plain({ repeat: { every: 1, unit: 'months', monthDay: 15 } });
        const b = plain({ repeat: { monthDay: 15, unit: 'months', every: 1 }, title: 'Other', nextNotifyAt: 1 });
        assert.equal(sameSchedule(a, b), true);
        assert.equal(sameSchedule(a, plain({ reminders: [60] })), false);
    });
});

describe('planTaskWrite (onTaskWritten)', () => {
    const NOW = at('2026-10-14T08:00:00.000Z'); // before both reminders

    it('schedules a new task at its earliest future event', () => {
        assert.deepEqual(planTaskWrite(null, plain(), NOW), { nextNotifyAt: DUE - 1440 * 60000 });
    });

    it('marks a new task with a past due overdue without scheduling anything', () => {
        const later = DUE + 60000;
        assert.deepEqual(planTaskWrite(null, plain(), later), { overdueAt: later });
    });

    it('does nothing when only server fields or other fields changed', () => {
        assert.equal(planTaskWrite(plain(), plain({ nextNotifyAt: 123, title: 'New title', pulseMuted: true }), NOW), null);
    });

    it('a due change unmutes the pulse and clears overdue when the new due is ahead', () => {
        const before = plain({ due: { local: '2026-10-10T12:00', tz: 'Europe/Berlin' }, overdueAt: 1, pulseMuted: true });
        const after = { ...before, due: plain().due };
        assert.deepEqual(planTaskWrite(before, after, NOW), { pulseMuted: false, overdueAt: null, nextNotifyAt: DUE - 1440 * 60000 });
    });

    it('a due moved into the past keeps an existing overdue mark', () => {
        const before = plain({ overdueAt: 1 });
        const after = { ...before, due: { local: '2026-10-01T12:00', tz: 'Europe/Berlin' } };
        assert.deepEqual(planTaskWrite(before, after, NOW), {});
    });

    it('restoring a task whose due passed marks it overdue silently', () => {
        const before = plain({ status: 'done' });
        const now = DUE + 60000;
        assert.deepEqual(planTaskWrite(before, plain(), now), { overdueAt: now });
    });

    it('a task leaving active loses its nextNotifyAt', () => {
        const before = plain({ nextNotifyAt: DUE - 60 * 60000 });
        assert.deepEqual(planTaskWrite(before, { ...before, status: 'done' }, NOW), { nextNotifyAt: null });
    });
});

describe('planSchedulerRun (scheduleNotifications)', () => {
    it('sends the reminder whose moment is in [nextNotifyAt, now]', () => {
        const task = plain({ nextNotifyAt: DUE - 60 * 60000 });
        assert.deepEqual(planSchedulerRun(task, DUE - 60 * 60000 + 30000), { reminder: 60, overdue: false, nextNotifyAt: DUE });
    });

    it('sends only the latest of several reminders that fell into the window', () => {
        const task = plain({ nextNotifyAt: DUE - 1440 * 60000 });
        assert.deepEqual(planSchedulerRun(task, DUE - 30 * 60000), { reminder: 60, overdue: false, nextNotifyAt: DUE });
    });

    it('sends overdue instead of a stale reminder once the due moment passed', () => {
        const task = plain({ nextNotifyAt: DUE - 60 * 60000 });
        assert.deepEqual(planSchedulerRun(task, DUE + 5 * 60000), { reminder: null, overdue: true, nextNotifyAt: null });
    });

    it('does not send overdue twice', () => {
        const task = plain({ nextNotifyAt: DUE, overdueAt: DUE });
        assert.deepEqual(planSchedulerRun(task, DUE + 60000), { reminder: null, overdue: false, nextNotifyAt: null });
    });

    it('ignores events before nextNotifyAt (they were handled or deliberately skipped)', () => {
        const task = plain({ nextNotifyAt: DUE });
        assert.deepEqual(planSchedulerRun(task, DUE + 60000), { reminder: null, overdue: true, nextNotifyAt: null });
    });

    it('clears nextNotifyAt of a task that is no longer active', () => {
        const task = plain({ status: 'done', nextNotifyAt: DUE });
        assert.deepEqual(planSchedulerRun(task, DUE + 60000), { reminder: null, overdue: false, nextNotifyAt: null });
    });
});

describe('dedup keys', () => {
    const due = { local: '2026-10-15T12:00', tz: 'Europe/Berlin' };

    it('follow spec 6', () => {
        assert.equal(reminderKey('alice', 't1', 60, due), 'reminder:alice:t1:60:2026-10-15T12:00@Europe/Berlin');
        assert.equal(overdueKey('alice', 't1', due), 'overdue:alice:t1:2026-10-15T12:00@Europe/Berlin');
    });

    it('become valid Firestore ids', () => {
        assert.equal(notificationDocId(overdueKey('alice', 't1', due)), 'overdue:alice:t1:2026-10-15T12:00@Europe%2FBerlin');
        assert.equal(notificationDocId('a/b/c').includes('/'), false);
    });
});
