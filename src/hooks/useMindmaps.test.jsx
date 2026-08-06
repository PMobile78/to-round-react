// @vitest-environment happy-dom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteMindmap, loadMindmaps, saveMindmap } from '../services/mindmapService';
import logger from '../utils/logger';
import { useMindmaps } from './useMindmaps';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../services/mindmapService', () => ({
    loadMindmaps: vi.fn(),
    saveMindmap: vi.fn(() => Promise.resolve()),
    deleteMindmap: vi.fn(() => Promise.resolve()),
    BRANCH_COLORS: [],
}));
vi.mock('../utils/logger', () => ({
    default: { error: vi.fn() },
}));

const maps = [
    { id: 'map-a', title: 'A', updatedAt: '2026-01-02T00:00:00.000Z', nodes: [] },
    { id: 'map-b', title: 'B', updatedAt: '2026-01-01T00:00:00.000Z', nodes: [] },
];

describe('useMindmaps persistence timers', () => {
    let container;
    let root;
    let handlers;

    beforeEach(async () => {
        vi.useFakeTimers();
        loadMindmaps.mockResolvedValue(maps.map((map) => ({ ...map })));
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);

        function Probe() {
            handlers = useMindmaps();
            return null;
        }
        await act(async () => root.render(<Probe />));
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
        window.localStorage.clear();
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    it('does not restore a map when it is edited and deleted before autosave', async () => {
        act(() => handlers.updateMap('map-a', (map) => ({ ...map, title: 'Edited' })));

        await act(async () => {
            await handlers.removeMap('map-a');
        });
        await act(async () => vi.advanceTimersByTimeAsync(600));

        expect(deleteMindmap).toHaveBeenCalledWith('map-a');
        expect(saveMindmap).not.toHaveBeenCalled();
        expect(handlers.maps.map((map) => map.id)).toEqual(['map-b']);
    });

    it('keeps the map and reports the error when deletion fails', async () => {
        const error = new Error('delete failed');
        deleteMindmap.mockRejectedValueOnce(error);

        await act(async () => {
            await handlers.removeMap('map-a');
        });

        expect(logger.error).toHaveBeenCalledWith('Error deleting mindmap:', error);
        expect(handlers.maps.map((map) => map.id)).toEqual(['map-a', 'map-b']);
    });

    it('keeps autosave timers for different maps independent', async () => {
        act(() => handlers.updateMap('map-a', (map) => ({ ...map, title: 'Edited A' })));
        await act(async () => vi.advanceTimersByTimeAsync(300));
        act(() => handlers.updateMap('map-b', (map) => ({ ...map, title: 'Edited B' })));

        await act(async () => vi.advanceTimersByTimeAsync(300));
        expect(saveMindmap).toHaveBeenCalledTimes(1);
        expect(saveMindmap).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'map-a' }));

        await act(async () => vi.advanceTimersByTimeAsync(300));
        expect(saveMindmap).toHaveBeenCalledTimes(2);
        expect(saveMindmap).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'map-b' }));
    });
});
