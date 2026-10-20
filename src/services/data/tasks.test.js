import { describe, expect, it } from 'vitest';
import { completeTask, completionChanges } from './tasks';

const task = (overrides) => ({
    id: 't1',
    title: 'Water plants',
    description: '',
    categoryId: null,
    status: 'active',
    due: { local: '2026-10-10T09:00', tz: 'Europe/Berlin' },
    reminders: [60],
    repeat: null,
    radius: 45,
    pulseMuted: false,
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
    deletedAt: null,
    ...overrides,
});
const NOW = new Date('2026-10-14T10:00:00.000Z');

describe('completionChanges ("Done", spec 4.1)', () => {
    it('finishes a one-off task and keeps its due, reminders and repeat as history', () => {
        expect(completionChanges(task(), NOW)).toEqual({ status: 'done' });
    });

    it('moves a repeating task to its first due after now and keeps it active', () => {
        expect(completionChanges(task({ repeat: { every: 1, unit: 'days' } }), NOW))
            .toEqual({ due: { local: '2026-10-15T09:00', tz: 'Europe/Berlin' } });
    });

    it('keeps the zone and the day of month of a monthly task', () => {
        const monthly = task({
            due: { local: '2026-01-31T09:00', tz: 'America/New_York' },
            repeat: { every: 1, unit: 'months', monthDay: 31 },
        });
        expect(completionChanges(monthly, new Date('2026-02-01T00:00:00.000Z')))
            .toEqual({ due: { local: '2026-02-28T09:00', tz: 'America/New_York' } });
    });

    it('lets a muted repeating task pulse again at its next due', () => {
        expect(completionChanges(task({ repeat: { every: 1, unit: 'weeks' }, pulseMuted: true }), NOW))
            .toEqual({ due: { local: '2026-10-17T09:00', tz: 'Europe/Berlin' }, pulseMuted: false });
    });
});

describe('completeTask', () => {
    it('rejects instead of throwing when the next due of a repeating task cannot be found', async () => {
        const unreadable = task({ due: { local: '2026-02-30T09:00', tz: 'Europe/Berlin' }, repeat: { every: 1, unit: 'days' } });
        let done;
        expect(() => { done = completeTask({}, 'u1', unreadable, NOW); }).not.toThrow();
        await expect(done).rejects.toThrow('Invalid local date-time: 2026-02-30T09:00');
    });
});
