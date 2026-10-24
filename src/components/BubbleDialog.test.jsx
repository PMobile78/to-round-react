// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import en from '../locales/en/translation.json';
import uk from '../locales/uk/translation.json';
import BubbleDialog from './BubbleDialog';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../i18n', () => ({ default: { language: 'en' } }));

const HOUR = 60 * 60 * 1000;
const t = (key, options) => (options && 'count' in options ? `${key}:${options.count}` : key);

describe('BubbleDialog: the edit dialog on the v2 form', () => {
    let container;
    let root;
    let props;

    const render = (overrides = {}) => {
        props = {
            mode: 'edit',
            open: true,
            onClose: vi.fn(),
            t,
            isSmallScreen: false,
            isMobile: false,
            getDialogPaperStyles: () => ({}),
            initialTitle: 'Pay bills',
            initialDescription: '',
            editDue: null,
            setEditDue: vi.fn(),
            editReminders: [],
            setEditReminders: vi.fn(),
            editRepeat: null,
            setEditRepeat: vi.fn(),
            editBubbleSize: 45,
            setEditBubbleSize: vi.fn(),
            tags: [],
            selectedTagId: '',
            setSelectedTagId: vi.fn(),
            handleDeleteBubble: vi.fn(),
            handleMarkAsDone: vi.fn(),
            handleSaveBubble: vi.fn(),
            onStopPulsing: vi.fn(),
            showStopPulsing: false,
            handleFinishSeries: vi.fn(),
            showFinishSeries: false,
            ...overrides,
        };
        act(() => root.render(<BubbleDialog {...props} />));
    };
    const button = (text) => Array.from(document.querySelectorAll('button')).find((el) => el.textContent === text);
    const buttons = (text) => Array.from(document.querySelectorAll('button')).filter((el) => el.textContent === text);
    // What a long press shows by the element, as on a phone: the text the opened hint describes it with
    const longPressHint = (element) => {
        act(() => {
            element.dispatchEvent(new window.Event('touchstart', { bubbles: true }));
            vi.advanceTimersByTime(1000);
        });
        const id = element.getAttribute('aria-describedby');
        return id ? document.getElementById(id).textContent : null;
    };

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
        vi.useRealTimers();
    });

    it('takes a title of at most 1000 characters', () => {
        render();
        expect(document.querySelector('textarea[maxlength="1000"]')).not.toBeNull();
    });

    it('does not save a description longer than 100 000 characters and says why', () => {
        render({ initialDescription: 'a'.repeat(100001) });
        expect(document.body.textContent).toContain('bubbles.descriptionTooLong');
        expect(button('bubbles.save').disabled).toBe(true);
    });

    it('does not save a due the picker cannot read as a date (02/31)', () => {
        render({ editDue: new Date(NaN) });
        expect(button('bubbles.save').disabled).toBe(true);
    });

    it('marks a due that has passed as overdue', () => {
        render({ editDue: new Date(Date.now() - HOUR) });
        expect(document.body.textContent).toContain('bubbles.overdue');
    });

    it('offers reminders and a repeat only once there is a due', () => {
        render();
        expect(button('bubbles.remindMe').disabled).toBe(true);
        expect(document.querySelector('input[type="checkbox"]').disabled).toBe(true);
        render({ editDue: new Date(Date.now() + HOUR) });
        expect(button('bubbles.remindMe').disabled).toBe(false);
        expect(document.querySelector('input[type="checkbox"]').disabled).toBe(false);
    });

    it('offers "Finish series" next to "Done" only when asked to (a repeating task)', () => {
        render();
        expect(button('bubbles.finishSeries')).toBeUndefined();
        render({ showFinishSeries: true });
        act(() => button('bubbles.finishSeries').click());
        expect(props.handleFinishSeries).toHaveBeenCalledTimes(1);
    });

    it('says on "Done" of a one-off task that it goes to the completed ones', () => {
        vi.useFakeTimers();
        render();
        expect(longPressHint(button('bubbles.markAsDone'))).toBe('bubbles.markAsDoneHint');
    });

    it('says on "Done" of a repeating task that its due moves on, and on "Finish series" that the repeats end', () => {
        vi.useFakeTimers();
        render({ showFinishSeries: true });
        expect(longPressHint(button('bubbles.markAsDone'))).toBe('bubbles.markAsDoneRepeatHint');
        expect(longPressHint(button('bubbles.finishSeries'))).toBe('bubbles.finishSeriesHint');
    });

    it('says under the buttons of a repeating task, without a long press, how "Done" and "Finish series" differ', () => {
        render();
        expect(document.body.textContent).not.toContain('bubbles.repeatActionsHint');
        render({ showFinishSeries: true });
        expect(document.body.textContent).toContain('bubbles.repeatActionsHint');
    });

    it('has one "Stop pulsing", by the due on a wide screen and among the actions on a phone; it says only the pulsing stops', () => {
        vi.useFakeTimers();
        [
            { isMobile: false, isSmallScreen: false, place: '.MuiDialogContent-root' },
            { isMobile: true, isSmallScreen: false, place: '.MuiDialogActions-root' },
            { isMobile: true, isSmallScreen: true, place: '.MuiDialogActions-root' },
        ].forEach(({ place, ...screen }) => {
            render({ showStopPulsing: true, ...screen });
            const stopPulsing = buttons('bubbles.stopPulsing');
            expect(stopPulsing).toHaveLength(1);
            expect(stopPulsing[0].closest(place)).not.toBeNull();
            expect(longPressHint(stopPulsing[0])).toBe('bubbles.stopPulsingHint');
            act(() => stopPulsing[0].click());
            expect(props.onStopPulsing).toHaveBeenCalledTimes(1);
        });
    });

    it('has the hints in English and Ukrainian; the line names the buttons by their labels', () => {
        [en, uk].forEach(({ bubbles }) => {
            ['markAsDoneHint', 'markAsDoneRepeatHint', 'finishSeriesHint', 'stopPulsingHint', 'repeatActionsHint']
                .forEach((key) => expect(bubbles[key]).toMatch(/\S/));
            expect(bubbles.repeatActionsHint).toContain(bubbles.markAsDone);
            expect(bubbles.repeatActionsHint).toContain(bubbles.finishSeries);
        });
    });

    it('clears the reminders and the repeat together with the due', () => {
        render({ editDue: new Date(Date.now() + HOUR), editReminders: [60], editRepeat: { every: 1, unit: 'days' } });
        act(() => document.querySelector('[data-testid="ClearIcon"]').closest('button').click());
        expect(props.setEditDue).toHaveBeenCalledWith(null);
        expect(props.setEditReminders).toHaveBeenCalledWith([]);
        expect(props.setEditRepeat).toHaveBeenCalledWith(null);
    });
});
