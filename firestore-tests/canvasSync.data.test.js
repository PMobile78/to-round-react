// @vitest-environment happy-dom
/**
 * Issues #94 and #101 with two real Firestore clients on the emulator: device A writes tasks
 * through the data layer (one by one, or a whole backup import), device B is the canvas itself
 * (useMatterEngine fed by subscribeTasks), which has to show every change without a reload and
 * with exactly one Matter body per task.
 * No JSX: the rules config collects plain *.test.js files.
 */
import { createElement, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Matter from 'matter-js';
import { describe, it, beforeAll, afterAll, afterEach, beforeEach, expect, vi } from 'vitest';
import { OWNER, setupRulesEnv } from './helpers';
import { createTask, deleteTaskForever, newTaskId, subscribeTasks, updateTask } from '../src/services/data/tasks';
import { commitInBatches, planImport } from '../src/services/data/backup';
import { useMatterEngine } from '../src/hooks/useMatterEngine';

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

// Snapshots travel through the emulator: give them more than vi.waitFor's default 1 s,
// a cold CI runner can be slow to open the first connection.
const SYNC_WAIT = { timeout: 10000 };
const FIELDS = { title: 'Water plants', description: '', categoryId: null, due: null, reminders: [], repeat: null, radius: 45 };

let env;

beforeAll(async () => { env = await setupRulesEnv(); });
afterEach(async () => { await env.clearFirestore(); });
afterAll(async () => { await env.cleanup(); });

describe('canvas sync between two devices (#94, Firestore emulator)', () => {
    let container;
    let root;
    let refs;
    let bubbles; // device B's latest committed bubbles
    let bodiesById; // id -> every Matter body that reached a committed state on device B

    function DeviceB({ db }) {
        const [state, setBubbles] = useState([]);
        useMatterEngine({
            ...refs,
            editDialog: false,
            selectedBubble: null,
            bubbles: state,
            subscribeTasks: (onChanges, onError) => subscribeTasks(db, OWNER, onChanges, onError),
            setBubbles,
            setCanvasSize: vi.fn(),
            setSelectedBubble: vi.fn(),
            setSelectedTagId: vi.fn(),
            setEditBubbleSize: vi.fn(),
            setEditDialog: vi.fn(),
            setEditDue: vi.fn(),
            setEditReminders: vi.fn(),
            setEditRepeat: vi.fn(),
            isMobile: false,
            themeMode: 'light',
            tags: [],
            dropSpeed: 1,
            getBubbleFillStyle: () => 'rgba(0, 0, 0, 0)',
            getCanvasSize: () => ({ width: 800, height: 600 }),
            theme: {},
        });
        useEffect(() => {
            bubbles = state;
            state.forEach((b) => {
                if (!bodiesById.has(b.id)) bodiesById.set(b.id, new Set());
                bodiesById.get(b.id).add(b.body);
                // useBubbleWorld puts the bodies of visible bubbles into the world.
                if (!refs.engineRef.current.world.bodies.includes(b.body)) Matter.World.add(refs.engineRef.current.world, b.body);
            });
        }, [state]);
        return null;
    }

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        bubbles = undefined;
        bodiesById = new Map();
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
        root.unmount();
        container.remove();
    });

    it('shows a task added, edited and deleted on device A on device B, one body per task', async () => {
        const deviceA = env.authenticatedContext(OWNER).firestore();
        const local = newTaskId(deviceA, OWNER);
        await createTask(deviceA, OWNER, local, FIELDS);
        root.render(createElement(DeviceB, { db: env.authenticatedContext(OWNER).firestore() }));
        await vi.waitFor(() => expect(bubbles?.[0]?.body).toBeDefined(), SYNC_WAIT);

        const remote = newTaskId(deviceA, OWNER);
        await createTask(deviceA, OWNER, remote, { ...FIELDS, title: 'Written on device A', radius: 40 });
        await vi.waitFor(() => expect(bubbles.map((b) => b.id)).toContain(remote), SYNC_WAIT);
        const added = bubbles.find((b) => b.id === remote);
        expect(added).toMatchObject({ title: 'Written on device A', radius: 40 });
        expect(added.body.circleRadius).toBe(40);

        await updateTask(deviceA, OWNER, remote, { title: 'Renamed on device A' });
        await vi.waitFor(() => expect(bubbles.find((b) => b.id === remote).title).toBe('Renamed on device A'), SYNC_WAIT);
        expect(bubbles.find((b) => b.id === remote).body).toBe(added.body);

        await deleteTaskForever(deviceA, OWNER, local);
        await vi.waitFor(() => expect(bubbles.map((b) => b.id)).toEqual([remote]), SYNC_WAIT);
        const circles = refs.engineRef.current.world.bodies.filter((body) => body.label === 'Circle Body');
        expect(circles).toEqual([added.body]);
        expect([...bodiesById.get(remote)]).toEqual([added.body]);
    });

    it('shows an imported backup without a reload: its tasks only, one body each, also after the same import again (#101)', async () => {
        const deviceA = env.authenticatedContext(OWNER).firestore();
        await createTask(deviceA, OWNER, 'old1', FIELDS);
        await createTask(deviceA, OWNER, 'old2', { ...FIELDS, title: 'Not in the backup' });
        root.render(createElement(DeviceB, { db: env.authenticatedContext(OWNER).firestore() }));
        await vi.waitFor(() => expect(bubbles?.length).toBe(2), SYNC_WAIT);
        const keptBody = bubbles.find((b) => b.id === 'old1').body;

        const backupTask = (id, title) => ({
            id, title, description: '', categoryId: null, status: 'active', due: null, reminders: [], repeat: null,
            radius: 45, pulseMuted: false, createdAt: '2026-02-01T08:00:00.000Z', updatedAt: '2026-02-02T08:00:00.000Z', deletedAt: null,
        });
        const backup = { version: 2, settings: null, categories: [], tasks: [backupTask('old1', 'Kept and renamed'), backupTask('new1', 'From the backup')] };
        const importBackup = async () => {
            const { writes } = await planImport(deviceA, OWNER, backup);
            await commitInBatches(deviceA, OWNER, writes);
        };

        await importBackup();
        await vi.waitFor(() => expect(bubbles.map((b) => b.title).sort()).toEqual(['From the backup', 'Kept and renamed']), SYNC_WAIT);
        await importBackup();
        // The second import updates both tasks: wait until device B has seen it.
        await vi.waitFor(() => expect(bubbles.find((b) => b.id === 'new1').updatedAt).not.toBe('2026-02-02T08:00:00.000Z'), SYNC_WAIT);

        const circles = refs.engineRef.current.world.bodies.filter((body) => body.label === 'Circle Body');
        expect(circles).toHaveLength(2);
        expect(bubbles.find((b) => b.id === 'old1').body).toBe(keptBody);
        expect(['old1', 'new1'].map((id) => bodiesById.get(id).size)).toEqual([1, 1]);
    });
});
