import { describe, expect, it } from 'vitest';
import { bubbleFromTask, withTaskChanges } from './bubbleModel';

const BERLIN = 'Europe/Berlin';

const task = (overrides) => ({
    id: 't1',
    title: 'Pay bills',
    description: '- [ ] power',
    categoryId: 'c1',
    status: 'active',
    due: { local: '2026-10-15T09:00', tz: 'Europe/Kyiv' },
    reminders: [60],
    repeat: null,
    radius: 45,
    pulseMuted: false,
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
    deletedAt: null,
    ...overrides,
});

describe('bubbleFromTask: a v2 task as the bubble the app shows', () => {
    it('is the task with its category as tagId and the moment of its due as dueAt', () => {
        // 09:00 in Kyiv (UTC+3 in October).
        expect(bubbleFromTask(task({ pulseMuted: true }), BERLIN))
            .toEqual({ ...task({ pulseMuted: true }), tagId: 'c1', dueAt: Date.parse('2026-10-15T06:00:00.000Z') });
    });

    it('reads a due in a zone this browser does not know as written in the zone of this device', () => {
        // 09:00 in Berlin (UTC+2 in October).
        expect(bubbleFromTask(task({ due: { local: '2026-10-15T09:00', tz: 'Mars/Olympus' } }), BERLIN).dueAt)
            .toBe(Date.parse('2026-10-15T07:00:00.000Z'));
    });

    it('has no moment of the due without a due or with a date that does not exist', () => {
        expect(bubbleFromTask(task({ due: null, reminders: [] }), BERLIN).dueAt).toBe(null);
        expect(bubbleFromTask(task({ due: { local: '2026-02-30T09:00', tz: BERLIN } }), BERLIN).dueAt).toBe(null);
    });
});

describe('withTaskChanges: a local write shown before the server confirms it', () => {
    it('applies the changes, recomputes tagId and dueAt and keeps the Matter body', () => {
        const body = { id: 7 };
        const next = withTaskChanges({ ...bubbleFromTask(task(), BERLIN), body }, { categoryId: null, due: null, reminders: [] }, BERLIN);
        expect(next).toMatchObject({ categoryId: null, tagId: null, due: null, dueAt: null, reminders: [] });
        expect(next.body).toBe(body);
    });
});
