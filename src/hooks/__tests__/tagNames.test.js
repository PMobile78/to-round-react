import { describe, it, expect } from 'vitest';
import { isTagNameTaken } from '../tagNames';

const HOME = { id: 'home', name: 'Home', color: '#da3833' };
const WORK = { id: 'work', name: 'Робота', color: '#46a549' };

describe('isTagNameTaken (unique among the user\'s categories, data contract v2, 3.2)', () => {
    it('is true for the name of another category, whatever the case', () => {
        expect(isTagNameTaken([HOME, WORK], 'Home')).toBe(true);
        expect(isTagNameTaken([HOME, WORK], 'hOME')).toBe(true);
        expect(isTagNameTaken([HOME, WORK], 'РОБОТА')).toBe(true);
    });

    it('ignores spaces at the edges of both names', () => {
        expect(isTagNameTaken([HOME], '  home ')).toBe(true);
        expect(isTagNameTaken([{ ...HOME, name: ' Home  ' }], 'home')).toBe(true);
    });

    it('is false for a name no category has', () => {
        expect(isTagNameTaken([HOME, WORK], 'Homework')).toBe(false);
        expect(isTagNameTaken([HOME, WORK], 'Hom')).toBe(false);
        expect(isTagNameTaken([], 'Home')).toBe(false);
    });

    it('leaves the edited category its own name', () => {
        expect(isTagNameTaken([HOME, WORK], 'HOME', HOME)).toBe(false);
    });

    it('still sees another category with that name while one is edited', () => {
        const otherHome = { id: 'home-2', name: 'home', color: '#ee603c' };
        expect(isTagNameTaken([HOME, otherHome], 'Home', HOME)).toBe(true);
    });
});
