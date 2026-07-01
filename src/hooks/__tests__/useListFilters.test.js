// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';

// useListFilters imports firestoreService (for BUBBLE_STATUS / getBubblesByStatus),
// which initializes Firebase at module load. Mock the Firebase layer so the pure
// helpers can be imported in the test environment (same approach as
// useBubbleFilters.test).
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
    filterBubblesForList,
} from '../useListFilters';
import {
    isAllListTagsSelected,
    countBubblesByTagForListView
} from '../../utils/listVisibility';

const tag = (id) => ({ id, name: id, color: '#000' });
const bubble = (id, tagId, status = 'active', extra = {}) => ({ id, tagId, status, ...extra });

describe('toggleTagInFilter (handleListTagFilterChange)', () => {
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

describe('isAllListTagsSelected (selectAll / clearAll / isAllListFiltersSelected)', () => {
    const tags = [tag('a'), tag('b')];

    it('is true when every tag is selected and "no tag" is shown (selectAllListFilters)', () => {
        expect(isAllListTagsSelected(tags, ['a', 'b'], true)).toBe(true);
    });

    it('is false after clearAllListFilters (no tags, no "no tag")', () => {
        expect(isAllListTagsSelected(tags, [], false)).toBe(false);
    });

    it('is false when some tags are missing', () => {
        expect(isAllListTagsSelected(tags, ['a'], true)).toBe(false);
    });

    it('is false when all tags selected but "no tag" is hidden', () => {
        expect(isAllListTagsSelected(tags, ['a', 'b'], false)).toBe(false);
    });

    it('is false when there are no tags at all', () => {
        expect(isAllListTagsSelected([], [], true)).toBe(false);
    });
});

describe('filterBubblesForList (getFilteredBubblesForList)', () => {
    const tags = [tag('a'), tag('b')];
    const bubbles = [
        bubble('1', 'a', 'active'),
        bubble('2', 'b', 'active'),
        bubble('3', null, 'active'),
        bubble('4', 'a', 'done'),
        bubble('5', 'b', 'deleted'),
        bubble('6', 'deleted-tag', 'active')  // tag no longer exists
    ];

    it('filters by status: active', () => {
        const result = filterBubblesForList({
            bubbles, tags, listFilter: 'active', listFilterTags: ['a', 'b'], listShowNoTag: true
        });
        expect(result.map(b => b.id)).toEqual(['1', '2', '3', '6']);
    });

    it('filters by status: done', () => {
        const result = filterBubblesForList({
            bubbles, tags, listFilter: 'done', listFilterTags: ['a', 'b'], listShowNoTag: true
        });
        expect(result.map(b => b.id)).toEqual(['4']);
    });

    it('filters by status: deleted', () => {
        const result = filterBubblesForList({
            bubbles, tags, listFilter: 'deleted', listFilterTags: ['a', 'b'], listShowNoTag: true
        });
        expect(result.map(b => b.id)).toEqual(['5']);
    });

    it('returns all bubbles of the status when every tag is selected and "no tag" is shown', () => {
        const result = filterBubblesForList({
            bubbles, tags, listFilter: 'active', listFilterTags: ['a', 'b'], listShowNoTag: true
        });
        // shortcut path returns the status-filtered list unchanged
        expect(result.map(b => b.id)).toEqual(['1', '2', '3', '6']);
    });

    it('keeps only bubbles whose (existing) tag is in the filter when not all selected', () => {
        const result = filterBubblesForList({
            bubbles, tags, listFilter: 'active', listFilterTags: ['a'], listShowNoTag: false
        });
        expect(result.map(b => b.id)).toEqual(['1']);
    });

    it('includes no-tag and deleted-tag bubbles when listShowNoTag is true', () => {
        const result = filterBubblesForList({
            bubbles, tags, listFilter: 'active', listFilterTags: [], listShowNoTag: true
        });
        expect(result.map(b => b.id)).toEqual(['3', '6']); // bubble 3 (no tag) + bubble 6 (deleted tag)
    });
});

describe('countBubblesByTagForListView (getBubbleCountByTagForListView)', () => {
    const tags = [tag('a'), tag('b')];
    const bubbles = [
        bubble('1', 'a', 'active', { title: 'alpha' }),
        bubble('2', 'a', 'active', { title: 'beta' }),
        bubble('3', 'b', 'active', { title: 'gamma' }),
        bubble('4', null, 'active', { title: 'delta' }),
        bubble('5', 'deleted-tag', 'active', { title: 'epsilon' }),
        bubble('6', 'a', 'done', { title: 'zeta' })  // not active -> excluded for active filter
    ];

    it('counts active bubbles for a tag when there is no search', () => {
        const count = countBubblesByTagForListView(
            { bubbles, tags, listFilter: 'active', listSearchQuery: '' },
            'a'
        );
        expect(count).toBe(2); // bubbles 1 and 2 (6 is done)
    });

    it('counts bubbles without a tag or with a deleted tag for tagId null', () => {
        const count = countBubblesByTagForListView(
            { bubbles, tags, listFilter: 'active', listSearchQuery: '' },
            null
        );
        expect(count).toBe(2); // bubble 4 (no tag) + bubble 5 (deleted tag)
    });

    it('respects the selected status filter (done)', () => {
        const count = countBubblesByTagForListView(
            { bubbles, tags, listFilter: 'done', listSearchQuery: '' },
            'a'
        );
        expect(count).toBe(1); // only bubble 6
    });

    it('applies the search query to the tag-filtered, status-filtered set', () => {
        const count = countBubblesByTagForListView(
            { bubbles, tags, listFilter: 'active', listSearchQuery: 'alpha' },
            'a'
        );
        expect(count).toBe(1); // only bubble 1 matches the title search
    });

    it('treats a whitespace-only search query as no search', () => {
        const count = countBubblesByTagForListView(
            { bubbles, tags, listFilter: 'active', listSearchQuery: '   ' },
            'a'
        );
        expect(count).toBe(2); // falls back to the full active count for the tag
    });
});
