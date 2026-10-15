const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { handleTaskWritten } = require('../../lib/handlers');
const { db, clearFirestore, at, ts, DUE, task } = require('./helpers');

const ref = () => db.doc('users/alice/tasks/t1');
const NOW = at('2026-10-14T08:00:00.000Z'); // before both reminders of the default task

// Writes `data` as the client would and runs the trigger with the given before-state.
async function write(before, data, now = NOW) {
    await ref().set(data);
    await handleTaskWritten({ db, ref: ref(), before, after: data, now });
    return (await ref().get()).data();
}

beforeEach(async () => {
    await clearFirestore();
});

describe('onTaskWritten', () => {
    it('schedules a new task at its earliest future event', async () => {
        const after = await write(null, task());
        assert.equal(after.nextNotifyAt.toMillis(), at('2026-10-14T10:00:00.000Z'));
        assert.equal(after.overdueAt, null);
    });

    it('marks a task created with a past due as overdue silently, with nothing to schedule', async () => {
        const now = at(DUE) + 60000;
        const after = await write(null, task(), now);
        assert.equal(after.overdueAt.toMillis(), now);
        assert.equal('nextNotifyAt' in after, false);
    });

    it('a new due unmutes the pulse and clears the overdue mark', async () => {
        const before = task({ due: { local: '2026-10-01T12:00', tz: 'Europe/Berlin' }, pulseMuted: true, overdueAt: ts('2026-10-01T10:00:00.000Z') });
        await ref().set(before);
        const after = await write(before, { ...before, due: task().due });
        assert.equal(after.pulseMuted, false);
        assert.equal(after.overdueAt, null);
        assert.equal(after.nextNotifyAt.toMillis(), at('2026-10-14T10:00:00.000Z'));
    });

    it('changes nothing when only the title or server fields changed', async () => {
        const before = task({ nextNotifyAt: ts('2026-10-14T10:00:00.000Z') });
        await ref().set(before);
        const plan = await handleTaskWritten({ db, ref: ref(), before, after: { ...before, title: 'Oat milk' }, now: NOW });
        assert.equal(plan, null);
    });

    it('a finished task loses nextNotifyAt', async () => {
        const before = task({ nextNotifyAt: ts('2026-10-14T10:00:00.000Z') });
        await ref().set(before);
        const after = await write(before, { ...before, status: 'done' });
        assert.equal('nextNotifyAt' in after, false);
    });

    it('plans against the current document when the schedule changed again before the write', async () => {
        const first = task();
        await ref().set({ ...first, reminders: [60] });
        await handleTaskWritten({ db, ref: ref(), before: null, after: first, now: NOW });
        assert.equal((await ref().get()).get('nextNotifyAt').toMillis(), at('2026-10-15T09:00:00.000Z'));
    });

    it('keeps the due change of an event whose write was overtaken by a later one', async () => {
        const s0 = task({ due: { local: '2026-10-01T12:00', tz: 'Europe/Berlin' }, pulseMuted: true, overdueAt: ts('2026-10-01T10:00:00.000Z') });
        const s1 = { ...s0, due: task().due };
        const s2 = { ...s1, reminders: [60] };
        await ref().set(s2);
        await handleTaskWritten({ db, ref: ref(), before: s1, after: s2, now: NOW });
        await handleTaskWritten({ db, ref: ref(), before: s0, after: s1, now: NOW });
        const after = (await ref().get()).data();
        assert.equal(after.overdueAt, null);
        assert.equal(after.pulseMuted, false);
        assert.equal(after.nextNotifyAt.toMillis(), at('2026-10-15T09:00:00.000Z'));
    });
});
