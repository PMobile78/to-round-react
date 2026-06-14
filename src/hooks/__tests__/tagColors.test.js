import { describe, it, expect } from 'vitest';
import {
    COLOR_PALETTE,
    getUsedColors,
    getAvailableColors,
    getNextAvailableColor,
    isColorAvailable,
    canCreateMoreTags
} from '../tagColors';

const tag = (color) => ({ id: color, name: color, color });

describe('COLOR_PALETTE', () => {
    it('has 20 unique colors', () => {
        expect(COLOR_PALETTE).toHaveLength(20);
        expect(new Set(COLOR_PALETTE).size).toBe(20);
    });
});

describe('getUsedColors', () => {
    it('returns the colors of the given tags', () => {
        expect(getUsedColors([tag('#da3833'), tag('#46a549')])).toEqual(['#da3833', '#46a549']);
    });

    it('handles empty / nullish input', () => {
        expect(getUsedColors([])).toEqual([]);
        expect(getUsedColors(null)).toEqual([]);
        expect(getUsedColors(undefined)).toEqual([]);
    });
});

describe('getAvailableColors', () => {
    it('returns the whole palette when no tags exist', () => {
        expect(getAvailableColors([])).toEqual(COLOR_PALETTE);
    });

    it('excludes colors already used by tags', () => {
        const used = ['#da3833', '#46a549'];
        const available = getAvailableColors(used.map(tag));
        expect(available).not.toContain('#da3833');
        expect(available).not.toContain('#46a549');
        expect(available).toHaveLength(COLOR_PALETTE.length - 2);
    });
});

describe('getNextAvailableColor', () => {
    it('returns the first palette color when none are used', () => {
        expect(getNextAvailableColor([])).toBe(COLOR_PALETTE[0]);
    });

    it('skips used colors', () => {
        expect(getNextAvailableColor([tag(COLOR_PALETTE[0])])).toBe(COLOR_PALETTE[1]);
    });

    it('returns null when the palette is exhausted', () => {
        const allUsed = COLOR_PALETTE.map(tag);
        expect(getNextAvailableColor(allUsed)).toBe(null);
    });
});

describe('isColorAvailable', () => {
    it('is true for an unused color', () => {
        expect(isColorAvailable([tag('#da3833')], '#46a549')).toBe(true);
    });

    it('is false for a color already used by another tag', () => {
        expect(isColorAvailable([tag('#da3833')], '#da3833')).toBe(false);
    });

    it('treats the edited tag\'s own color as available', () => {
        const editing = tag('#da3833');
        expect(isColorAvailable([editing], '#da3833', editing)).toBe(true);
    });
});

describe('canCreateMoreTags (tag limit)', () => {
    it('is true while palette colors remain', () => {
        expect(canCreateMoreTags([])).toBe(true);
        expect(canCreateMoreTags(COLOR_PALETTE.slice(0, 19).map(tag))).toBe(true);
    });

    it('is false once every palette color is used (limit = palette size)', () => {
        expect(canCreateMoreTags(COLOR_PALETTE.map(tag))).toBe(false);
    });
});
