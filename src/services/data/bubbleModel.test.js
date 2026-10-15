// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { toInstant } from '../../contract/time';
import { bubbleFromTask, taskChangesFromForm, taskFieldsFromForm, withTaskChanges } from './bubbleModel';

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

// What the edit dialog on a device in Berlin hands back when the user changed nothing.
const formOf = (bubble, overrides) => ({
    title: bubble.title,
    description: bubble.description,
    useRichText: false,
    tagId: bubble.tagId,
    radius: bubble.radius,
    dueDate: bubble.dueDate ? toInstant(bubble.dueDate.slice(0, 16), BERLIN) : null,
    notifications: bubble.notifications,
    recurrence: bubble.recurrence,
    ...overrides,
});

describe('bubbleFromTask: a v2 task as the bubble the old editors understand', () => {
    it('keeps the v2 fields and adds the old names', () => {
        const bubble = bubbleFromTask(task({ pulseMuted: true }), BERLIN);
        expect(bubble).toMatchObject({ ...task({ pulseMuted: true }), tagId: 'c1', overduePulseSuppressed: true, useRichText: false });
    });

    it('shows the due in the time of this device', () => {
        // 09:00 in Kyiv (UTC+3 in October) is 08:00 in Berlin (UTC+2).
        expect(bubbleFromTask(task(), BERLIN).dueDate).toBe('2026-10-15T08:00:00');
    });

    it('shows a due in a zone this browser does not know as written', () => {
        expect(bubbleFromTask(task({ due: { local: '2026-10-15T09:00', tz: 'Mars/Olympus' } }), BERLIN).dueDate)
            .toBe('2026-10-15T09:00:00');
    });

    it('has no due, reminders or repeat for a task without a due', () => {
        expect(bubbleFromTask(task({ due: null, reminders: [] }), BERLIN))
            .toMatchObject({ dueDate: null, notifications: [], recurrence: null });
    });

    it('lists reminders the way the old editor shows them', () => {
        expect(bubbleFromTask(task({ reminders: [60, 120, 1440, 2880, 10080, 20160] }), BERLIN).notifications).toEqual([
            '1h',
            { type: 'custom', value: 2, unit: 'hours' },
            '1d',
            { type: 'custom', value: 2, unit: 'days' },
            { type: 'custom', value: 1, unit: 'weeks' },
            { type: 'custom', value: 2, unit: 'weeks' },
        ]);
    });

    it('turns ISO weekdays into the old editor\'s (Sunday is 0) and drops the month day', () => {
        expect(bubbleFromTask(task({ repeat: { every: 1, unit: 'weeks', weekdays: [1, 7] } }), BERLIN).recurrence)
            .toEqual({ every: 1, unit: 'weeks', weekDays: [1, 0] });
        expect(bubbleFromTask(task({ repeat: { every: 2, unit: 'months', monthDay: 15 } }), BERLIN).recurrence)
            .toEqual({ every: 2, unit: 'months' });
    });
});

describe('withTaskChanges: a local write shown before the server confirms it', () => {
    it('applies the changes, recomputes the old names and keeps the Matter body', () => {
        const body = { id: 7 };
        const next = withTaskChanges({ ...bubbleFromTask(task(), BERLIN), body }, { categoryId: null, reminders: [1440] }, BERLIN);
        expect(next).toMatchObject({ categoryId: null, tagId: null, reminders: [1440], notifications: ['1d'] });
        expect(next.body).toBe(body);
    });
});

describe('taskFieldsFromForm: a new task from the create dialog', () => {
    const form = (overrides) => ({
        title: 'Pay bills',
        description: '',
        useRichText: false,
        tagId: '',
        radius: 45,
        dueDate: new Date('2026-10-15T07:30:45.000Z'),
        notifications: [],
        recurrence: null,
        ...overrides,
    });

    it('writes the due in the zone of this device, without seconds', () => {
        expect(taskFieldsFromForm(form(), BERLIN)).toEqual({
            title: 'Pay bills', description: '', categoryId: null, radius: 45,
            due: { local: '2026-10-15T09:30', tz: BERLIN }, reminders: [], repeat: null,
        });
    });

    it('rounds reminders in minutes up to whole hours, as the migration does', () => {
        const notifications = ['5m', '1h', { type: 'custom', value: 90, unit: 'minutes' }, '1d'];
        expect(taskFieldsFromForm(form({ notifications }), BERLIN).reminders).toEqual([60, 120, 1440]);
    });

    it('turns a repeat in minutes into hours and takes the month day from the due', () => {
        expect(taskFieldsFromForm(form({ recurrence: { every: 30, unit: 'minutes' } }), BERLIN).repeat)
            .toEqual({ every: 1, unit: 'hours' });
        expect(taskFieldsFromForm(form({ recurrence: { every: 1, unit: 'months' } }), BERLIN).repeat)
            .toEqual({ every: 1, unit: 'months', monthDay: 15 });
    });

    it('drops reminders and repeat without a due', () => {
        const fields = taskFieldsFromForm(form({ dueDate: null, notifications: ['1h'], recurrence: { every: 1, unit: 'days' } }), BERLIN);
        expect(fields).toMatchObject({ due: null, reminders: [], repeat: null });
    });

    it('stores the description as Markdown: plain text as typed, rich text converted', () => {
        expect(taskFieldsFromForm(form({ description: '**bold** text' }), BERLIN).description).toBe('**bold** text');
        expect(taskFieldsFromForm(form({ description: '<p><strong>bold</strong> text</p>', useRichText: true }), BERLIN).description)
            .toBe('**bold** text');
    });

    it('keeps the category the user picked', () => {
        expect(taskFieldsFromForm(form({ tagId: 'c1' }), BERLIN).categoryId).toBe('c1');
    });
});

describe('taskChangesFromForm: only what the user changed in the edit dialog', () => {
    it('writes nothing when nothing changed', () => {
        const bubble = bubbleFromTask(task({ repeat: { every: 1, unit: 'weeks', weekdays: [1, 7] }, reminders: [60, 1440] }), BERLIN);
        expect(taskChangesFromForm(bubble, formOf(bubble), BERLIN)).toEqual({});
    });

    it('writes only the fields that changed', () => {
        const bubble = bubbleFromTask(task(), BERLIN);
        expect(taskChangesFromForm(bubble, formOf(bubble, { title: 'Pay all bills', tagId: '' }), BERLIN))
            .toEqual({ title: 'Pay all bills', categoryId: null });
    });

    it('keeps the due and its zone when the user did not change the time on a device in another zone', () => {
        const bubble = bubbleFromTask(task(), BERLIN);
        expect(taskChangesFromForm(bubble, formOf(bubble, { radius: 60 }), BERLIN)).toEqual({ radius: 60 });
    });

    it('writes a changed due in the zone of this device and lets a muted task pulse again', () => {
        const bubble = bubbleFromTask(task({ pulseMuted: true }), BERLIN);
        expect(taskChangesFromForm(bubble, formOf(bubble, { dueDate: new Date('2026-10-16T07:00:00.000Z') }), BERLIN))
            .toEqual({ due: { local: '2026-10-16T09:00', tz: BERLIN }, pulseMuted: false });
    });

    it('keeps the month day of a monthly task that "Done" moved into a shorter month', () => {
        const bubble = bubbleFromTask(task({
            due: { local: '2026-02-28T09:00', tz: BERLIN },
            repeat: { every: 1, unit: 'months', monthDay: 31 },
        }), BERLIN);
        expect(taskChangesFromForm(bubble, formOf(bubble, { title: 'Rent' }), BERLIN)).toEqual({ title: 'Rent' });
    });

    it('takes the month day from the new due when the due changes', () => {
        const bubble = bubbleFromTask(task({
            due: { local: '2026-02-28T09:00', tz: BERLIN },
            repeat: { every: 1, unit: 'months', monthDay: 31 },
        }), BERLIN);
        const changes = taskChangesFromForm(bubble, formOf(bubble, { dueDate: new Date('2026-03-15T08:00:00.000Z') }), BERLIN);
        expect(changes).toEqual({
            due: { local: '2026-03-15T09:00', tz: BERLIN },
            repeat: { every: 1, unit: 'months', monthDay: 15 },
        });
    });
});
