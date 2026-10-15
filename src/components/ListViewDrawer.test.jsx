// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bubbleFromTask } from '../services/data/bubbleModel';
import { completeTask, trashTask } from '../services/data/tasks';
import TaskListDrawer from './ListViewDrawer';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../firebase', () => ({ db: 'db' }));
vi.mock('../i18n', () => ({ default: { language: 'en' } }));
vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key) => key, i18n: { language: 'en' } }),
}));
vi.mock('../services/data/tasks', () => ({
    completeTask: vi.fn(() => Promise.resolve()),
    deleteTaskForever: vi.fn(() => Promise.resolve()),
    restoreTask: vi.fn(() => Promise.resolve()),
    trashTask: vi.fn(() => Promise.resolve()),
}));

const TASK = {
    id: 't1',
    title: 'Pay bills',
    description: '',
    categoryId: null,
    status: 'active',
    due: null,
    reminders: [],
    repeat: null,
    radius: 45,
    pulseMuted: false,
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
    deletedAt: null,
};

describe('TaskListDrawer: list actions of the signed-in user', () => {
    let container;
    let root;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        act(() => root.render(
            <TaskListDrawer
                open
                onClose={vi.fn()}
                isMobile={false}
                themeMode="light"
                bubbles={[bubbleFromTask(TASK)]}
                uid="u1"
                tags={[]}
                listFilter="active"
                setListFilter={vi.fn()}
                listSortBy="updatedAt"
                setListSortBy={vi.fn()}
                listSortOrder="desc"
                setListSortOrder={vi.fn()}
                listFilterTags={[]}
                setListFilterTags={vi.fn()}
                listShowNoTag
                setListShowNoTag={vi.fn()}
                listSearchQuery=""
                setListSearchQuery={vi.fn()}
                setSelectedBubble={vi.fn()}
                setSelectedTagId={vi.fn()}
                setEditDialog={vi.fn()}
                handleListTagFilterChange={vi.fn()}
                handleListNoTagFilterChange={vi.fn()}
                clearAllListFilters={vi.fn()}
                selectAllListFilters={vi.fn()}
                getBubbleCountByTagForListView={() => 0}
                isAllListFiltersSelected
                onOpenFilterMenu={vi.fn()}
            />
        ));
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
        vi.clearAllMocks();
    });

    const click = (title) => act(() => document.querySelector(`button[title="${title}"]`).click());

    it('moves a task to the trash of the signed-in user', () => {
        click('bubbles.deleteBubble');
        expect(trashTask).toHaveBeenCalledWith('db', 'u1', 't1');
    });

    it('marks a task done for the signed-in user', () => {
        click('bubbles.markAsDone');
        expect(completeTask).toHaveBeenCalledWith('db', 'u1', expect.objectContaining({ id: 't1' }));
    });
});
