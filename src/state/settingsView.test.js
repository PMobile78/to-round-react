import { describe, expect, it } from 'vitest';
import {
    categoryIdsFor, mainViewForSettings, mainViewForUi, selectedTagIds, sortByForSettings, sortByForUi,
} from './settingsView';

const tags = [{ id: 'a' }, { id: 'b' }];

describe('category filters (spec 3.5: categoryIds null means all categories)', () => {
    it('shows "all" as every current category, including ones created later', () => {
        expect(selectedTagIds(null, tags)).toEqual(['a', 'b']);
        expect(selectedTagIds(null, [...tags, { id: 'c' }])).toEqual(['a', 'b', 'c']);
    });

    it('shows an explicit choice without categories that no longer exist', () => {
        expect(selectedTagIds(['b', 'gone'], tags)).toEqual(['b']);
    });

    it('writes a choice of every category back as null, any other choice as the list', () => {
        expect(categoryIdsFor(['b', 'a'], tags)).toBeNull();
        expect(categoryIdsFor(['a'], tags)).toEqual(['a']);
        expect(categoryIdsFor([], [])).toEqual([]);
    });
});

describe('renamed values', () => {
    it('maps the main view: the list is "tasks" in the UI', () => {
        expect(mainViewForUi('list')).toBe('tasks');
        expect(mainViewForUi('bubbles')).toBe('bubbles');
        expect(mainViewForSettings('tasks')).toBe('list');
        expect(mainViewForSettings('bubbles')).toBe('bubbles');
    });

    it('maps the list sort: sorting by category is "tag" in the UI', () => {
        expect(sortByForUi('category')).toBe('tag');
        expect(sortByForUi('title')).toBe('title');
        expect(sortByForSettings('tag')).toBe('category');
        expect(sortByForSettings('updatedAt')).toBe('updatedAt');
    });
});
