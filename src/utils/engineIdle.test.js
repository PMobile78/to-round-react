import { describe, it, expect } from 'vitest';
import { areBubblesAtRest, shouldPauseEngine } from './engineIdle';

// Bubble bodies carry label 'Circle Body' (see useMatterEngine mousedown hit-test).
const circle = (isSleeping) => ({ label: 'Circle Body', isSleeping });
const wall = () => ({ label: 'Rectangle Body', isStatic: true, isSleeping: false });

describe('areBubblesAtRest', () => {
    it('is true when there are no bubble bodies (empty world)', () => {
        expect(areBubblesAtRest([])).toBe(true);
        expect(areBubblesAtRest([wall(), wall()])).toBe(true);
    });

    it('is true when every bubble body is sleeping', () => {
        expect(areBubblesAtRest([circle(true), circle(true), wall()])).toBe(true);
    });

    it('is false when at least one bubble body is awake', () => {
        expect(areBubblesAtRest([circle(true), circle(false)])).toBe(false);
    });

    it('ignores non-bubble bodies (walls / constraints)', () => {
        // an awake wall must not keep the engine "active"
        expect(areBubblesAtRest([circle(true), wall()])).toBe(true);
    });
});

describe('shouldPauseEngine', () => {
    it('pauses when bubbles are at rest and not dragging', () => {
        expect(shouldPauseEngine({ bodies: [circle(true)], isDragging: false })).toBe(true);
    });

    it('does NOT pause while dragging, even if bodies are at rest', () => {
        expect(shouldPauseEngine({ bodies: [circle(true)], isDragging: true })).toBe(false);
    });

    it('does NOT pause while a bubble is still moving', () => {
        expect(shouldPauseEngine({ bodies: [circle(false)], isDragging: false })).toBe(false);
    });
});
