// @vitest-environment happy-dom
import React, { StrictMode, act, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Matter from 'matter-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    loadBubblesFromFirestore,
    subscribeToBubblesUpdates,
} from '../services/firestoreService';
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
vi.mock('../services/firestoreService', () => ({
    loadBubblesFromFirestore: vi.fn(),
    cleanupOldDeletedBubbles: vi.fn(async (bubbles) => bubbles),
    subscribeToBubblesUpdates: vi.fn(() => vi.fn()),
}));
vi.mock('../utils/logger', () => ({
    default: { error: vi.fn() },
}));

// A bubble document as serializeBubble writes it to user-bubbles/{uid}/bubbles/{id}.
const storedBubble = (id, overrides = {}) => ({
    id,
    radius: 50,
    title: `Task ${id}`,
    description: '',
    fillStyle: 'transparent',
    strokeStyle: '#3B7DED',
    tagId: null,
    status: 'active',
    createdAt: '2026-10-14T20:00:00.000Z',
    updatedAt: '2026-10-14T20:00:00.000Z',
    deletedAt: null,
    dueDate: null,
    tz: 'Europe/Kyiv',
    notifications: [],
    recurrence: null,
    overdueSticky: false,
    overdueAt: null,
    overduePulseSuppressed: false,
    useRichText: false,
    ...overrides,
});

// Let loadInitialBubbles' awaits settle.
const flushLoad = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

describe('useMatterEngine', () => {
    let container;
    let root;
    let refs;
    let hookProps; // per-test overrides of the hook's props
    let bubbles; // latest committed bubbles state
    let setBubblesState; // the bubbles setter, for updates the page makes itself (Save)
    let committedBodies; // every Matter body that reached a committed bubbles state

    const pushSnapshot = (docs) => {
        const listener = subscribeToBubblesUpdates.mock.calls[0][0];
        act(() => listener(docs));
    };

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
        refs = {
            canvasRef: { current: container },
            engineRef: { current: null },
            renderRef: { current: null },
            wallsRef: { current: [] },
            stickyPulseRef: { current: new Set() },
            lastDueRef: { current: new Map() },
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

    it('gives a bubble created on another device a Matter body', async () => {
        loadBubblesFromFirestore.mockResolvedValue([storedBubble('local')]);
        act(() => root.render(<Probe />));
        await flushLoad();
        const localBody = bubbles[0].body;

        const remote = storedBubble('remote', { radius: 40, title: 'Created elsewhere', useRichText: true });
        pushSnapshot([storedBubble('local'), remote]);

        const added = bubbles.find((b) => b.id === 'remote');
        expect(added).toMatchObject({ title: 'Created elsewhere', radius: 40, useRichText: true, tz: 'Europe/Kyiv' });
        expect(added.body).toBeDefined();
        expect(added.body.circleRadius).toBe(40);
        expect(bubbles.find((b) => b.id === 'local').body).toBe(localBody);
    });

    it('creates the body only once when the same remote doc is delivered twice', async () => {
        loadBubblesFromFirestore.mockResolvedValue([]);
        act(() => root.render(<Probe />));
        await flushLoad();

        pushSnapshot([storedBubble('remote')]);
        const body = bubbles[0].body;
        pushSnapshot([storedBubble('remote')]);

        expect(bubbles).toHaveLength(1);
        expect(bubbles[0].body).toBe(body);
    });

    it("styles a remote bubble's body with its tag fill and stored stroke", async () => {
        hookProps = {
            tags: [{ id: 'work', name: 'Work', color: '#2e7d32' }],
            getBubbleFillStyle: (tagColor) => (tagColor ? `fill ${tagColor}` : 'fill none'),
        };
        loadBubblesFromFirestore.mockResolvedValue([]);
        act(() => root.render(<Probe />));
        await flushLoad();

        pushSnapshot([storedBubble('remote', { tagId: 'work', strokeStyle: '#123456' })]);

        expect(bubbles[0].body.render).toMatchObject({ fillStyle: 'fill #2e7d32', strokeStyle: '#123456', lineWidth: 1.5 });
    });

    it('keeps the Matter body when another device edits a bubble', async () => {
        loadBubblesFromFirestore.mockResolvedValue([storedBubble('a')]);
        act(() => root.render(<Probe />));
        await flushLoad();
        const body = bubbles[0].body;

        pushSnapshot([storedBubble('a', { title: 'Renamed elsewhere', radius: 70 })]);

        expect(bubbles[0]).toMatchObject({ title: 'Renamed elsewhere', radius: 70 });
        expect(bubbles[0].body).toBe(body);
    });

    it('removes the Matter body of a bubble deleted on another device', async () => {
        loadBubblesFromFirestore.mockResolvedValue([storedBubble('a'), storedBubble('b')]);
        act(() => root.render(<Probe />));
        await flushLoad();
        // useBubbleWorld puts the visible bodies into the world.
        const world = refs.engineRef.current.world;
        bubbles.forEach((b) => Matter.World.add(world, b.body));
        const deletedBody = bubbles.find((b) => b.id === 'b').body;

        pushSnapshot([storedBubble('a')]);

        expect(bubbles.map((b) => b.id)).toEqual(['a']);
        expect(world.bodies.includes(deletedBody)).toBe(false);
    });

    it('leaves no orphaned body when a cache snapshot lands before the initial load', async () => {
        // persistentLocalCache: the listener's first snapshot can come from IndexedDB before
        // getDocs answers; setBubbles(initialBubbles) then replaces that state.
        let resolveLoad;
        loadBubblesFromFirestore.mockReturnValue(new Promise((resolve) => { resolveLoad = resolve; }));
        act(() => root.render(<Probe />));

        pushSnapshot([storedBubble('a'), storedBubble('b')]);
        resolveLoad([storedBubble('a'), storedBubble('b')]);
        await flushLoad();

        // useBubbleWorld adds every committed body to the Matter world, so a body that is no
        // longer in state stays there as an unlabeled ghost bubble.
        const finalBodies = bubbles.map((b) => b.body);
        expect(finalBodies.every(Boolean)).toBe(true);
        const orphanBodyIds = [...committedBodies]
            .filter((body) => !finalBodies.includes(body))
            .map((body) => body.id);
        expect(orphanBodyIds).toEqual([]);
    });

    it('places a body created after a resize inside the current canvas', async () => {
        loadBubblesFromFirestore.mockResolvedValue([]);
        act(() => root.render(<Probe />));
        await flushLoad();
        // The canvas shrank (window resize, phone rotation); useMatterResize →
        // updateRenderAndBounds keeps render.options in step with it.
        refs.renderRef.current.options.width = 300;
        refs.renderRef.current.options.height = 400;
        vi.spyOn(Math, 'random').mockReturnValue(0.999);

        pushSnapshot([storedBubble('remote', { radius: 40 })]);

        const { x, y } = bubbles[0].body.position;
        expect(x).toBeLessThanOrEqual(300 - 40);
        expect(y).toBeLessThanOrEqual(400 - 40);
    });

    it('keeps the edit dialog closed after Save when a canvas click opened it', async () => {
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
        loadBubblesFromFirestore.mockResolvedValue([storedBubble('a')]);
        // StrictMode as in src/index.jsx: there React calls state updaters a second time.
        const renderApp = () => root.render(<StrictMode><EditDialogState /><Probe /></StrictMode>);
        act(renderApp);
        await flushLoad();
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
