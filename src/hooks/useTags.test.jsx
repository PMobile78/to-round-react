// @vitest-environment happy-dom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    createCategory,
    deleteCategory,
    reorderCategories,
    subscribeCategories,
    updateCategory,
} from '../services/data/categories';
import { useBubblesData } from '../state/BubblesDataStore';
import { useBubblesUi } from '../state/BubblesUiStore';
import { useTags } from './useTags';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../firebase', () => ({ db: 'db' }));
vi.mock('../services/data/categories', async (importOriginal) => ({
    ...(await importOriginal()),
    subscribeCategories: vi.fn(() => vi.fn()),
    newCategoryId: vi.fn(() => 'new-cat'),
    createCategory: vi.fn(() => Promise.resolve()),
    updateCategory: vi.fn(() => Promise.resolve()),
    deleteCategory: vi.fn(() => Promise.resolve()),
    reorderCategories: vi.fn(() => Promise.resolve()),
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

const TAG_A = { id: 'tag-a', name: 'A', color: '#da3833', order: 1 };
const TAG_B = { id: 'tag-b', name: 'B', color: '#ee603c', order: 2 };

describe('useTags: categories as v2 documents', () => {
    let container;
    let root;
    let handlers;
    let data;
    let ui;

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

        data = { tags: [TAG_A, TAG_B], setTags: vi.fn(), setBubbles: vi.fn() };
        ui = {
            setFilterTags: vi.fn(),
            setListFilterTags: vi.fn(),
            tagName: '',
            setTagName: vi.fn(),
            tagColor: '#da3833',
            setTagColor: vi.fn(),
            editingTag: null,
            setEditingTag: vi.fn(),
            setTagDialog: vi.fn(),
            setDeletingTags: vi.fn(),
        };
        useBubblesData.mockImplementation(() => data);
        useBubblesUi.mockImplementation(() => ui);
    });

    afterEach(() => {
        if (root) act(() => root.unmount());
        container.remove();
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    it('lists the categories of the signed-in user, live', () => {
        render({ uid: 'user-a' });
        expect(subscribeCategories).toHaveBeenCalledWith('db', 'user-a', expect.any(Function), expect.any(Function));
        const onList = subscribeCategories.mock.calls[0][2];
        act(() => onList([TAG_B]));
        expect(data.setTags).toHaveBeenCalledWith([TAG_B]);
    });

    it('creates a category after the last one, in the colour picked', () => {
        ui.tagName = ' Home ';
        ui.tagColor = '#fd8b2b';
        render({ uid: 'user-a' });
        act(() => handlers.handleSaveTag());
        expect(createCategory).toHaveBeenCalledWith('db', 'user-a', 'new-cat', { name: 'Home', color: '#fd8b2b', order: 3 });
    });

    it('saves only what changed in a category', () => {
        ui.editingTag = TAG_A;
        ui.tagName = 'Work';
        ui.tagColor = TAG_A.color;
        render({ uid: 'user-a' });
        act(() => handlers.handleSaveTag());
        expect(updateCategory).toHaveBeenCalledWith('db', 'user-a', 'tag-a', { name: 'Work' });
    });

    it('does not take the colour of another category', () => {
        ui.editingTag = TAG_A;
        ui.tagName = 'A';
        ui.tagColor = TAG_B.color;
        render({ uid: 'user-a' });
        act(() => handlers.handleSaveTag());
        expect(updateCategory).not.toHaveBeenCalled();
    });

    it('saves a drag-and-drop through the order planner', () => {
        render({ uid: 'user-a' });
        act(() => handlers.handleReorderTags([TAG_B, TAG_A]));
        expect(reorderCategories).toHaveBeenCalledWith('db', 'user-a', [TAG_B, TAG_A]);
    });

    it('deletes the category after 7 seconds and leaves its tasks to the server', () => {
        render({ uid: 'user-a' });
        act(() => handlers.handleDeleteTag('tag-a'));
        act(() => vi.advanceTimersByTime(6999));
        expect(deleteCategory).not.toHaveBeenCalled();
        act(() => vi.advanceTimersByTime(1));
        expect(deleteCategory).toHaveBeenCalledWith('db', 'user-a', 'tag-a');
        expect(data.setBubbles).not.toHaveBeenCalled();
    });

    it('cancels a pending deletion on unmount', () => {
        render({ uid: 'user-a' });
        act(() => handlers.handleDeleteTag('tag-a'));

        act(() => root.unmount());
        root = null;
        act(() => vi.advanceTimersByTime(7000));

        expect(deleteCategory).not.toHaveBeenCalled();
    });

    it('does not run a deletion after logout and login as another uid', () => {
        render({ uid: 'user-a' });
        act(() => handlers.handleDeleteTag('tag-a'));

        render(null);
        render({ uid: 'user-b' });
        act(() => vi.advanceTimersByTime(7000));

        expect(deleteCategory).not.toHaveBeenCalled();
    });

    it('cancels the corresponding timer on undo', () => {
        render({ uid: 'user-a' });
        act(() => handlers.handleDeleteTag('tag-a'));
        act(() => handlers.handleUndoDeleteTag('tag-a'));
        act(() => vi.advanceTimersByTime(7000));

        expect(deleteCategory).not.toHaveBeenCalled();
    });

    it('keeps timers for different categories independent', () => {
        render({ uid: 'user-a' });
        act(() => handlers.handleDeleteTag('tag-a'));
        act(() => vi.advanceTimersByTime(3500));
        act(() => handlers.handleDeleteTag('tag-b'));

        act(() => vi.advanceTimersByTime(3500));
        expect(deleteCategory).toHaveBeenCalledTimes(1);
        expect(deleteCategory).toHaveBeenLastCalledWith('db', 'user-a', 'tag-a');

        act(() => vi.advanceTimersByTime(3500));
        expect(deleteCategory).toHaveBeenCalledTimes(2);
        expect(deleteCategory).toHaveBeenLastCalledWith('db', 'user-a', 'tag-b');
    });
});
