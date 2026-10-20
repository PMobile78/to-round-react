// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { commitInBatches, exportBackup, planImport } from '../services/data/backup';
import { saveJsonFile } from '../utils/saveJsonFile';
import { useBackup } from './useBackup';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../firebase', () => ({ db: 'db' }));
vi.mock('../services/data/backup', () => ({ exportBackup: vi.fn(), planImport: vi.fn(), commitInBatches: vi.fn() }));
vi.mock('../utils/saveJsonFile', () => ({ saveJsonFile: vi.fn() }));
vi.mock('../utils/logger', () => ({ default: { error: vi.fn() } }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ i18n: { language: 'uk' } }) }));

const fileOf = (content) => new window.File([typeof content === 'string' ? content : JSON.stringify(content)], 'backup.json');
const V2 = { format: 'to-round-backup', version: 2, exportedAt: '2026-10-20T12:00:00.000Z', categories: [], tasks: [] };
const PLAN = {
    writes: [{ type: 'delete', path: ['tasks', 't1'] }, { type: 'delete', path: ['tasks', 't2'] }],
    counts: { tasks: 0, categories: 0, settings: false, deletedTasks: 2, deletedCategories: 0 },
};

describe('useBackup: the backup export and import of the menu (spec 10)', () => {
    let container;
    let root;
    let result;

    function Probe() {
        result = useBackup('u1');
        return null;
    }

    beforeEach(async () => {
        vi.resetAllMocks();
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        await act(async () => root.render(<Probe />));
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
    });

    it('saves the export as a file named by the date and time', async () => {
        exportBackup.mockResolvedValue(V2);
        await act(async () => result.exportBackup());
        expect(exportBackup).toHaveBeenCalledWith('db', 'u1');
        expect(saveJsonFile).toHaveBeenCalledWith(expect.stringMatching(/^to-round-backup-\d{4}-\d{2}-\d{2}-\d{4}\.json$/), V2);
        expect(result.state).toBeNull();
    });

    it('says so when the export fails', async () => {
        exportBackup.mockRejectedValue(new Error('unavailable'));
        await act(async () => result.exportBackup());
        expect(result.state).toEqual({ step: 'error', error: { key: 'backup.exportFailed' } });
    });

    it.each([
        ['that is not JSON', 'oops', { key: 'backup.notJson' }],
        ['that is not a backup', { bubbles: 1 }, { key: 'backup.notBackup' }],
        ['of another version', { format: 'to-round-backup', version: 3, categories: [], tasks: [] }, { key: 'backup.unsupported' }],
        ['with a record that cannot be read', { ...V2, tasks: [{ id: 't1' }] }, { key: 'backup.invalid', values: { n: 1 } }],
    ])('refuses a file %s before anything is read or written', async (_, content, error) => {
        await act(async () => result.importFile(fileOf(content)));
        expect(result.state).toEqual({ step: 'error', error });
        expect(planImport).not.toHaveBeenCalled();
    });

    it('asks with the numbers, then writes and shows the progress', async () => {
        planImport.mockResolvedValue(PLAN);
        await act(async () => result.importFile(fileOf(V2)));
        expect(planImport).toHaveBeenCalledWith('db', 'u1', { version: 2, settings: null, categories: [], tasks: [] });
        expect(result.state).toEqual({ step: 'confirm', version: 2, counts: PLAN.counts });
        expect(commitInBatches).not.toHaveBeenCalled();

        let progress;
        let finish;
        commitInBatches.mockImplementation((db, uid, writes, onProgress) => {
            progress = onProgress;
            return new Promise((resolve) => { finish = resolve; });
        });
        act(() => { result.confirmImport(); });
        expect(commitInBatches).toHaveBeenCalledWith('db', 'u1', PLAN.writes, expect.any(Function));
        expect(result.state).toEqual({ step: 'writing', done: 0, total: 2 });
        act(() => progress(1, 2));
        expect(result.state).toEqual({ step: 'writing', done: 1, total: 2 });
        await act(async () => finish());
        expect(result.state).toEqual({ step: 'done' });
    });

    it('says how much was saved when a batch fails', async () => {
        planImport.mockResolvedValue(PLAN);
        commitInBatches.mockRejectedValue(Object.assign(new Error('permission-denied'), { committed: 1 }));
        await act(async () => result.importFile(fileOf(V2)));
        await act(async () => result.confirmImport());
        expect(result.state).toEqual({ step: 'error', error: { key: 'backup.writeFailed', values: { done: 1, total: 2 } } });
    });

    it('says so when the current data cannot be read', async () => {
        planImport.mockRejectedValue(new Error('unavailable'));
        await act(async () => result.importFile(fileOf(V2)));
        expect(result.state).toEqual({ step: 'error', error: { key: 'backup.readFailed' } });
    });

    it('closes without writing', async () => {
        planImport.mockResolvedValue(PLAN);
        await act(async () => result.importFile(fileOf(V2)));
        act(() => result.close());
        expect(result.state).toBeNull();
        expect(commitInBatches).not.toHaveBeenCalled();
    });
});
