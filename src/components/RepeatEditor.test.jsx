// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RepeatEditor from './RepeatEditor';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const t = (key) => key;

describe('RepeatEditor: every 1-999 hours, days, weeks or months (spec 3.1)', () => {
    let container;
    let root;
    let onChange;

    const render = (value, { disabled = false } = {}) => act(() => root.render(
        <RepeatEditor value={value} onChange={onChange} t={t} disabled={disabled} />
    ));
    const switchInput = () => container.querySelector('input[type="checkbox"]');
    const typeEvery = (value) => {
        const input = container.querySelector('input[type="number"]');
        const setNativeValue = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        act(() => {
            setNativeValue.call(input, value);
            input.dispatchEvent(new window.Event('input', { bubbles: true }));
        });
    };
    const openUnits = () => act(() => {
        container.querySelector('[role="combobox"]').dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true }));
    });
    const options = () => Array.from(document.querySelectorAll('[role="option"]'));
    const dayButtons = () => Array.from(container.querySelectorAll('button'));
    const day = (key) => dayButtons().find((el) => el.textContent === `bubbles.weekDays.${key}`);

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

    it('turns the repeat on as every 1 day, and off', () => {
        render(null);
        act(() => switchInput().click());
        expect(onChange).toHaveBeenLastCalledWith({ every: 1, unit: 'days' });
        render({ every: 2, unit: 'days' });
        act(() => switchInput().click());
        expect(onChange).toHaveBeenLastCalledWith(null);
    });

    it('takes how often as a whole number from 1 to 999', () => {
        render({ every: 1, unit: 'days' });
        typeEvery('3');
        expect(onChange).toHaveBeenLastCalledWith({ every: 3, unit: 'days' });
        onChange.mockClear();
        typeEvery('0');
        typeEvery('1000');
        typeEvery('2.5');
        typeEvery('');
        expect(onChange).not.toHaveBeenCalled();
    });

    it('offers hours, days, weeks and months', () => {
        render({ every: 1, unit: 'days' });
        openUnits();
        expect(options().map((o) => o.getAttribute('data-value'))).toEqual(['hours', 'days', 'weeks', 'months']);
        act(() => options()[3].click());
        expect(onChange).toHaveBeenLastCalledWith({ every: 1, unit: 'months' });
    });

    it('picks ISO weekdays for a weekly repeat, Monday first', () => {
        render({ every: 1, unit: 'weeks', weekdays: [7] });
        expect(dayButtons().map((b) => b.textContent)).toEqual(
            ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((key) => `bubbles.weekDays.${key}`),
        );
        act(() => day('monday').click());
        expect(onChange).toHaveBeenLastCalledWith({ every: 1, unit: 'weeks', weekdays: [1, 7] });
        act(() => day('sunday').click());
        expect(onChange).toHaveBeenLastCalledWith({ every: 1, unit: 'weeks', weekdays: [] });
    });

    it('is off and locked without a due', () => {
        render({ every: 1, unit: 'days' }, { disabled: true });
        expect(switchInput().checked).toBe(false);
        expect(switchInput().disabled).toBe(true);
    });
});
