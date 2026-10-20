// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { checkMigration, runMigration } from '../services/data/migration';
import { logoutUser } from '../services/authService';
import { createDefaultSettings } from '../contract/schema';
import MigrationGate from './MigrationGate';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../firebase', () => ({ db: 'db' }));
vi.mock('../services/data/migration', async (importOriginal) => ({
    ...(await importOriginal()),
    checkMigration: vi.fn(),
    runMigration: vi.fn(),
}));
vi.mock('../services/authService', () => ({ logoutUser: vi.fn() }));
vi.mock('../utils/logger', () => ({ default: { error: vi.fn() } }));
vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key, values) => (values ? `${key} ${JSON.stringify(values)}` : key) }),
}));

const SETTINGS = createDefaultSettings('uk');
// One v1 task with a 15-minute reminder, which the move rounds to an hour (spec 9.2).
const V1 = {
    bubbles: [{ id: 'a1', title: 'Pay bills', status: 'active', dueDate: '2026-11-02T09:00', tz: 'Europe/Kyiv', notifications: ['15m'] }],
    tags: [],
};

describe('MigrationGate: the app waits for the move from v1 (spec 9.1)', () => {
    let container;
    let root;

    const mount = async () => {
        await act(async () => root.render(<MigrationGate uid="u1" settings={SETTINGS}><p>the app</p></MigrationGate>));
    };
    const button = (text) => Array.from(document.querySelectorAll('button')).find((el) => el.textContent === text);
    const text = () => document.body.textContent;

    beforeEach(() => {
        vi.resetAllMocks();
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        vi.useRealTimers();
        act(() => root.unmount());
        container.remove();
    });

    it('shows the app at once when there is nothing to move', async () => {
        checkMigration.mockResolvedValue(null);
        await mount();
        expect(checkMigration).toHaveBeenCalledWith('db', 'u1');
        expect(text()).toContain('the app');
    });

    it('holds the app back while it checks', async () => {
        checkMigration.mockReturnValue(new Promise(() => {}));
        await mount();
        expect(text()).not.toContain('the app');
        expect(document.querySelector('[role="progressbar"]')).not.toBeNull();
    });

    it('shows the preview and moves on "Move", then shows the app', async () => {
        checkMigration.mockResolvedValue(V1);
        runMigration.mockResolvedValue(undefined);
        await mount();
        expect(text()).not.toContain('the app');
        expect(text()).toContain('migration.counts {"tasks":1,"categories":0}');
        expect(text()).toContain('Pay bills');
        await act(async () => button('migration.move').click());
        expect(runMigration).toHaveBeenCalledWith('db', 'u1', expect.objectContaining({
            tasks: [expect.objectContaining({ id: 'a1', reminders: [60] })],
        }), SETTINGS, expect.any(Function));
        expect(text()).toContain('the app');
    });

    it('shows the progress of the move', async () => {
        checkMigration.mockResolvedValue(V1);
        let progress;
        runMigration.mockImplementation((db, uid, plan, settings, onProgress) => {
            progress = onProgress;
            return new Promise(() => {});
        });
        await mount();
        await act(async () => button('migration.move').click());
        act(() => progress(1, 2));
        expect(text()).toContain('migration.moving {"done":1,"total":2}');
    });

    it('signs out on "Postpone" and writes nothing', async () => {
        checkMigration.mockResolvedValue(V1);
        await mount();
        await act(async () => button('migration.postpone').click());
        expect(logoutUser).toHaveBeenCalledTimes(1);
        expect(runMigration).not.toHaveBeenCalled();
    });

    it('says when the move stops, and "Try again" picks it up', async () => {
        checkMigration.mockResolvedValue(V1);
        runMigration.mockRejectedValueOnce(new Error('unavailable')).mockResolvedValueOnce(undefined);
        await mount();
        await act(async () => button('migration.move').click());
        expect(text()).toContain('migration.moveFailed');
        await act(async () => button('migration.retry').click());
        expect(checkMigration).toHaveBeenCalledTimes(2);
        await act(async () => button('migration.move').click());
        expect(text()).toContain('the app');
    });

    it('says when the old data cannot be read, and tries again', async () => {
        checkMigration.mockRejectedValueOnce(new Error('unavailable')).mockResolvedValueOnce(null);
        await mount();
        expect(text()).toContain('migration.checkFailed');
        await act(async () => button('migration.retry').click());
        expect(text()).toContain('the app');
    });

    // Right after a sign-in another open tab of the app can still answer for this one with the
    // previous account (the Firestore cache shared by the tabs) until it wakes up, about once a
    // minute in the background, and the rules refuse the check until then.
    const refusal = () => Object.assign(new Error('Missing or insufficient permissions.'), { code: 'permission-denied' });

    it('checks again while the check right after sign-in is refused, then shows the app', async () => {
        vi.useFakeTimers();
        checkMigration.mockRejectedValueOnce(refusal()).mockRejectedValueOnce(refusal())
            .mockRejectedValueOnce(refusal()).mockResolvedValueOnce(null);
        await mount();
        await act(async () => vi.advanceTimersByTimeAsync(6000));
        expect(text()).not.toContain('migration.checkFailed');
        expect(document.querySelector('[role="progressbar"]')).not.toBeNull();
        await act(async () => vi.advanceTimersByTimeAsync(3000));
        expect(checkMigration).toHaveBeenCalledTimes(4);
        expect(text()).toContain('the app');
    });

    it('says the old data cannot be read when the check is still refused after a minute and a half', async () => {
        vi.useFakeTimers();
        checkMigration.mockRejectedValue(refusal());
        await mount();
        await act(async () => vi.advanceTimersByTimeAsync(87000));
        expect(text()).not.toContain('migration.checkFailed');
        await act(async () => vi.advanceTimersByTimeAsync(3000));
        expect(checkMigration).toHaveBeenCalledTimes(31);
        expect(text()).toContain('migration.checkFailed');
    });

    it('stops checking for an account that signed out', async () => {
        vi.useFakeTimers();
        checkMigration.mockImplementation((db, uid) => (uid === 'u1' ? Promise.reject(refusal()) : Promise.resolve(null)));
        await mount();
        await act(async () => root.render(<MigrationGate uid="u2" settings={SETTINGS}><p>the app</p></MigrationGate>));
        await act(async () => vi.advanceTimersByTimeAsync(90000));
        expect(checkMigration.mock.calls.filter(([, uid]) => uid === 'u1')).toHaveLength(1);
        expect(text()).toContain('the app');
    });
});
