import { describe, it, expect } from 'vitest';
import { reorderArray } from './reorderArray';

describe('reorderArray', () => {
    it('moves an element forward in the array', () => {
        const input = ['a', 'b', 'c', 'd'];
        const result = reorderArray(input, 0, 2);
        expect(result).toEqual(['b', 'c', 'a', 'd']);
    });

    it('moves an element backward in the array', () => {
        const input = ['a', 'b', 'c', 'd'];
        const result = reorderArray(input, 3, 1);
        expect(result).toEqual(['a', 'd', 'b', 'c']);
    });

    it('handles moving to the end of the array', () => {
        const input = ['a', 'b', 'c'];
        const result = reorderArray(input, 0, 2);
        expect(result).toEqual(['b', 'c', 'a']);
    });

    it('handles moving to the beginning of the array', () => {
        const input = ['a', 'b', 'c'];
        const result = reorderArray(input, 2, 0);
        expect(result).toEqual(['c', 'a', 'b']);
    });

    it('handles same start and end index (no-op)', () => {
        const input = ['a', 'b', 'c'];
        const result = reorderArray(input, 1, 1);
        expect(result).toEqual(['a', 'b', 'c']);
    });

    it('does not mutate the original array', () => {
        const input = ['a', 'b', 'c'];
        const original = [...input];
        reorderArray(input, 0, 2);
        expect(input).toEqual(original);
    });

    it('handles empty array', () => {
        const input = [];
        const result = reorderArray(input, 0, 0);
        expect(result).toEqual([undefined]);
    });

    it('handles single element array', () => {
        const input = ['a'];
        const result = reorderArray(input, 0, 0);
        expect(result).toEqual(['a']);
    });

    it('handles non-array input by returning array with undefined', () => {
        const result = reorderArray(null, 0, 1);
        expect(result).toEqual([undefined]);
    });

    it('handles undefined input by returning array with undefined', () => {
        const result = reorderArray(undefined, 0, 1);
        expect(result).toEqual([undefined]);
    });

    it('handles array with objects', () => {
        const input = [{ id: 1 }, { id: 2 }, { id: 3 }];
        const result = reorderArray(input, 0, 2);
        expect(result).toEqual([{ id: 2 }, { id: 3 }, { id: 1 }]);
    });

    it('works with mixed types in array', () => {
        const input = ['a', 1, null, { key: 'val' }];
        const result = reorderArray(input, 1, 3);
        expect(result).toEqual(['a', null, { key: 'val' }, 1]);
    });
});
