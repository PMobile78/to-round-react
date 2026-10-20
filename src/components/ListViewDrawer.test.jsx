// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bubbleFromTask } from '../services/data/bubbleModel';
import { completeTask, finishSeries, trashTask } from '../services/data/tasks';
import logger from '../utils/logger';
import TaskListDrawer from './ListViewDrawer';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../firebase', () => ({ db: 'db' }));
vi.mock('../i18n', () => ({ default: { language: 'en' } }));
vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key) => key, i18n: { language: 'en' } }),
}));
vi.mock('../utils/logger', () => ({ default: { error: vi.fn() } }));
vi.mock('../services/data/tasks', () => ({
    completeTask: vi.fn(() => Promise.resolve()),
    finishSeries: vi.fn(() => Promise.resolve()),
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

    const renderList = ({ bubbles = [bubbleFromTask(TASK)], listFilter = 'active' } = {}) => act(() => root.render(
            <TaskListDrawer
                open
                onClose={vi.fn()}
                isMobile={false}
                themeMode="light"
                bubbles={bubbles}
                uid="u1"
                tags={[]}
                listFilter={listFilter}
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

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        renderList();
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

    it('logs the error and keeps the list when "Done" cannot be saved', async () => {
        const error = new Error('Invalid local date-time: 2026-02-30T09:00');
        completeTask.mockReturnValueOnce(Promise.reject(error));
        click('bubbles.markAsDone');
        await vi.waitFor(() => expect(logger.error).toHaveBeenCalledWith('Error marking task as done:', error));
        expect(document.body.textContent).toContain('Pay bills');
    });

    it('finishes the series of a repeating task, and offers it for no other task', () => {
        expect(document.querySelector('button[title="bubbles.finishSeries"]')).toBeNull();
        const repeating = bubbleFromTask({ ...TASK, id: 't2', due: { local: '2026-10-10T09:00', tz: 'Europe/Kyiv' }, repeat: { every: 1, unit: 'days' } });
        renderList({ bubbles: [repeating] });
        click('bubbles.finishSeries');
        expect(finishSeries).toHaveBeenCalledWith('db', 'u1', 't2');
    });

    it('lists under "Planned" only the active tasks whose due is still ahead', () => {
        const ahead = bubbleFromTask({ ...TASK, id: 't2', title: 'Ahead', due: { local: '2099-01-01T09:00', tz: 'Europe/Kyiv' } });
        const passed = bubbleFromTask({ ...TASK, id: 't3', title: 'Passed', due: { local: '2020-01-01T09:00', tz: 'Europe/Kyiv' } });
        renderList({ bubbles: [bubbleFromTask(TASK), ahead, passed], listFilter: 'postpone' });
        const text = document.body.textContent;
        expect(text).toContain('Ahead');
        expect(text).not.toContain('Passed');
        expect(text).not.toContain('Pay bills');
    });
});
