/**
 * Centralized bubble style helpers. Prevents duplication of fillStyle/strokeStyle
 * assignments across recolor sites in hooks and pages.
 */

/**
 * Apply fill and stroke colors to a Matter.js bubble body's render properties.
 * This is the single point where bubble recoloring happens.
 *
 * @param {Object} bubble - Matter.js body wrapper with a bubble.body.render object
 * @param {Object} options - Style options
 * @param {string} [options.tagColor] - Tag color for normal rendering (null for no tag)
 * @param {string} [options.stroke] - Stroke color to apply
 * @param {string} [options.overdueColor] - Overdue/flash color (takes precedence over getBubbleFillStyle)
 * @param {Function} getBubbleFillStyle - Callback to get fill color given tagColor
 */
export function applyBubbleFill(bubble, { tagColor = null, stroke, overdueColor = null } = {}, getBubbleFillStyle) {
    if (!bubble || !bubble.body || !bubble.body.render) return;

    const render = bubble.body.render;

    if (overdueColor) {
        render.fillStyle = overdueColor;
    } else {
        render.fillStyle = getBubbleFillStyle(tagColor);
    }

    if (stroke !== undefined) {
        render.strokeStyle = stroke;
    }
}
