import { describe, it, expect } from 'vitest';
import { withAlpha } from './colorUtils';

describe('withAlpha', () => {
    it('converts 6-digit hex to rgba', () => {
        expect(withAlpha('#2f6bdb', 0.1)).toBe('rgba(47, 107, 219, 0.1)');
    });

    it('converts 3-digit hex to rgba', () => {
        expect(withAlpha('#f00', 0.5)).toBe('rgba(255, 0, 0, 0.5)');
    });

    it('is case-insensitive', () => {
        expect(withAlpha('#FF6B6B', 0.14)).toBe('rgba(255, 107, 107, 0.14)');
    });

    it('returns non-hex strings unchanged', () => {
        expect(withAlpha('rgba(0,0,0,0.5)', 0.1)).toBe('rgba(0,0,0,0.5)');
        expect(withAlpha('transparent', 0.1)).toBe('transparent');
    });

    it('returns non-string input unchanged', () => {
        expect(withAlpha(null, 0.1)).toBe(null);
        expect(withAlpha(undefined, 0.1)).toBe(undefined);
    });
});
