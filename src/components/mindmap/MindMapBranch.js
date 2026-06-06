import React from 'react';

// Builds an organic, tapering colored ribbon (filled) between parent and child,
// or a dashed stroked curve when lineStyle === 'dashed'.
const buildRibbonPath = (p0, p3, w0, w1) => {
    const dx = p3.x - p0.x;
    // Horizontal-leaning control points produce the classic mind-map S-curve.
    const c1 = { x: p0.x + dx * 0.4, y: p0.y };
    const c2 = { x: p3.x - dx * 0.4, y: p3.y };

    const norm = (a, b) => {
        const len = Math.hypot(a, b) || 1;
        // perpendicular to the tangent (a, b)
        return { x: -b / len, y: a / len };
    };

    const n0 = norm(c1.x - p0.x, c1.y - p0.y);
    const n3 = norm(p3.x - c2.x, p3.y - c2.y);

    const h0 = w0 / 2;
    const h1 = w1 / 2;

    const top0 = { x: p0.x + n0.x * h0, y: p0.y + n0.y * h0 };
    const topC1 = { x: c1.x + n0.x * h0, y: c1.y + n0.y * h0 };
    const topC2 = { x: c2.x + n3.x * h1, y: c2.y + n3.y * h1 };
    const top3 = { x: p3.x + n3.x * h1, y: p3.y + n3.y * h1 };

    const bot3 = { x: p3.x - n3.x * h1, y: p3.y - n3.y * h1 };
    const botC2 = { x: c2.x - n3.x * h1, y: c2.y - n3.y * h1 };
    const botC1 = { x: c1.x - n0.x * h0, y: c1.y - n0.y * h0 };
    const bot0 = { x: p0.x - n0.x * h0, y: p0.y - n0.y * h0 };

    return [
        `M ${top0.x} ${top0.y}`,
        `C ${topC1.x} ${topC1.y} ${topC2.x} ${topC2.y} ${top3.x} ${top3.y}`,
        `L ${bot3.x} ${bot3.y}`,
        `C ${botC2.x} ${botC2.y} ${botC1.x} ${botC1.y} ${bot0.x} ${bot0.y}`,
        'Z'
    ].join(' ');
};

const buildCenterPath = (p0, p3) => {
    const dx = p3.x - p0.x;
    const c1x = p0.x + dx * 0.4;
    const c2x = p3.x - dx * 0.4;
    return `M ${p0.x} ${p0.y} C ${c1x} ${p0.y} ${c2x} ${p3.y} ${p3.x} ${p3.y}`;
};

const MindMapBranch = ({ parent, child, color, width = 6, lineStyle = 'solid' }) => {
    const p0 = { x: parent.x, y: parent.y };
    const p3 = { x: child.x, y: child.y };
    const w0 = Math.max(2, width);
    const w1 = Math.max(2, width * 0.45);

    if (lineStyle === 'dashed') {
        return (
            <path
                d={buildCenterPath(p0, p3)}
                fill="none"
                stroke={color}
                strokeWidth={Math.max(2, (w0 + w1) / 2)}
                strokeLinecap="round"
                strokeDasharray={`${w0 * 1.4} ${w0 * 1.2}`}
            />
        );
    }

    return <path d={buildRibbonPath(p0, p3, w0, w1)} fill={color} stroke="none" />;
};

export default MindMapBranch;
