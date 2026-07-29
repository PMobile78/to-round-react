// @vitest-environment happy-dom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { saveBubblesToFirestore, saveTagsToFirestore } from '../services/firestoreService';
import { useBubblesData } from '../state/BubblesDataStore';
import { EXPORT_VERSION } from '../utils/bubbleJson';
import { useBubbleImportExport } from './useBubbleImportExport';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../services/firestoreService', () => ({
    saveBubblesToFirestore: vi.fn(),
    saveTagsToFirestore: vi.fn(),
}));
vi.mock('../state/BubblesDataStore', () => ({
    useBubblesData: vi.fn(),
}));
vi.mock('../utils/exportJson', () => ({
    exportJsonFile: vi.fn(),
}));
vi.mock('../utils/logger', () => ({
    default: { error: vi.fn() },
}));
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key, values) => values ? `${key}:${JSON.stringify(values)}` : key,
    }),
}));

describe('useBubbleImportExport', () => {
    let container;
    let root;
    let handlers;
    let setBubbles;
    let setTags;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        setBubbles = vi.fn();
        setTags = vi.fn();
        useBubblesData.mockReturnValue({
            bubbles: [{ id: 'existing-bubble' }],
            tags: [{ id: 'existing-tag' }],
            setBubbles,
            setTags,
        });
        vi.stubGlobal('alert', vi.fn());
        vi.stubGlobal('confirm', vi.fn(() => true));

        function Probe() {
            handlers = useBubbleImportExport();
            return null;
        }
        act(() => root.render(<Probe />));
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
        vi.clearAllMocks();
    });

    it.each([
        ['an empty object', {}],
        ['a partial payload', { version: EXPORT_VERSION, bubbles: [] }],
        ['an unknown version', { version: 999, bubbles: [], tags: [] }],
        ['a malformed record', { version: EXPORT_VERSION, bubbles: [{ title: 'missing id' }], tags: [] }],
    ])('does not mutate persistence or state for %s', async (_label, data) => {
        const setItem = vi.spyOn(window.localStorage, 'setItem');

        await act(async () => {
            await handlers.handleImportJson(data);
        });

        expect(saveBubblesToFirestore).not.toHaveBeenCalled();
        expect(saveTagsToFirestore).not.toHaveBeenCalled();
        expect(setBubbles).not.toHaveBeenCalled();
        expect(setTags).not.toHaveBeenCalled();
        expect(setItem).not.toHaveBeenCalled();
        expect(window.confirm).not.toHaveBeenCalled();
        expect(window.alert).toHaveBeenCalledWith('bubbles.importInvalid');
    });

    it('does not import a valid backup when confirmation is declined', async () => {
        window.confirm.mockReturnValue(false);

        await act(async () => {
            await handlers.handleImportJson({
                version: EXPORT_VERSION,
                bubbles: [],
                tags: [],
            });
        });

        expect(saveBubblesToFirestore).not.toHaveBeenCalled();
        expect(saveTagsToFirestore).not.toHaveBeenCalled();
        expect(setBubbles).not.toHaveBeenCalled();
        expect(setTags).not.toHaveBeenCalled();
    });

    it('imports an intentionally empty backup after explicit confirmation', async () => {
        await act(async () => {
            await handlers.handleImportJson({
                version: EXPORT_VERSION,
                bubbles: [],
                tags: [],
            });
        });

        expect(window.confirm).toHaveBeenCalledWith(
            'bubbles.importConfirm:{"importBubbles":0,"importTags":0,"deleteBubbles":1,"deleteTags":1}'
        );
        expect(saveBubblesToFirestore).toHaveBeenCalledWith([]);
        expect(saveTagsToFirestore).toHaveBeenCalledWith([]);
        expect(setBubbles).toHaveBeenCalledWith([]);
        expect(setTags).toHaveBeenCalledWith([]);
    });
});
