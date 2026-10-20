// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
            ...overrides,
        };
        act(() => root.render(<BubbleDialog {...props} />));
    };
    const button = (text) => Array.from(document.querySelectorAll('button')).find((el) => el.textContent === text);

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
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

    it('clears the reminders and the repeat together with the due', () => {
        render({ editDue: new Date(Date.now() + HOUR), editReminders: [60], editRepeat: { every: 1, unit: 'days' } });
        act(() => document.querySelector('[data-testid="ClearIcon"]').closest('button').click());
        expect(props.setEditDue).toHaveBeenCalledWith(null);
        expect(props.setEditReminders).toHaveBeenCalledWith([]);
        expect(props.setEditRepeat).toHaveBeenCalledWith(null);
    });
});
