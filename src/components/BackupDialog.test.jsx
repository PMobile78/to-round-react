// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BackupDialog from './BackupDialog';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const t = (key, values) => (values ? `${key} ${JSON.stringify(values)}` : key);
const COUNTS = { tasks: 120, categories: 8, settings: true, deletedTasks: 3, deletedCategories: 1 };

describe('BackupDialog: the steps of an import (spec 10)', () => {
    let container;
    let root;
    let onConfirm;
    let onClose;

    const render = (state) => act(() => root.render(
        <BackupDialog state={state} onConfirm={onConfirm} onClose={onClose} isMobile={false} getDialogPaperStyles={() => ({})} t={t} />
    ));
    const button = (text) => Array.from(document.querySelectorAll('button')).find((el) => el.textContent === text);

    beforeEach(() => {
        onConfirm = vi.fn();
        onClose = vi.fn();
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
    });

    it('stays closed without a step', () => {
        render(null);
        expect(document.querySelector('[role="dialog"]')).toBeNull();
    });

    it('asks before writing, with the numbers of the backup and of what goes', () => {
        render({ step: 'confirm', version: 2, counts: COUNTS });
        const text = document.body.textContent;
        expect(text).toContain('backup.replace');
        expect(text).toContain('backup.inBackup {"tasks":120,"categories":8}');
        expect(text).toContain('backup.toDelete {"tasks":3,"categories":1}');
        expect(text).toContain('backup.settings');
        expect(text).not.toContain('backup.oldFormat');
        act(() => button('backup.confirm').click());
        expect(onConfirm).toHaveBeenCalledTimes(1);
        act(() => button('bubbles.cancel').click());
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('says what a backup of the old version loses, and leaves out what does not happen', () => {
        render({ step: 'confirm', version: 1, counts: { ...COUNTS, settings: false, deletedTasks: 0, deletedCategories: 0 } });
        const text = document.body.textContent;
        expect(text).toContain('backup.oldFormat');
        expect(text).not.toContain('backup.toDelete');
        expect(text).not.toContain('backup.settings');
    });

    it('shows the progress and offers no way out while writing', () => {
        render({ step: 'writing', done: 450, total: 451 });
        expect(document.body.textContent).toContain('backup.writing {"done":450,"total":451}');
        expect(document.querySelector('[role="progressbar"]')).not.toBeNull();
        expect(button('bubbles.close')).toBeUndefined();
        expect(button('bubbles.cancel')).toBeUndefined();
    });

    it.each([
        [{ step: 'done' }, 'backup.done'],
        [{ step: 'error', error: { key: 'backup.writeFailed', values: { done: 450, total: 451 } } }, 'backup.writeFailed {"done":450,"total":451}'],
        [{ step: 'error', error: { key: 'backup.exportFailed' } }, 'backup.exportFailed'],
    ])('reports %j and closes', (state, text) => {
        render(state);
        expect(document.body.textContent).toContain(text);
        act(() => button('bubbles.close').click());
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
