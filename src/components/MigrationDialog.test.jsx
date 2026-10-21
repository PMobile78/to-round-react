// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import uk from '../locales/uk/translation.json';
import MigrationDialog from './MigrationDialog';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const t = (key, values) => (values ? `${key} ${JSON.stringify(values)}` : key);
const PREVIEW = {
    tasks: 8,
    categories: 4,
    rounded: [{ id: 'a1', title: 'Pay bills' }],
    lostFormatting: [{ id: 'a6', title: 'Shopping notes' }],
    changed: [{ id: 'a7', title: 'Broken date' }],
    recolored: [{ id: 'c2', name: 'Work' }],
    skipped: { tasks: 1, categories: 1 },
};
const QUIET = { ...PREVIEW, rounded: [], lostFormatting: [], changed: [], recolored: [], skipped: { tasks: 0, categories: 0 } };

describe('MigrationDialog: the preview of the move (spec 9.1)', () => {
    let container;
    let root;
    let handlers;

    const render = (state) => act(() => root.render(<MigrationDialog state={state} {...handlers} t={t} />));
    const button = (text) => Array.from(document.querySelectorAll('button')).find((el) => el.textContent === text);

    beforeEach(() => {
        handlers = { onMove: vi.fn(), onPostpone: vi.fn(), onRetry: vi.fn() };
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
    });

    it('shows the numbers and what changes, then moves on "Move"', () => {
        render({ step: 'preview', preview: PREVIEW });
        const text = document.body.textContent;
        [
            'migration.intro', 'migration.counts {"tasks":8,"categories":4}',
            'migration.rounded', 'Pay bills', 'migration.lostFormatting', 'Shopping notes',
            'migration.changed', 'Broken date', 'migration.recolored', 'Work',
            'migration.skipped {"tasks":1,"categories":1}', 'migration.postponeHint',
        ].forEach((part) => expect(text).toContain(part));
        act(() => button('migration.move').click());
        expect(handlers.onMove).toHaveBeenCalledTimes(1);
    });

    it('leaves out the lists that are empty', () => {
        render({ step: 'preview', preview: QUIET });
        const text = document.body.textContent;
        ['migration.rounded', 'migration.lostFormatting', 'migration.changed', 'migration.recolored', 'migration.skipped']
            .forEach((part) => expect(text).not.toContain(part));
    });

    it('postpones: signs out and writes nothing', () => {
        render({ step: 'preview', preview: QUIET });
        act(() => button('migration.postpone').click());
        expect(handlers.onPostpone).toHaveBeenCalledTimes(1);
        expect(handlers.onMove).not.toHaveBeenCalled();
    });

    it('shows the progress and offers no way out while moving', () => {
        render({ step: 'moving', done: 450, total: 900 });
        expect(document.body.textContent).toContain('migration.moving {"done":450,"total":900}');
        expect(document.querySelector('[role="progressbar"]')).not.toBeNull();
        expect(document.querySelectorAll('button')).toHaveLength(0);
    });

    it('says what went wrong and tries again or postpones', () => {
        render({ step: 'error', error: 'migration.moveFailed' });
        expect(document.body.textContent).toContain('migration.moveFailed');
        act(() => button('migration.retry').click());
        expect(handlers.onRetry).toHaveBeenCalledTimes(1);
        act(() => button('migration.postpone').click());
        expect(handlers.onPostpone).toHaveBeenCalledTimes(1);
    });
});

describe('MigrationDialog: the Ukrainian texts', () => {
    it('names the due date the way the task window does («Термін виконання»)', () => {
        expect(uk.migration.changed).toMatch(new RegExp(`^${uk.bubbles.dueDateLabel}, `));
    });
});
