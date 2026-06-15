import { describe, it, expect, vi } from 'vitest';

// useBubbleFilters imports firestoreService (for BUBBLE_STATUS), which initializes
// Firebase at module load. Mock the Firebase layer so the pure helpers can be
// imported in the node test environment (same approach as buildStatusFields.test).
vi.mock('../../firebase', () => ({ db: {} }));
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

import {
    toggleTagInFilter,
    isAllTagsSelected,
    countBubblesByTagForBubblesView
} from '../useBubbleFilters';

const tag = (id) => ({ id, name: id, color: '#000' });
const bubble = (id, tagId, status = 'active') => ({ id, tagId, status });

describe('toggleTagInFilter (handleTagFilterChange)', () => {
    it('adds a tag that is not selected', () => {
        expect(toggleTagInFilter(['a'], 'b')).toEqual(['a', 'b']);
    });

    it('removes a tag that is already selected', () => {
        expect(toggleTagInFilter(['a', 'b'], 'a')).toEqual(['b']);
    });

    it('does not mutate the input array', () => {
        const input = ['a'];
        toggleTagInFilter(input, 'b');
        expect(input).toEqual(['a']);
    });
});

describe('isAllTagsSelected (isAllSelected)', () => {
    const tags = [tag('a'), tag('b')];

    it('is true when every tag is selected and "no tag" is shown (selectAllFilters)', () => {
        expect(isAllTagsSelected(tags, ['a', 'b'], true)).toBe(true);
    });

    it('is false after clearAllFilters (no tags, no "no tag")', () => {
        expect(isAllTagsSelected(tags, [], false)).toBe(false);
    });

    it('is false when some tags are missing', () => {
        expect(isAllTagsSelected(tags, ['a'], true)).toBe(false);
    });

    it('is false when all tags selected but "no tag" is hidden', () => {
        expect(isAllTagsSelected(tags, ['a', 'b'], false)).toBe(false);
    });

    it('is false when there are no tags at all', () => {
        expect(isAllTagsSelected([], [], true)).toBe(false);
    });
});

describe('countBubblesByTagForBubblesView (getBubbleCountByTagForBubblesView)', () => {
    const tags = [tag('a'), tag('b')];
    const bubbles = [
        bubble('1', 'a'),
        bubble('2', 'a'),
        bubble('3', 'b'),
        bubble('4', null),            // no tag
        bubble('5', 'deleted-tag'),   // tag no longer exists
        bubble('6', 'a', 'deleted')   // not active -> excluded when no search
    ];

    it('counts only active bubbles for a tag when there is no search', () => {
        const count = countBubblesByTagForBubblesView(
            { bubbles, tags, searchFoundBubbles: [], debouncedSearchQuery: '' },
            'a'
        );
        expect(count).toBe(2); // bubbles 1 and 2 (6 is not active)
    });

    it('counts bubbles without a tag or with a deleted tag for tagId null', () => {
        const count = countBubblesByTagForBubblesView(
            { bubbles, tags, searchFoundBubbles: [], debouncedSearchQuery: '' },
            null
        );
        expect(count).toBe(2); // bubble 4 (no tag) + bubble 5 (deleted tag)
    });

    it('uses searchFoundBubbles when a search query is present', () => {
        const searchFoundBubbles = [bubble('1', 'a'), bubble('3', 'b')];
        const count = countBubblesByTagForBubblesView(
            { bubbles, tags, searchFoundBubbles, debouncedSearchQuery: 'foo' },
            'a'
        );
        expect(count).toBe(1); // only bubble 1 is in the search results
    });

    it('treats a whitespace-only search query as no search', () => {
        const count = countBubblesByTagForBubblesView(
            { bubbles, tags, searchFoundBubbles: [], debouncedSearchQuery: '   ' },
            'a'
        );
        expect(count).toBe(2); // falls back to active bubbles, not the empty search set
    });
});
