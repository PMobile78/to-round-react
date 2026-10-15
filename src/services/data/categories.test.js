import { describe, expect, it } from 'vitest';
import { nextCategoryOrder, planCategoryOrder, sortCategories } from './categories';

const cat = (id, order) => ({ id, name: id.toUpperCase(), color: '#da3833', order });

describe('nextCategoryOrder (spec 4.5)', () => {
    it('puts a new category after the last one', () => {
        expect(nextCategoryOrder([])).toBe(1);
        expect(nextCategoryOrder([cat('a', 1), cat('b', 2.5)])).toBe(3.5);
    });
});

describe('sortCategories', () => {
    it('sorts by order, then by id so every device shows equal orders the same way', () => {
        expect(sortCategories([cat('c', 2), cat('b', 1), cat('a', 2)]).map((c) => c.id)).toEqual(['b', 'a', 'c']);
    });
});

describe('planCategoryOrder (spec 4.5)', () => {
    const a = cat('a', 1);
    const b = cat('b', 2);
    const c = cat('c', 3);

    it('writes nothing when the order did not change', () => {
        expect(planCategoryOrder([a, b, c])).toEqual([]);
    });

    it('gives only the moved category an order between its new neighbours', () => {
        expect(planCategoryOrder([a, c, b])).toEqual([{ id: 'c', order: 1.5 }]);
    });

    it('moves a category to the top or to the bottom', () => {
        expect(planCategoryOrder([c, a, b])).toEqual([{ id: 'c', order: 0 }]);
        expect(planCategoryOrder([b, c, a])).toEqual([{ id: 'a', order: 4 }]);
    });

    it('renumbers every category when the neighbours share an order', () => {
        expect(planCategoryOrder([cat('c', 2), cat('a', 1), cat('b', 1)]))
            .toEqual([{ id: 'c', order: 1 }, { id: 'a', order: 2 }, { id: 'b', order: 3 }]);
    });

    it('renumbers every category when no number fits between the neighbours', () => {
        const next = cat('n', 1 + Number.EPSILON);
        expect(planCategoryOrder([a, c, next]))
            .toEqual([{ id: 'a', order: 1 }, { id: 'c', order: 2 }, { id: 'n', order: 3 }]);
    });
});
