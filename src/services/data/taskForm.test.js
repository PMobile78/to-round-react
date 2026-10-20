import { describe, expect, it } from 'vitest';
import { bubbleFromTask } from './bubbleModel';
import { dueForPicker, taskChangesFromForm, taskFieldsFromForm } from './taskForm';

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

// The edit dialog of a bubble on a device in Berlin, as it opens: the values the user sees.
const bubbleOf = (overrides) => bubbleFromTask(task(overrides), BERLIN);
const formOf = (bubble, overrides) => ({
    title: bubble.title,
    description: bubble.description,
    categoryId: bubble.categoryId,
    radius: bubble.radius,
    due: dueForPicker(bubble),
    reminders: bubble.reminders,
    repeat: bubble.repeat,
    ...overrides,
});

describe('dueForPicker: what the date picker shows', () => {
    it('shows the moment of the due, or nothing without a due', () => {
        expect(dueForPicker(bubbleOf())).toEqual(new Date('2026-10-15T06:00:00.000Z'));
        expect(dueForPicker(bubbleOf({ due: null, reminders: [] }))).toBe(null);
    });
});

describe('taskFieldsFromForm: a new task from the create dialog', () => {
    const form = (overrides) => ({
        title: 'Pay bills',
        description: '',
        categoryId: '',
        radius: 45,
        due: new Date('2026-10-15T07:30:45.000Z'),
        reminders: [],
        repeat: null,
        ...overrides,
    });

    it('writes the due in the zone of this device, without seconds', () => {
        expect(taskFieldsFromForm(form(), BERLIN)).toEqual({
            title: 'Pay bills', description: '', categoryId: null, radius: 45,
            due: { local: '2026-10-15T09:30', tz: BERLIN }, reminders: [], repeat: null,
        });
    });

    it('trims the title and keeps the description as the editor hands it over', () => {
        expect(taskFieldsFromForm(form({ title: '  Pay bills \n', description: '**bold**\n' }), BERLIN))
            .toMatchObject({ title: 'Pay bills', description: '**bold**\n' });
    });

    it('keeps the category the user picked; none is null', () => {
        expect(taskFieldsFromForm(form({ categoryId: 'c1' }), BERLIN).categoryId).toBe('c1');
        expect(taskFieldsFromForm(form({ categoryId: null }), BERLIN).categoryId).toBe(null);
    });

    it('stores reminders as whole hours from 1 hour to 52 weeks, without repeats, ascending, at most 10', () => {
        expect(taskFieldsFromForm(form({ reminders: [1440, 60, 60, 90, 0, 524220, 120] }), BERLIN).reminders)
            .toEqual([60, 120, 1440]);
        const eleven = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((h) => h * 60);
        expect(taskFieldsFromForm(form({ reminders: eleven }), BERLIN).reminders).toEqual(eleven.slice(0, 10));
    });

    it('stores a repeat every 1 to 999 units', () => {
        expect(taskFieldsFromForm(form({ repeat: { every: 1500, unit: 'days' } }), BERLIN).repeat).toEqual({ every: 999, unit: 'days' });
        expect(taskFieldsFromForm(form({ repeat: { every: 0, unit: 'hours' } }), BERLIN).repeat).toEqual({ every: 1, unit: 'hours' });
    });

    it('keeps weekdays only for a weekly repeat, as sorted ISO days', () => {
        expect(taskFieldsFromForm(form({ repeat: { every: 2, unit: 'weeks', weekdays: [7, 1, 1] } }), BERLIN).repeat)
            .toEqual({ every: 2, unit: 'weeks', weekdays: [1, 7] });
        expect(taskFieldsFromForm(form({ repeat: { every: 1, unit: 'weeks', weekdays: [] } }), BERLIN).repeat)
            .toEqual({ every: 1, unit: 'weeks' });
        expect(taskFieldsFromForm(form({ repeat: { every: 1, unit: 'days', weekdays: [1] } }), BERLIN).repeat)
            .toEqual({ every: 1, unit: 'days' });
    });

    it('takes the month day of a monthly repeat from the due', () => {
        expect(taskFieldsFromForm(form({ repeat: { every: 1, unit: 'months' } }), BERLIN).repeat)
            .toEqual({ every: 1, unit: 'months', monthDay: 15 });
    });

    it('drops reminders and the repeat without a due', () => {
        const fields = taskFieldsFromForm(form({ due: null, reminders: [60], repeat: { every: 1, unit: 'days' } }), BERLIN);
        expect(fields).toMatchObject({ due: null, reminders: [], repeat: null });
    });
});

describe('taskChangesFromForm: only what the user changed in the edit dialog', () => {
    it('writes nothing when nothing changed', () => {
        const bubble = bubbleOf({ repeat: { every: 1, unit: 'weeks', weekdays: [1, 7] }, reminders: [60, 1440] });
        expect(taskChangesFromForm(bubble, formOf(bubble), BERLIN)).toEqual({});
    });

    it('writes only the fields that changed', () => {
        const bubble = bubbleOf();
        expect(taskChangesFromForm(bubble, formOf(bubble, { title: 'Pay all bills', categoryId: '' }), BERLIN))
            .toEqual({ title: 'Pay all bills', categoryId: null });
    });

    it('keeps the due and its zone when the user did not change the time on a device in another zone', () => {
        const bubble = bubbleOf();
        expect(taskChangesFromForm(bubble, formOf(bubble, { radius: 60 }), BERLIN)).toEqual({ radius: 60 });
    });

    it('keeps a due in a zone this browser does not know when the user did not change the time', () => {
        const bubble = bubbleOf({ due: { local: '2026-10-15T09:00', tz: 'Mars/Olympus' } });
        expect(taskChangesFromForm(bubble, formOf(bubble, { title: 'Pay all bills' }), BERLIN))
            .toEqual({ title: 'Pay all bills' });
    });

    it('writes a changed due in the zone of this device and lets a muted task pulse again', () => {
        const bubble = bubbleOf({ pulseMuted: true });
        expect(taskChangesFromForm(bubble, formOf(bubble, { due: new Date('2026-10-16T07:00:00.000Z') }), BERLIN))
            .toEqual({ due: { local: '2026-10-16T09:00', tz: BERLIN }, pulseMuted: false });
    });

    it('clears the reminders and the repeat together with the due', () => {
        const bubble = bubbleOf({ repeat: { every: 1, unit: 'days' } });
        expect(taskChangesFromForm(bubble, formOf(bubble, { due: null }), BERLIN))
            .toEqual({ due: null, reminders: [], repeat: null });
    });

    it('keeps the month day of a monthly task that "Done" moved into a shorter month', () => {
        const bubble = bubbleOf({ due: { local: '2026-02-28T09:00', tz: BERLIN }, repeat: { every: 1, unit: 'months', monthDay: 31 } });
        expect(taskChangesFromForm(bubble, formOf(bubble, { title: 'Rent' }), BERLIN)).toEqual({ title: 'Rent' });
        expect(taskChangesFromForm(bubble, formOf(bubble, { repeat: { every: 2, unit: 'months' } }), BERLIN))
            .toEqual({ repeat: { every: 2, unit: 'months', monthDay: 31 } });
    });

    it('takes the month day from the new due when the due changes', () => {
        const bubble = bubbleOf({ due: { local: '2026-02-28T09:00', tz: BERLIN }, repeat: { every: 1, unit: 'months', monthDay: 31 } });
        expect(taskChangesFromForm(bubble, formOf(bubble, { due: new Date('2026-03-15T08:00:00.000Z') }), BERLIN)).toEqual({
            due: { local: '2026-03-15T09:00', tz: BERLIN },
            repeat: { every: 1, unit: 'months', monthDay: 15 },
        });
    });

    it('takes the month day from the due when the repeat becomes monthly', () => {
        const bubble = bubbleOf({ due: { local: '2026-01-31T09:00', tz: BERLIN }, repeat: { every: 1, unit: 'days' } });
        expect(taskChangesFromForm(bubble, formOf(bubble, { repeat: { every: 1, unit: 'months' } }), BERLIN))
            .toEqual({ repeat: { every: 1, unit: 'months', monthDay: 31 } });
    });
});
