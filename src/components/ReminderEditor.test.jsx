// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ReminderEditor from './ReminderEditor';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// The plural keys of i18next: the test shows the key with its count.
const t = (key, options) => (options && 'count' in options ? `${key}:${options.count}` : key);
const DUE = new Date('2026-10-15T09:00:00.000Z');

describe('ReminderEditor: reminders of a task in hours, days and weeks (spec 3.1)', () => {
    let container;
    let root;
    let onChange;

    const render = ({ reminders = [], due = DUE } = {}) => act(() => root.render(
        <ReminderEditor reminders={reminders} onChange={onChange} due={due} t={t} />
    ));
    const button = (text) => Array.from(document.querySelectorAll('button')).find((el) => el.textContent === text);
    const pick = (value) => act(() => document.querySelector(`input[type="radio"][value="${value}"]`).click());
    const typeCount = (value) => {
        const input = document.querySelector('input[type="number"]');
        const setNativeValue = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        act(() => {
            setNativeValue.call(input, value);
            input.dispatchEvent(new window.Event('input', { bubbles: true }));
        });
    };

    beforeEach(() => {
        onChange = vi.fn();
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
    });

    it('lists the reminders in their largest whole units', () => {
        render({ reminders: [60, 2880, 20160] });
        expect(Array.from(container.querySelectorAll('li'), (li) => li.textContent)).toEqual([
            'bubbles.reminderBefore.hours:1',
            'bubbles.reminderBefore.days:2',
            'bubbles.reminderBefore.weeks:2',
        ]);
    });

    it('adds 1 hour or 1 day before the due', () => {
        render({ reminders: [60] });
        act(() => button('bubbles.remindMe').click());
        pick('1440');
        act(() => button('bubbles.save').click());
        expect(onChange).toHaveBeenCalledWith([60, 1440]);
    });

    it("adds a number of hours, days or weeks of the user's own", () => {
        render({ reminders: [60] });
        act(() => button('bubbles.remindMe').click());
        pick('custom');
        typeCount('3');
        pick('weeks');
        act(() => button('bubbles.save').click());
        expect(onChange).toHaveBeenCalledWith([60, 30240]);
    });

    it('does not take a reminder that is not a whole number of units or longer than 52 weeks', () => {
        render();
        act(() => button('bubbles.remindMe').click());
        pick('custom');
        typeCount('53');
        pick('weeks');
        expect(button('bubbles.save').disabled).toBe(true);
        typeCount('1.5');
        pick('hours');
        expect(button('bubbles.save').disabled).toBe(true);
    });

    it('removes a reminder', () => {
        render({ reminders: [60, 1440] });
        act(() => container.querySelectorAll('button[aria-label="delete"]')[1].click());
        expect(onChange).toHaveBeenCalledWith([60]);
    });

    it('takes no reminders without a due and no more than 10', () => {
        render({ due: null });
        expect(button('bubbles.remindMe').disabled).toBe(true);
        render({ reminders: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((h) => h * 60) });
        expect(button('bubbles.remindMe').disabled).toBe(true);
    });
});
