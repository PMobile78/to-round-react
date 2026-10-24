// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TaskActionButtons from './TaskActionButtons';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const t = (key) => key;
const ONE_OFF = { id: 'a1', status: 'active', repeat: null };
const REPEATING = { id: 'a2', status: 'active', repeat: { every: 1, unit: 'days' } };

describe('TaskActionButtons: what the list actions say about themselves', () => {
    let container;
    let root;

    const render = (task) => act(() => root.render(
        <TaskActionButtons
            task={task}
            t={t}
            onEdit={vi.fn()}
            onMarkDone={vi.fn()}
            onFinishSeries={vi.fn()}
            onDelete={vi.fn()}
            onRestore={vi.fn()}
            onPermanentDelete={vi.fn()}
        />
    ));
    // The button with this icon (MUI names the icon's svg `${icon}Icon`)
    const button = (icon) => container.querySelector(`[data-testid="${icon}Icon"]`)?.closest('button') ?? null;
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
        vi.useFakeTimers();
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
        vi.useRealTimers();
    });

    it('says on "Done" of a one-off task that it goes to the completed ones', () => {
        render(ONE_OFF);
        expect(longPressHint(button('CheckCircle'))).toBe('bubbles.markAsDone\nbubbles.markAsDoneHint');
        expect(button('DoneAll')).toBeNull();
    });

    it('says on "Done" of a repeating task that its due moves on, and on "Finish series" that the repeats end', () => {
        render(REPEATING);
        expect(longPressHint(button('CheckCircle'))).toBe('bubbles.markAsDone\nbubbles.markAsDoneRepeatHint');
        expect(longPressHint(button('DoneAll'))).toBe('bubbles.finishSeries\nbubbles.finishSeriesHint');
    });

    it('shows just the name of the other actions', () => {
        render(ONE_OFF);
        expect(longPressHint(button('Edit'))).toBe('bubbles.editBubble');
        expect(longPressHint(button('DeleteOutlined'))).toBe('bubbles.deleteBubble');
    });

    it('names each button by its action alone, the hint aside', () => {
        render(REPEATING);
        expect(['Edit', 'CheckCircle', 'DoneAll', 'DeleteOutlined'].map((icon) => button(icon).getAttribute('aria-label')))
            .toEqual(['bubbles.editBubble', 'bubbles.markAsDone', 'bubbles.finishSeries', 'bubbles.deleteBubble']);
    });
});
