// @vitest-environment happy-dom
import React, { StrictMode, act, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Matter from 'matter-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMatterEngine } from './useMatterEngine';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Matter's canvas renderer and rAF runner need a real browser; the engine, bodies and
// world stay real.
vi.mock('matter-js', async (importOriginal) => {
    const Matter = (await importOriginal()).default;
    return {
        default: {
            ...Matter,
            Render: {
                create: vi.fn(({ options }) => ({
                    canvas: document.createElement('canvas'),
                    options: { ...options },
                    textures: {},
                })),
                run: vi.fn(),
                stop: vi.fn(),
            },
            Runner: { create: vi.fn(() => ({})), run: vi.fn(), stop: vi.fn() },
        },
    };
});
vi.mock('../utils/logger', () => ({
    default: { error: vi.fn() },
}));

// A task in backup form, as subscribeTasks delivers it.
const task = (id, overrides = {}) => ({
    id,
    title: `Task ${id}`,
    description: '',
    categoryId: null,
    status: 'active',
    due: null,
    reminders: [],
    repeat: null,
    radius: 50,
    pulseMuted: false,
    createdAt: '2026-10-14T20:00:00.000Z',
    updatedAt: '2026-10-14T20:00:00.000Z',
    deletedAt: null,
    ...overrides,
});

describe('useMatterEngine', () => {
    let container;
    let root;
    let refs;
    let hookProps; // per-test overrides of the hook's props
    let bubbles; // latest committed bubbles state
    let setBubblesState; // the bubbles setter, for updates the page makes itself (Save)
    let committedBodies; // every Matter body that reached a committed bubbles state
    let deliver; // the onChanges callback useMatterEngine gave subscribeTasks
    let subscribeTasks;

    const push = (changes, initial = false) => act(() => deliver(changes, { initial }));
    const added = (...tasks) => tasks.map((t) => ({ type: 'added', task: t }));

    const recordCommit = (state) => {
        bubbles = state;
        state.forEach((b) => {
            if (b.body) committedBodies.add(b.body);
        });
    };

    function Probe() {
        const [state, setBubbles] = useState([]);
        setBubblesState = setBubbles;
        useMatterEngine({
            ...refs,
            editDialog: false,
            selectedBubble: null,
            bubbles: state,
            subscribeTasks,
            setBubbles,
            setCanvasSize: vi.fn(),
            setSelectedBubble: vi.fn(),
            setSelectedTagId: vi.fn(),
            setEditBubbleSize: vi.fn(),
            setEditDialog: vi.fn(),
            setEditDueDate: vi.fn(),
            setEditNotifications: vi.fn(),
            setEditRecurrence: vi.fn(),
            isMobile: false,
            themeMode: 'light',
            tags: [],
            dropSpeed: 1,
            getBubbleFillStyle: () => 'rgba(0, 0, 0, 0)',
            getCanvasSize: () => ({ width: 800, height: 600 }),
            parseLocalDateTime: () => null,
            theme: {},
            ...hookProps,
        });
        useEffect(() => recordCommit(state), [state]);
        return null;
    }

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        hookProps = {};
        bubbles = undefined;
        committedBodies = new Set();
        subscribeTasks = vi.fn((onChanges) => {
            deliver = onChanges;
            return vi.fn();
        });
        refs = {
            canvasRef: { current: container },
            engineRef: { current: null },
            renderRef: { current: null },
            wallsRef: { current: [] },
            manuallyStoppedPulsingRef: { current: new Set() },
            liveEditRef: { current: { editDialog: false, selectedBubbleId: null } },
        };
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
        vi.clearAllMocks();
        vi.restoreAllMocks();
    });

    it('gives every task of the first delivery one Matter body', () => {
        act(() => root.render(<Probe />));
        push(added(task('a'), task('b', { radius: 40 })), true);

        expect(bubbles.map((b) => [b.id, b.body.circleRadius])).toEqual([['a', 50], ['b', 40]]);
    });

    it('gives a task created on another device a Matter body', () => {
        act(() => root.render(<Probe />));
        push(added(task('local')), true);
        const localBody = bubbles[0].body;

        push(added(task('remote', { radius: 40, title: 'Created elsewhere', categoryId: 'work' })));

        const remote = bubbles.find((b) => b.id === 'remote');
        expect(remote).toMatchObject({ title: 'Created elsewhere', radius: 40, tagId: 'work', categoryId: 'work' });
        expect(remote.body.circleRadius).toBe(40);
        expect(bubbles.find((b) => b.id === 'local').body).toBe(localBody);
    });

    it('creates the body only once when the same task is delivered twice', () => {
        act(() => root.render(<Probe />));
        push([], true);

        push(added(task('remote')));
        const body = bubbles[0].body;
        push(added(task('remote')));

        expect(bubbles).toHaveLength(1);
        expect(bubbles[0].body).toBe(body);
    });

    it("styles a new body with its category's fill and colour", () => {
        hookProps = {
            tags: [{ id: 'work', name: 'Work', color: '#2e7d32', order: 1 }],
            getBubbleFillStyle: (tagColor) => (tagColor ? `fill ${tagColor}` : 'fill none'),
        };
        act(() => root.render(<Probe />));
        push(added(task('remote', { categoryId: 'work' }), task('plain')), true);

        expect(bubbles[0].body.render).toMatchObject({ fillStyle: 'fill #2e7d32', strokeStyle: '#2e7d32', lineWidth: 1.5 });
        expect(bubbles[1].body.render).toMatchObject({ fillStyle: 'fill none', strokeStyle: '#B0B0B0' });
    });

    it('keeps the Matter body and the other bubbles when another device edits a task', () => {
        act(() => root.render(<Probe />));
        push(added(task('a'), task('b')), true);
        const [a, b] = bubbles;

        push([{ type: 'modified', task: task('b', { title: 'Renamed elsewhere', radius: 70 }) }]);

        expect(bubbles[0]).toBe(a);
        expect(bubbles[1]).toMatchObject({ title: 'Renamed elsewhere', radius: 70 });
        expect(bubbles[1].body).toBe(b.body);
    });

    it('removes the Matter body of a task deleted on another device', () => {
        act(() => root.render(<Probe />));
        push(added(task('a'), task('b')), true);
        // useBubbleWorld puts the visible bodies into the world.
        const world = refs.engineRef.current.world;
        bubbles.forEach((b) => Matter.World.add(world, b.body));
        const deletedBody = bubbles.find((b) => b.id === 'b').body;

        push([{ type: 'removed', task: task('b') }]);

        expect(bubbles.map((b) => b.id)).toEqual(['a']);
        expect(world.bodies.includes(deletedBody)).toBe(false);
    });

    it('leaves no orphaned body when a subscription delivers its first list again', () => {
        act(() => root.render(<Probe />));
        push(added(task('a'), task('b')), true);
        const world = refs.engineRef.current.world;
        bubbles.forEach((b) => Matter.World.add(world, b.body));

        push(added(task('a'), task('b')), true);

        // useBubbleWorld adds every committed body to the Matter world, so a body that is no
        // longer in state stays there as an unlabeled ghost bubble.
        const finalBodies = bubbles.map((b) => b.body);
        const ghosts = world.bodies.filter((body) => body.label === 'Circle Body' && !finalBodies.includes(body));
        expect(bubbles).toHaveLength(2);
        expect(ghosts).toEqual([]);
    });

    it('places a body created after a resize inside the current canvas', () => {
        act(() => root.render(<Probe />));
        push([], true);
        // The canvas shrank (window resize, phone rotation); useMatterResize →
        // updateRenderAndBounds keeps render.options in step with it.
        refs.renderRef.current.options.width = 300;
        refs.renderRef.current.options.height = 400;
        vi.spyOn(Math, 'random').mockReturnValue(0.999);

        push(added(task('remote', { radius: 40 })));

        const { x, y } = bubbles[0].body.position;
        expect(x).toBeLessThanOrEqual(300 - 40);
        expect(y).toBeLessThanOrEqual(400 - 40);
    });

    it('follows "stop pulsing" set or cleared on another device', () => {
        act(() => root.render(<Probe />));
        push(added(task('a', { pulseMuted: true })), true);
        expect(refs.manuallyStoppedPulsingRef.current.has('a')).toBe(true);

        push([{ type: 'modified', task: task('a', { pulseMuted: false }) }]);
        expect(refs.manuallyStoppedPulsingRef.current.has('a')).toBe(false);
    });

    it('stops listening when the canvas unmounts', () => {
        act(() => root.render(<Probe />));
        const unsubscribe = subscribeTasks.mock.results[0].value;
        act(() => root.unmount());
        root = createRoot(container);
        expect(unsubscribe).toHaveBeenCalledTimes(1);
    });

    it('keeps the edit dialog closed after Save when a canvas click opened it', () => {
        // As in the app: the dialog state lives in BubblesPage, the bubbles in BubblesDataProvider.
        let setDialogOpen;
        let dialogOpen;
        function EditDialogState() {
            const [open, setOpen] = useState(false);
            setDialogOpen = setOpen;
            useEffect(() => { dialogOpen = open; }, [open]);
            return null;
        }
        hookProps = {
            setEditDialog: (open) => setDialogOpen(open),
            setSelectedBubble: vi.fn(),
            setSelectedTagId: vi.fn(),
            setEditBubbleSize: vi.fn(),
        };
        const createMouseConstraint = vi.spyOn(Matter.MouseConstraint, 'create');
        // StrictMode as in src/index.jsx: there React calls state updaters a second time.
        const renderApp = () => root.render(<StrictMode><EditDialogState /><Probe /></StrictMode>);
        act(renderApp);
        push(added(task('a')), true);
        // useBubbleWorld puts the visible bodies into the world.
        const { body } = bubbles[0];
        Matter.World.add(refs.engineRef.current.world, body);
        // A user clicks long after the last bubbles update. The provider has re-rendered since,
        // so React runs a setBubbles updater that keeps the state right away and leaves it queued.
        act(renderApp);

        // Matter triggers these from its update tick after a click on the canvas.
        const mouseConstraint = createMouseConstraint.mock.results.at(-1).value;
        const mouse = { position: { ...body.position } };
        act(() => {
            Matter.Events.trigger(mouseConstraint, 'mousedown', { mouse });
            Matter.Events.trigger(mouseConstraint, 'mouseup', { mouse });
        });
        expect(dialogOpen).toBe(true);
        expect(hookProps.setSelectedBubble).toHaveBeenCalledWith(bubbles[0]);
        expect(hookProps.setSelectedTagId).toHaveBeenCalledWith('');
        expect(hookProps.setEditBubbleSize).toHaveBeenCalledWith(50);

        // Save (useBubbleCrud.handleSaveBubble): store the edited bubble, close the dialog.
        act(() => {
            setBubblesState((prev) => prev.map((b) => ({ ...b, updatedAt: '2026-10-15T07:00:00.000Z' })));
            setDialogOpen(false);
        });
        expect(bubbles[0].updatedAt).toBe('2026-10-15T07:00:00.000Z');
        expect(dialogOpen).toBe(false);
    });
});
