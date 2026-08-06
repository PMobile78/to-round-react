// @vitest-environment happy-dom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    deleteTagFromFirestore,
    updateBubbleFields,
} from '../services/firestoreService';
import { useBubblesData } from '../state/BubblesDataStore';
import { useBubblesUi } from '../state/BubblesUiStore';
import { useTags } from './useTags';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../services/firestoreService', () => ({
    subscribeToTagsUpdates: vi.fn(() => vi.fn()),
    upsertTagInFirestore: vi.fn(),
    deleteTagFromFirestore: vi.fn(() => Promise.resolve()),
    updateBubbleFields: vi.fn(() => Promise.resolve()),
}));
vi.mock('../state/BubblesDataStore', () => ({
    useBubblesData: vi.fn(),
}));
vi.mock('../state/BubblesUiStore', () => ({
    useBubblesUi: vi.fn(),
}));
vi.mock('../utils/logger', () => ({
    default: { error: vi.fn() },
}));

describe('useTags delayed deletion lifecycle', () => {
    let container;
    let root;
    let handlers;

    function Probe({ user }) {
        handlers = useTags({ user });
        return null;
    }

    const render = (user) => {
        act(() => root.render(<Probe user={user} />));
    };

    beforeEach(() => {
        vi.useFakeTimers();
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);

        useBubblesData.mockReturnValue({
            tags: [
                { id: 'tag-a', name: 'A', color: '#111111' },
                { id: 'tag-b', name: 'B', color: '#222222' },
            ],
            setTags: vi.fn(),
            setBubbles: vi.fn(),
        });
        useBubblesUi.mockReturnValue({
            registered: { getBubbleFillStyle: vi.fn() },
            setFilterTags: vi.fn(),
            setListFilterTags: vi.fn(),
            tagName: '',
            setTagName: vi.fn(),
            tagColor: '#111111',
            setTagColor: vi.fn(),
            editingTag: null,
            setEditingTag: vi.fn(),
            setTagDialog: vi.fn(),
            setDeletingTags: vi.fn(),
        });
    });

    afterEach(() => {
        if (root) act(() => root.unmount());
        container.remove();
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    it('cancels a pending tag deletion on unmount', () => {
        render({ uid: 'user-a' });
        act(() => handlers.handleDeleteTag('tag-a'));

        act(() => root.unmount());
        root = null;
        act(() => vi.advanceTimersByTime(7000));

        expect(deleteTagFromFirestore).not.toHaveBeenCalled();
        expect(updateBubbleFields).not.toHaveBeenCalled();
    });

    it('does not run a deletion after logout and login as another uid', () => {
        render({ uid: 'user-a' });
        act(() => handlers.handleDeleteTag('tag-a'));

        render(null);
        render({ uid: 'user-b' });
        act(() => vi.advanceTimersByTime(7000));

        expect(deleteTagFromFirestore).not.toHaveBeenCalled();
        expect(updateBubbleFields).not.toHaveBeenCalled();
    });

    it('cancels the corresponding timer on undo', () => {
        render({ uid: 'user-a' });
        act(() => handlers.handleDeleteTag('tag-a'));
        act(() => handlers.handleUndoDeleteTag('tag-a'));
        act(() => vi.advanceTimersByTime(7000));

        expect(deleteTagFromFirestore).not.toHaveBeenCalled();
    });

    it('keeps timers for different tags independent', () => {
        render({ uid: 'user-a' });
        act(() => handlers.handleDeleteTag('tag-a'));
        act(() => vi.advanceTimersByTime(3500));
        act(() => handlers.handleDeleteTag('tag-b'));

        act(() => vi.advanceTimersByTime(3500));
        expect(deleteTagFromFirestore).toHaveBeenCalledTimes(1);
        expect(deleteTagFromFirestore).toHaveBeenLastCalledWith('tag-a', 'user-a');

        act(() => vi.advanceTimersByTime(3500));
        expect(deleteTagFromFirestore).toHaveBeenCalledTimes(2);
        expect(deleteTagFromFirestore).toHaveBeenLastCalledWith('tag-b', 'user-a');
    });
});
