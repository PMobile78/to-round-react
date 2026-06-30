import { describe, it, expect } from 'vitest';
import { applyBubbleFill } from './bubbleStyle';

describe('applyBubbleFill', () => {
    // Stub getBubbleFillStyle that returns different colors based on tagColor
    const getBubbleFillStyle = (tagColor) => {
        if (tagColor === null) return 'rgba(200,200,200,0.5)'; // no-tag default
        return tagColor; // use tag color directly
    };

    it('applies fillStyle based on tagColor when no overdueColor', () => {
        const bubble = { body: { render: {} } };
        applyBubbleFill(bubble, { tagColor: '#FF0000' }, getBubbleFillStyle);
        expect(bubble.body.render.fillStyle).toBe('#FF0000');
    });

    it('applies no-tag fillStyle when tagColor is null', () => {
        const bubble = { body: { render: {} } };
        applyBubbleFill(bubble, { tagColor: null }, getBubbleFillStyle);
        expect(bubble.body.render.fillStyle).toBe('rgba(200,200,200,0.5)');
    });

    it('applies strokeStyle when provided', () => {
        const bubble = { body: { render: {} } };
        applyBubbleFill(bubble, { stroke: '#B0B0B0', tagColor: null }, getBubbleFillStyle);
        expect(bubble.body.render.strokeStyle).toBe('#B0B0B0');
    });

    it('does not apply strokeStyle when not provided', () => {
        const bubble = { body: { render: { strokeStyle: 'existing' } } };
        applyBubbleFill(bubble, { tagColor: null }, getBubbleFillStyle);
        expect(bubble.body.render.strokeStyle).toBe('existing');
    });

    it('uses overdueColor when provided, ignoring tagColor', () => {
        const bubble = { body: { render: {} } };
        applyBubbleFill(
            bubble,
            { tagColor: '#FF0000', overdueColor: 'rgba(255,0,0,0.5)' },
            getBubbleFillStyle
        );
        expect(bubble.body.render.fillStyle).toBe('rgba(255,0,0,0.5)');
    });

    it('applies both fillStyle and strokeStyle together', () => {
        const bubble = { body: { render: {} } };
        applyBubbleFill(
            bubble,
            { tagColor: '#FF0000', stroke: '#FF0000' },
            getBubbleFillStyle
        );
        expect(bubble.body.render.fillStyle).toBe('#FF0000');
        expect(bubble.body.render.strokeStyle).toBe('#FF0000');
    });

    it('does nothing when bubble is null or missing body/render', () => {
        expect(() => applyBubbleFill(null, {}, getBubbleFillStyle)).not.toThrow();
        expect(() => applyBubbleFill({}, {}, getBubbleFillStyle)).not.toThrow();
        expect(() => applyBubbleFill({ body: null }, {}, getBubbleFillStyle)).not.toThrow();
        expect(() => applyBubbleFill({ body: { render: null } }, {}, getBubbleFillStyle)).not.toThrow();
    });

    it('overdueColor takes precedence even with null tagColor', () => {
        const bubble = { body: { render: {} } };
        applyBubbleFill(
            bubble,
            { tagColor: null, overdueColor: 'rgba(255,100,100,0.7)' },
            getBubbleFillStyle
        );
        expect(bubble.body.render.fillStyle).toBe('rgba(255,100,100,0.7)');
    });
});
