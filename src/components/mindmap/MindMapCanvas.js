import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Paper, IconButton, Tooltip } from '@mui/material';
import {
    Add, Remove, CenterFocusStrong, AccountTree
} from '@mui/icons-material';
import MindMapBranch from './MindMapBranch';
import MindMapNode from './MindMapNode';
import MindMapToolbar from './MindMapToolbar';

const ROOT_COLOR = '#2C3E50';
const DRAG_THRESHOLD = 4;

const MindMapCanvas = ({ map, branchColors, genId, onNodesChange, t }) => {
    const containerRef = useRef(null);
    const [view, setView] = useState({ scale: 1, pan: { x: 0, y: 0 } });
    const viewRef = useRef(view);
    const [selectedId, setSelectedId] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const interactionRef = useRef(null);

    useEffect(() => { viewRef.current = view; }, [view]);

    const nodes = map?.nodes || [];

    const byId = useMemo(() => {
        const m = {};
        nodes.forEach((n) => { m[n.id] = n; });
        return m;
    }, [nodes]);

    const childrenMap = useMemo(() => {
        const m = {};
        nodes.forEach((n) => {
            if (n.parentId != null) {
                (m[n.parentId] = m[n.parentId] || []).push(n.id);
            }
        });
        return m;
    }, [nodes]);

    const resolveColor = useCallback((node) => {
        let cur = node;
        const guard = new Set();
        while (cur && cur.color == null && cur.parentId != null && !guard.has(cur.id)) {
            guard.add(cur.id);
            cur = byId[cur.parentId];
        }
        return (cur && cur.color) || ROOT_COLOR;
    }, [byId]);

    // Center the root on first load of a map.
    useEffect(() => {
        setView({ scale: 1, pan: { x: 0, y: 0 } });
        setSelectedId(null);
        setEditingId(null);
    }, [map?.id]);

    const updateNodes = useCallback((updater) => {
        onNodesChange(updater(nodes));
    }, [nodes, onNodesChange]);

    const patchNode = useCallback((id, patch) => {
        updateNodes((ns) => ns.map((n) => (n.id === id ? { ...n, ...patch } : n)));
    }, [updateNodes]);

    const addChild = useCallback((parent) => {
        const siblings = childrenMap[parent.id] || [];
        const parentNode = byId[parent.id];
        let x;
        let y;
        let color = null;
        if (parentNode.parentId == null) {
            // top-level branch around the root
            const count = siblings.length;
            const angle = -Math.PI / 2 + (count * (2 * Math.PI)) / Math.max(6, count + 1);
            const r = 220;
            x = Math.cos(angle) * r;
            y = Math.sin(angle) * r;
            color = branchColors[count % branchColors.length];
        } else {
            const grand = byId[parentNode.parentId];
            const dir = grand ? Math.sign(parentNode.x - grand.x) || 1 : 1;
            x = parentNode.x + dir * 170;
            y = parentNode.y + (siblings.length - 0.5) * 70;
        }
        const child = {
            id: genId(),
            parentId: parent.id,
            text: t('mindmap.newNode'),
            x,
            y,
            color,
            shape: 'rounded',
            fontSize: 16,
            bold: false,
            icon: null,
            imageUrl: null,
            lineStyle: 'solid',
            lineWidth: Math.max(3, (parentNode.lineWidth || 6) - 1),
            collapsed: false
        };
        updateNodes((ns) => [...ns, child]);
        setSelectedId(child.id);
        setEditingId(child.id);
    }, [byId, childrenMap, branchColors, genId, t, updateNodes]);

    const deleteNode = useCallback((node) => {
        if (node.parentId == null) return; // never delete root
        const toRemove = new Set();
        const stack = [node.id];
        while (stack.length) {
            const id = stack.pop();
            toRemove.add(id);
            (childrenMap[id] || []).forEach((c) => stack.push(c));
        }
        updateNodes((ns) => ns.filter((n) => !toRemove.has(n.id)));
        setSelectedId(null);
        setEditingId(null);
    }, [childrenMap, updateNodes]);

    // ---- Pan / drag interaction via window listeners ----
    const onWindowMove = useCallback((e) => {
        const it = interactionRef.current;
        if (!it) return;
        const dx = e.clientX - it.startClientX;
        const dy = e.clientY - it.startClientY;
        if (!it.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) it.moved = true;
        if (!it.moved) return;
        const { scale } = viewRef.current;
        if (it.type === 'pan') {
            setView((v) => ({ ...v, pan: { x: it.origPan.x + dx / scale, y: it.origPan.y + dy / scale } }));
        } else if (it.type === 'node') {
            patchNode(it.id, { x: it.origX + dx / scale, y: it.origY + dy / scale });
        }
    }, [patchNode]);

    const onWindowUp = useCallback(() => {
        interactionRef.current = null;
    }, []);

    useEffect(() => {
        window.addEventListener('pointermove', onWindowMove);
        window.addEventListener('pointerup', onWindowUp);
        return () => {
            window.removeEventListener('pointermove', onWindowMove);
            window.removeEventListener('pointerup', onWindowUp);
        };
    }, [onWindowMove, onWindowUp]);

    const handleNodePointerDown = useCallback((e, node) => {
        e.stopPropagation();
        if (editingId === node.id) return;
        setSelectedId(node.id);
        interactionRef.current = {
            type: 'node',
            id: node.id,
            startClientX: e.clientX,
            startClientY: e.clientY,
            origX: node.x,
            origY: node.y,
            moved: false
        };
    }, [editingId]);

    const handleBackgroundPointerDown = useCallback((e) => {
        setSelectedId(null);
        setEditingId(null);
        interactionRef.current = {
            type: 'pan',
            startClientX: e.clientX,
            startClientY: e.clientY,
            origPan: { ...viewRef.current.pan },
            moved: false
        };
    }, []);

    const handleWheel = useCallback((e) => {
        e.preventDefault();
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const sx = e.clientX - rect.left - cx;
        const sy = e.clientY - rect.top - cy;
        setView((v) => {
            const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
            const newScale = Math.min(2.5, Math.max(0.25, v.scale * factor));
            const worldX = sx / v.scale - v.pan.x;
            const worldY = sy / v.scale - v.pan.y;
            const panX = sx / newScale - worldX;
            const panY = sy / newScale - worldY;
            return { scale: newScale, pan: { x: panX, y: panY } };
        });
    }, []);

    const zoomBy = (factor) => setView((v) => ({ ...v, scale: Math.min(2.5, Math.max(0.25, v.scale * factor)) }));

    const fitView = useCallback(() => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect || nodes.length === 0) { setView({ scale: 1, pan: { x: 0, y: 0 } }); return; }
        const xs = nodes.map((n) => n.x);
        const ys = nodes.map((n) => n.y);
        const minX = Math.min(...xs); const maxX = Math.max(...xs);
        const minY = Math.min(...ys); const maxY = Math.max(...ys);
        const w = (maxX - minX) || 1;
        const h = (maxY - minY) || 1;
        const margin = 160;
        const scale = Math.min(2, Math.max(0.3, Math.min(rect.width / (w + margin), rect.height / (h + margin))));
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        setView({ scale, pan: { x: -cx, y: -cy } });
    }, [nodes]);

    const autoLayout = useCallback(() => {
        const rootId = map.rootId;
        if (!rootId) return;
        const leafCount = (id) => {
            const ch = childrenMap[id] || [];
            if (!ch.length) return 1;
            return ch.reduce((s, c) => s + leafCount(c), 0);
        };
        const positions = { [rootId]: { x: 0, y: 0 } };
        const levelRadius = 230;
        const place = (id, depth, aMin, aMax) => {
            const angle = (aMin + aMax) / 2;
            const r = levelRadius * depth;
            positions[id] = { x: Math.cos(angle) * r, y: Math.sin(angle) * r };
            const ch = childrenMap[id] || [];
            if (!ch.length) return;
            const total = ch.reduce((s, c) => s + leafCount(c), 0) || 1;
            let cur = aMin;
            ch.forEach((c) => {
                const lc = leafCount(c);
                const sweep = (lc / total) * (aMax - aMin);
                place(c, depth + 1, cur, cur + sweep);
                cur += sweep;
            });
        };
        const top = childrenMap[rootId] || [];
        const total = top.reduce((s, c) => s + leafCount(c), 0) || 1;
        let cur = -Math.PI / 2;
        top.forEach((c) => {
            const lc = leafCount(c);
            const sweep = (lc / total) * Math.PI * 2;
            place(c, 1, cur, cur + sweep);
            cur += sweep;
        });
        updateNodes((ns) => ns.map((n) => (positions[n.id] ? { ...n, x: positions[n.id].x, y: positions[n.id].y } : n)));
        setTimeout(fitView, 0);
    }, [map, childrenMap, updateNodes, fitView]);

    const selectedNode = selectedId ? byId[selectedId] : null;

    return (
        <Box
            ref={containerRef}
            onPointerDown={handleBackgroundPointerDown}
            onWheel={handleWheel}
            sx={{
                position: 'absolute',
                inset: 0,
                overflow: 'hidden',
                touchAction: 'none',
                backgroundColor: '#FCFBF7',
                backgroundImage: 'radial-gradient(#e6e3d8 1px, transparent 1px)',
                backgroundSize: '24px 24px',
                cursor: 'grab'
            }}
        >
            {/* World layer */}
            <Box
                sx={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: `scale(${view.scale}) translate(${view.pan.x}px, ${view.pan.y}px)`,
                    transformOrigin: '0 0'
                }}
            >
                {/* Branch SVG (overflow visible so it draws outside its 0-size box) */}
                <svg
                    width="1"
                    height="1"
                    style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none' }}
                >
                    {nodes.map((n) => {
                        if (n.parentId == null) return null;
                        const parent = byId[n.parentId];
                        if (!parent) return null;
                        return (
                            <MindMapBranch
                                key={`b-${n.id}`}
                                parent={{ x: parent.x, y: parent.y }}
                                child={{ x: n.x, y: n.y }}
                                color={resolveColor(n)}
                                width={n.lineWidth || 6}
                                lineStyle={n.lineStyle}
                            />
                        );
                    })}
                </svg>

                {nodes.map((n) => (
                    <MindMapNode
                        key={n.id}
                        node={n}
                        color={resolveColor(n)}
                        isRoot={n.parentId == null}
                        selected={selectedId === n.id}
                        editing={editingId === n.id}
                        onPointerDown={handleNodePointerDown}
                        onClick={(nd) => setSelectedId(nd.id)}
                        onDoubleClick={(nd) => { setSelectedId(nd.id); setEditingId(nd.id); }}
                        onTextCommit={(text) => { patchNode(n.id, { text }); setEditingId(null); }}
                        onAddChild={addChild}
                        onDelete={deleteNode}
                    />
                ))}
            </Box>

            {/* Node editing toolbar */}
            {selectedNode && (
                <MindMapToolbar
                    node={selectedNode}
                    isRoot={selectedNode.parentId == null}
                    branchColors={branchColors}
                    onChange={(patch) => patchNode(selectedNode.id, patch)}
                    onDelete={deleteNode}
                    t={t}
                />
            )}

            {/* Bottom-right controls */}
            <Paper
                elevation={4}
                onPointerDown={(e) => e.stopPropagation()}
                sx={{
                    position: 'absolute',
                    bottom: 20,
                    right: 20,
                    zIndex: 30,
                    borderRadius: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    p: 0.5
                }}
            >
                <Tooltip title={t('mindmap.zoomIn')} placement="left">
                    <IconButton size="small" onClick={() => zoomBy(1.15)}><Add /></IconButton>
                </Tooltip>
                <Tooltip title={t('mindmap.zoomOut')} placement="left">
                    <IconButton size="small" onClick={() => zoomBy(1 / 1.15)}><Remove /></IconButton>
                </Tooltip>
                <Tooltip title={t('mindmap.fit')} placement="left">
                    <IconButton size="small" onClick={fitView}><CenterFocusStrong /></IconButton>
                </Tooltip>
                <Tooltip title={t('mindmap.autoLayout')} placement="left">
                    <IconButton size="small" onClick={autoLayout}><AccountTree /></IconButton>
                </Tooltip>
            </Paper>
        </Box>
    );
};

export default MindMapCanvas;
