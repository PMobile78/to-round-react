// @vitest-environment happy-dom
import React, { act, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import Matter from 'matter-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import settingsFixtures from '../../contract/fixtures/settings.json';
import { SettingsContext } from '../state/SettingsContext';
import { BubblesDataProvider, useBubblesData } from '../state/BubblesDataStore';
import { BubblesUiProvider, useBubblesUi } from '../state/BubblesUiStore';
import { bubbleFromTask } from '../services/data/bubbleModel';
import { createTask, trashTask, updateTask } from '../services/data/tasks';
import { useBubbleCrud } from './useBubbleCrud';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../firebase', () => ({ db: 'db' }));
vi.mock('../services/data/tasks', async (importOriginal) => ({
    ...(await importOriginal()),
    newTaskId: vi.fn(() => 'new-id'),
    createTask: vi.fn(() => Promise.resolve()),
    updateTask: vi.fn(() => Promise.resolve()),
    trashTask: vi.fn(() => Promise.resolve()),
}));
vi.mock('../utils/logger', () => ({ default: { error: vi.fn() } }));

const DEFAULTS = settingsFixtures.valid.find((f) => f.name === 'defaults').value;
const SETTINGS = { settings: DEFAULTS, updateSettings: vi.fn(), getSettings: () => DEFAULTS };

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

describe('useBubbleCrud: task writes through the v2 data layer', () => {
    let container;
    let root;
    let engineRef;
    let crud;
    let data;
    let ui;

    function Probe() {
        data = useBubblesData();
        ui = useBubblesUi();
        const { register } = ui;
        useEffect(() => { register({ getBubbleFillStyle: () => 'fill' }); }, [register]);
        crud = useBubbleCrud({
            engineRef,
            renderRef: { current: {} },
            bubbles: data.bubbles,
            setBubbles: data.setBubbles,
            theme: {},
            isMobile: false,
            uid: 'u1',
        });
        return null;
    }

    // A bubble on the canvas, opened in the edit dialog as a click would open it.
    const openInDialog = (task) => {
        const bubble = { ...bubbleFromTask(task), body: Matter.Bodies.circle(100, 100, task.radius) };
        Matter.World.add(engineRef.current.world, bubble.body);
        act(() => data.setBubbles([bubble]));
        act(() => {
            crud.setSelectedBubble(bubble);
            ui.setSelectedTagId(bubble.tagId || '');
            ui.setEditBubbleSize(bubble.radius);
        });
        return bubble;
    };

    const save = (bubble, overrides) => act(() => crud.handleSaveBubble({
        title: bubble.title,
        description: bubble.description,
        editDueDate: null,
        editNotifications: bubble.notifications,
        editRecurrence: bubble.recurrence,
        manuallyStoppedPulsingRef: { current: new Set() },
        setEditDueDate: vi.fn(),
        ...overrides,
    }));

    beforeEach(() => {
        engineRef = { current: Matter.Engine.create() };
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        act(() => root.render(
            <SettingsContext.Provider value={SETTINGS}>
                <BubblesDataProvider><BubblesUiProvider><Probe /></BubblesUiProvider></BubblesDataProvider>
            </SettingsContext.Provider>
        ));
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
        vi.clearAllMocks();
        vi.useRealTimers();
    });

    it('creates the task with the values of the create dialog and shows it at once', () => {
        act(() => crud.createNewBubble({
            title: 'Pay bills',
            description: '',
            canvasSize: { width: 800, height: 600 },
            dueDate: null,
            createNotifications: [],
            createRecurrence: null,
            setDueDate: vi.fn(),
        }));

        expect(createTask).toHaveBeenCalledWith('db', 'u1', 'new-id', {
            title: 'Pay bills', description: '', categoryId: null, due: null, reminders: [], repeat: null, radius: 45,
        });
        expect(data.bubbles).toEqual([expect.objectContaining({ id: 'new-id', title: 'Pay bills', status: 'active' })]);
        expect(engineRef.current.world.bodies).toContain(data.bubbles[0].body);
    });

    it('saves only the fields the user changed', () => {
        const bubble = openInDialog(TASK);
        save(bubble, { title: 'Pay all bills' });
        expect(updateTask).toHaveBeenCalledWith('db', 'u1', 't1', { title: 'Pay all bills' });
        expect(data.bubbles[0]).toMatchObject({ title: 'Pay all bills' });
    });

    it('writes nothing when the dialog is saved unchanged', () => {
        save(openInDialog(TASK));
        expect(updateTask).not.toHaveBeenCalled();
    });

    it('keeps the editor mode out of Firestore: v2 stores the description as Markdown', () => {
        openInDialog(TASK);
        act(() => crud.handleToggleEditUseRichText(true));
        expect(crud.useRichTextEdit).toBe(true);
        expect(updateTask).not.toHaveBeenCalled();
    });

    it('moves a deleted task to the trash', () => {
        openInDialog(TASK);
        act(() => { crud.handleDeleteBubble(); });
        expect(trashTask).toHaveBeenCalledWith('db', 'u1', 't1');
        expect(data.bubbles[0].status).toBe('deleted');
    });

    it('moves a repeating task to its next due on "Done" and keeps it on the canvas', () => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-10-14T10:00:00.000Z'));
        const bubble = openInDialog({ ...TASK, due: { local: '2026-10-10T09:00', tz: 'Europe/Berlin' }, repeat: { every: 1, unit: 'days' } });

        act(() => { crud.handleMarkAsDone(); });

        expect(updateTask).toHaveBeenCalledWith('db', 'u1', 't1', { due: { local: '2026-10-15T09:00', tz: 'Europe/Berlin' } });
        expect(data.bubbles[0]).toMatchObject({ status: 'active', due: { local: '2026-10-15T09:00', tz: 'Europe/Berlin' } });
        expect(engineRef.current.world.bodies).toContain(bubble.body);
    });

    it('finishes a one-off task after the pop animation', async () => {
        openInDialog(TASK);
        act(() => { crud.handleMarkAsDone(); });
        await vi.waitFor(() => expect(updateTask).toHaveBeenCalledWith('db', 'u1', 't1', { status: 'done' }));
    });
});
