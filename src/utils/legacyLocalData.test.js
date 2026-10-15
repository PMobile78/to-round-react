import { describe, expect, it } from 'vitest';
import { LS } from './storageKeys';
import { removeLegacyLocalData } from './legacyLocalData';

const memoryStorage = (entries) => {
    const map = new Map(Object.entries(entries));
    return {
        keys: () => [...map.keys()].sort(),
        removeItem: (key) => map.delete(key),
    };
};

describe('removeLegacyLocalData (spec 2, 3.5, 8.2)', () => {
    it('removes the old settings keys and this user\'s copies of tasks and categories', () => {
        const legacy = Object.fromEntries(Object.values(LS).map((key) => [key, '"x"']));
        const storage = memoryStorage({ ...legacy, bubbles_u1: '[]', tags_u1: '[]' });
        removeLegacyLocalData(storage, 'u1');
        expect(storage.keys()).toEqual([]);
    });

    it('keeps what stays on the device: the FAB position, the mind maps and other accounts\' data', () => {
        const storage = memoryStorage({
            'bubbles-fab-position': '{}', 'mindmap-last-open-id': '"m1"', mindmaps_u1: '[]', bubbles_u2: '[]',
        });
        removeLegacyLocalData(storage, 'u1');
        expect(storage.keys()).toEqual(['bubbles-fab-position', 'bubbles_u2', 'mindmap-last-open-id', 'mindmaps_u1']);
    });

    it('does not fail when the storage is blocked', () => {
        const blocked = { removeItem: () => { throw new Error('SecurityError'); } };
        expect(() => removeLegacyLocalData(blocked, 'u1')).not.toThrow();
    });
});
