// Converts #RGB / #RRGGBB to rgba() with the given alpha.
// Non-hex values are returned unchanged so callers can pass through
// pre-formatted css colors.
export function withAlpha(color, alpha) {
    if (typeof color !== 'string') return color;
    const hex = color.trim();
    const m3 = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(hex);
    const m6 = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
    let r, g, b;
    if (m3) {
        [r, g, b] = m3.slice(1).map((ch) => parseInt(ch + ch, 16));
    } else if (m6) {
        [r, g, b] = m6.slice(1).map((h) => parseInt(h, 16));
    } else {
        return color;
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Converts #RRGGBB hex to rgba() with the given alpha.
// Accepts optional leading #. Only matches 6-digit hex (not 3-digit or named colors).
// Returns null for invalid input (non-hex, wrong length, non-string, null, undefined).
export function hexToRgba(hex, alpha = 1) {
    const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(hex || '').trim());
    if (!m) return null;
    return `rgba(${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}, ${alpha})`;
}
