import { useCallback, useEffect, useRef, useState } from 'react';
import {
    loadMindmaps,
    saveMindmap,
    deleteMindmap,
    BRANCH_COLORS
} from '../services/mindmapService';

const genId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const createDefaultMap = (title) => {
    const rootId = genId();
    return {
        id: genId(),
        title: title || 'Untitled',
        rootId,
        nodes: [
            {
                id: rootId,
                parentId: null,
                text: title || 'Central idea',
                x: 0,
                y: 0,
                color: '#2C3E50',
                shape: 'rounded',
                fontSize: 22,
                bold: true,
                icon: null,
                imageUrl: null,
                lineStyle: 'solid',
                lineWidth: 8,
                collapsed: false
            }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
};

export const useMindmaps = () => {
    const [maps, setMaps] = useState([]);
    const [currentMapId, setCurrentMapId] = useState(null);
    const [loading, setLoading] = useState(true);

    const saveTimers = useRef(new Map());

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const loaded = await loadMindmaps();
            if (cancelled) return;
            loaded.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
            setMaps(loaded);
            setLoading(false);
        })();
        return () => {
            cancelled = true;
            saveTimers.current.forEach((t) => clearTimeout(t));
            saveTimers.current.clear();
        };
    }, []);

    const scheduleSave = useCallback((map) => {
        const timers = saveTimers.current;
        if (timers.has(map.id)) clearTimeout(timers.get(map.id));
        timers.set(map.id, setTimeout(() => {
            saveMindmap(map);
            timers.delete(map.id);
        }, 600));
    }, []);

    const persistNow = useCallback((map) => {
        const timers = saveTimers.current;
        if (timers.has(map.id)) {
            clearTimeout(timers.get(map.id));
            timers.delete(map.id);
        }
        return saveMindmap(map);
    }, []);

    const createMap = useCallback((title) => {
        const map = createDefaultMap(title);
        setMaps((prev) => [map, ...prev]);
        setCurrentMapId(map.id);
        persistNow(map);
        return map;
    }, [persistNow]);

    const removeMap = useCallback((mapId) => {
        setMaps((prev) => prev.filter((m) => m.id !== mapId));
        setCurrentMapId((cur) => (cur === mapId ? null : cur));
        deleteMindmap(mapId);
    }, []);

    const updateMap = useCallback((mapId, updater) => {
        setMaps((prev) => {
            const next = prev.map((m) => {
                if (m.id !== mapId) return m;
                const updated = { ...updater(m), updatedAt: new Date().toISOString() };
                scheduleSave(updated);
                return updated;
            });
            return next;
        });
    }, [scheduleSave]);

    const renameMap = useCallback((mapId, title) => {
        updateMap(mapId, (m) => ({ ...m, title }));
    }, [updateMap]);

    return {
        maps,
        loading,
        currentMapId,
        setCurrentMapId,
        createMap,
        removeMap,
        updateMap,
        renameMap,
        genId,
        branchColors: BRANCH_COLORS
    };
};
