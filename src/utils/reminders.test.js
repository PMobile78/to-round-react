import { describe, expect, it } from 'vitest';
import i18next from 'i18next';
import en from '../locales/en/translation.json';
import uk from '../locales/uk/translation.json';
import { REMINDER_PRESETS, reminderMinutes, reminderParts, withReminder } from './reminders';

describe('reminderParts: a reminder in its largest whole unit', () => {
    it('shows whole weeks as weeks, whole days as days and the rest as hours', () => {
        expect(reminderParts(60)).toEqual({ count: 1, unit: 'hours' });
        expect(reminderParts(1500)).toEqual({ count: 25, unit: 'hours' });
        expect(reminderParts(2880)).toEqual({ count: 2, unit: 'days' });
        expect(reminderParts(10080)).toEqual({ count: 1, unit: 'weeks' });
        expect(reminderParts(524160)).toEqual({ count: 52, unit: 'weeks' });
    });
});

describe('reminderMinutes: a number of hours, days or weeks before the due', () => {
    it('gives the minutes of a whole number of units', () => {
        expect(reminderMinutes('3', 'hours')).toBe(180);
        expect(reminderMinutes(2, 'days')).toBe(2880);
        expect(reminderMinutes('52', 'weeks')).toBe(524160);
    });

    it('gives nothing for a number that is not whole, below 1 or beyond 52 weeks', () => {
        expect(reminderMinutes('1.5', 'hours')).toBe(null);
        expect(reminderMinutes('0', 'days')).toBe(null);
        expect(reminderMinutes('', 'days')).toBe(null);
        expect(reminderMinutes('53', 'weeks')).toBe(null);
        expect(reminderMinutes('8737', 'hours')).toBe(null);
    });
});

describe('withReminder: one more reminder in the list', () => {
    it('keeps the list sorted and without repeats', () => {
        expect(withReminder([60, 10080], 1440)).toEqual([60, 1440, 10080]);
        expect(withReminder([60, 1440], 1440)).toEqual([60, 1440]);
    });

    it('adds nothing to a list of 10', () => {
        const ten = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((h) => h * 60);
        expect(withReminder(ten, 1440)).toBe(ten);
    });

    it('offers 1 hour and 1 day as ready-made reminders', () => {
        expect(REMINDER_PRESETS).toEqual([60, 1440]);
    });
});

describe('reminder labels: the number agrees with its unit', () => {
    const labelsIn = async (lng) => {
        const i18n = i18next.createInstance();
        await i18n.init({ lng, resources: { en: { translation: en }, uk: { translation: uk } } });
        return i18n.getFixedT(lng);
    };

    it('in Ukrainian', async () => {
        const t = await labelsIn('uk');
        expect([1, 2, 5, 21].map((count) => t('bubbles.reminderBefore.hours', { count })))
            .toEqual(['За 1 годину', 'За 2 години', 'За 5 годин', 'За 21 годину']);
        expect(t('bubbles.reminderBefore.days', { count: 3 })).toBe('За 3 дні');
        expect(t('bubbles.reminderBefore.weeks', { count: 52 })).toBe('За 52 тижні');
    });

    it('in English', async () => {
        const t = await labelsIn('en');
        expect(t('bubbles.reminderBefore.hours', { count: 1 })).toBe('1 hour before');
        expect(t('bubbles.reminderBefore.days', { count: 2 })).toBe('2 days before');
        expect(t('bubbles.reminderBefore.weeks', { count: 52 })).toBe('52 weeks before');
    });
});
