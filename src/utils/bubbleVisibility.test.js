import { describe, it, expect, vi } from 'vitest';

// bubbleVisibility imports BUBBLE_STATUS from firestoreService, which initializes
// Firebase at module load. Mock the Firebase layer so the pure helpers can be
// imported in the test environment (same approach as the useBubbleFilters /
// useListFilters tests).
vi.mock('../firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
    doc: () => ({}),
    setDoc: () => {},
    updateDoc: () => {},
    deleteDoc: () => {},
    getDocs: () => {},
    collection: () => ({}),
    writeBatch: () => ({}),
    serverTimestamp: () => ({})
}));

import { selectVisibleBubbles, computeBubbleSearchRender, countActiveBubblesByTag } from './bubbleVisibility';

// --- helpers -----------------------------------------------------------------
const tag = (id, color = '#123456') => ({ id, name: id, color });
const bub = (id, status, tagId = null, extra = {}) => ({ id, status, tagId, ...extra });
const ids = (arr) => arr.map((b) => b.id).sort();

const T1 = tag('t1', '#ff0000');
const T2 = tag('t2', '#00ff00');

describe('countActiveBubblesByTag', () => {
    it('counts only ACTIVE bubbles for a given tag (excludes done/deleted)', () => {
        const bubbles = [
            bub('a', 'active', 't1'),
            bub('b', 'active', 't1'),
            bub('c', 'done', 't1'),
            bub('d', 'deleted', 't1'),
            bub('e', 'active', 't2'),
        ];
        expect(countActiveBubblesByTag(bubbles, [T1, T2], 't1')).toBe(2);
        expect(countActiveBubblesByTag(bubbles, [T1, T2], 't2')).toBe(1);
    });

    it('tagId === null counts active untagged bubbles and bubbles whose tag was deleted', () => {
        const bubbles = [
            bub('a', 'active', null),   // untagged
            bub('b', 'active', 'gone'), // tag no longer exists
            bub('c', 'active', 't1'),   // tagged, existing
            bub('d', 'done', null),     // untagged but not active
        ];
        expect(countActiveBubblesByTag(bubbles, [T1, T2], null)).toBe(2);
    });
});

describe('selectVisibleBubbles', () => {
    it('returns only active bubbles (drops done/deleted/postpone) when all tags selected', () => {
        const bubbles = [
            bub('a', 'active', 't1'),
            bub('b', 'done', 't1'),
            bub('c', 'deleted', 't2'),
            bub('d', 'postpone', null),
            bub('e', 'active', null),
        ];
        const result = selectVisibleBubbles({
            bubbles,
            tags: [T1, T2],
            filterTags: ['t1', 't2'],
            showNoTag: true,
            bubbleViewPlannedTasksOnly: false,
        });
        expect(ids(result)).toEqual(['a', 'e']);
    });

    it('with specific filterTags and showNoTag=false returns only those tagged bubbles', () => {
        const bubbles = [
            bub('a', 'active', 't1'),
            bub('b', 'active', 't2'),
            bub('c', 'active', null),
        ];
        const result = selectVisibleBubbles({
            bubbles,
            tags: [T1, T2],
            filterTags: ['t1'],
            showNoTag: false,
            bubbleViewPlannedTasksOnly: false,
        });
        expect(ids(result)).toEqual(['a']);
    });

    it('showNoTag=true includes untagged bubbles and bubbles whose tag was deleted', () => {
        const bubbles = [
            bub('a', 'active', 't1'),
            bub('b', 'active', null),       // no tag
            bub('c', 'active', 'ghost'),    // tag no longer exists
        ];
        const result = selectVisibleBubbles({
            bubbles,
            tags: [T1, T2],
            filterTags: ['t1'],
            showNoTag: true,
            bubbleViewPlannedTasksOnly: false,
        });
        expect(ids(result)).toEqual(['a', 'b', 'c']);
    });

    it('showNoTag=false excludes untagged and deleted-tag bubbles', () => {
        const bubbles = [
            bub('a', 'active', 't1'),
            bub('b', 'active', null),
            bub('c', 'active', 'ghost'),
        ];
        const result = selectVisibleBubbles({
            bubbles,
            tags: [T1, T2],
            filterTags: ['t1'],
            showNoTag: false,
            bubbleViewPlannedTasksOnly: false,
        });
        expect(ids(result)).toEqual(['a']);
    });

    // Regression for the spirit of e1efb8e at the selector level: an empty `tags`
    // snapshot must NOT collapse the result (neither hit the "all selected" shortcut
    // nor wipe everything). With showNoTag=true every active bubble is treated as
    // "no tag" and stays visible.
    it('empty tags + showNoTag=true keeps all active bubbles (no collapse)', () => {
        const bubbles = [
            bub('a', 'active', 't1'),
            bub('b', 'active', null),
            bub('c', 'done', 't1'),
        ];
        const result = selectVisibleBubbles({
            bubbles,
            tags: [],
            filterTags: ['t1'],
            showNoTag: true,
            bubbleViewPlannedTasksOnly: false,
        });
        expect(ids(result)).toEqual(['a', 'b']);
    });

    it('empty tags + showNoTag=false + non-empty filterTags returns nothing (no "show all")', () => {
        const bubbles = [
            bub('a', 'active', 't1'),
            bub('b', 'active', null),
        ];
        const result = selectVisibleBubbles({
            bubbles,
            tags: [],
            filterTags: ['t1'],
            showNoTag: false,
            bubbleViewPlannedTasksOnly: false,
        });
        expect(result).toEqual([]);
    });

    it('bubbleViewPlannedTasksOnly keeps only future-due, non-done, non-deleted bubbles', () => {
        const now = new Date('2026-06-15T12:00:00Z');
        const future = '2026-06-20T12:00:00Z';
        const past = '2026-06-10T12:00:00Z';
        const bubbles = [
            bub('future', 'active', 't1', { dueDate: future }),
            bub('past', 'active', 't1', { dueDate: past }),
            bub('noDue', 'active', 't1'),
        ];
        const result = selectVisibleBubbles(
            {
                bubbles,
                tags: [T1, T2],
                filterTags: ['t1', 't2'],
                showNoTag: true,
                bubbleViewPlannedTasksOnly: true,
            },
            now
        );
        expect(ids(result)).toEqual(['future']);
    });
});

describe('computeBubbleSearchRender', () => {
    const theme = { custom: { bubble: { strokeWidth: 1.5, highlightStrokeWidth: 2.5 } } };

    it('no active search: opacity 1, original tag stroke, no glow', () => {
        const r = computeBubbleSearchRender({ tagColor: '#ff0000', isFound: false, hasSearchQuery: false, theme });
        expect(r).toEqual({
            opacity: 1,
            strokeStyle: '#ff0000',
            lineWidth: 1.5,
            shadowColor: 'transparent',
            shadowBlur: 0,
        });
    });

    it('active search + found: full opacity, highlight stroke + glow', () => {
        const r = computeBubbleSearchRender({ tagColor: '#ff0000', isFound: true, hasSearchQuery: true, theme });
        expect(r).toEqual({
            opacity: 1,
            strokeStyle: '#ff0000',
            lineWidth: 2.5,
            shadowColor: '#ff0000',
            shadowBlur: 15,
            shadowOffsetX: 0,
            shadowOffsetY: 0,
        });
    });

    it('active search + not found: dimmed opacity, original stroke, no glow', () => {
        const r = computeBubbleSearchRender({ tagColor: '#ff0000', isFound: false, hasSearchQuery: true, theme });
        expect(r.opacity).toBe(0.3);
        expect(r.strokeStyle).toBe('#ff0000');
        expect(r.shadowBlur).toBe(0);
    });

    it('falls back to grey when no tag color', () => {
        const r = computeBubbleSearchRender({ tagColor: null, isFound: true, hasSearchQuery: true, theme });
        expect(r.strokeStyle).toBe('#B0B0B0');
        expect(r.shadowColor).toBe('#B0B0B0');
    });

    it('falls back to default stroke widths when theme has no custom bubble config', () => {
        const found = computeBubbleSearchRender({ tagColor: '#ff0000', isFound: true, hasSearchQuery: true, theme: {} });
        const normal = computeBubbleSearchRender({ tagColor: '#ff0000', isFound: false, hasSearchQuery: false, theme: {} });
        expect(found.lineWidth).toBe(2.5);
        expect(normal.lineWidth).toBe(1.5);
    });
});
