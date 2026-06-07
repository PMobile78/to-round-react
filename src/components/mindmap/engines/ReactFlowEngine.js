import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ReactFlow,
    ReactFlowProvider,
    Background,
    Controls,
    MiniMap,
    Handle,
    Position,
    addEdge,
    useReactFlow,
    useNodesState,
    useEdgesState
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { Box, Paper, IconButton, Tooltip, ToggleButton, ToggleButtonGroup } from '@mui/material';
import {
    Add, DeleteOutline, AccountTree, CropSquare, CircleOutlined
} from '@mui/icons-material';

const NODE_COLORS = ['#2C3E50', '#E5484D', '#F76808', '#46A758', '#0091FF', '#8E4EC6', '#E93D82'];
const NODE_W = 170;
const NODE_H = 48;

const nodeShapeRadius = (shape) => (shape === 'ellipse' ? '50%' : shape === 'square' ? '4px' : '12px');

// Editable mind node. Uses the React Flow store directly so labels/data stay
// serializable (no callbacks stored in node.data).
const MindNode = ({ id, data, selected }) => {
    const { setNodes } = useReactFlow();
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(data.label || '');

    useEffect(() => { setDraft(data.label || ''); }, [data.label]);

    const commit = () => {
        setEditing(false);
        setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, label: draft } } : n)));
    };

    const color = data.color || '#2C3E50';
    return (
        <Box
            onDoubleClick={() => setEditing(true)}
            sx={{
                minWidth: NODE_W,
                minHeight: NODE_H,
                px: 2,
                py: 1,
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                backgroundColor: '#fff',
                color: '#2C3E50',
                border: `2px solid ${color}`,
                borderRadius: nodeShapeRadius(data.shape),
                boxShadow: selected ? `0 0 0 3px ${color}55` : '0 2px 6px rgba(0,0,0,0.12)',
                fontSize: 14,
                fontWeight: 500
            }}
        >
            <Handle type="target" position={Position.Left} style={{ background: color }} />
            {editing ? (
                <input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={commit}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') commit();
                        if (e.key === 'Escape') { setDraft(data.label || ''); setEditing(false); }
                    }}
                    style={{
                        border: 'none', outline: 'none', background: 'transparent',
                        textAlign: 'center', font: 'inherit', width: '100%'
                    }}
                />
            ) : (
                <span>{data.label || '\u00A0'}</span>
            )}
            <Handle type="source" position={Position.Right} style={{ background: color }} />
        </Box>
    );
};

const layoutWithDagre = (nodes, edges) => {
    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir: 'LR', nodesep: 40, ranksep: 90 });
    nodes.forEach((n) => g.setNode(n.id, { width: NODE_W, height: NODE_H }));
    edges.forEach((e) => g.setEdge(e.source, e.target));
    dagre.layout(g);
    return nodes.map((n) => {
        const p = g.node(n.id);
        return { ...n, position: { x: p.x - NODE_W / 2, y: p.y - NODE_H / 2 } };
    });
};

const genId = () => (crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

const Flow = ({ initialData, onChange, t }) => {
    const [nodes, setNodes, onNodesChange] = useNodesState(initialData.nodes || []);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialData.edges || []);
    const nodeTypes = useMemo(() => ({ mindNode: MindNode }), []);
    const firstRun = useRef(true);
    const saveTimer = useRef(null);

    // Debounced persistence (skip the initial mount).
    useEffect(() => {
        if (firstRun.current) { firstRun.current = false; return; }
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
            const cleanNodes = nodes.map((n) => ({
                id: n.id, type: n.type || 'mindNode', position: n.position, data: n.data
            }));
            const cleanEdges = edges.map((e) => ({ id: e.id, source: e.source, target: e.target }));
            onChange(JSON.stringify({ nodes: cleanNodes, edges: cleanEdges }));
        }, 500);
        return () => saveTimer.current && clearTimeout(saveTimer.current);
    }, [nodes, edges, onChange]);

    const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

    const selectedNode = nodes.find((n) => n.selected) || null;

    const addNode = useCallback(() => {
        const id = genId();
        const parent = nodes.find((n) => n.selected) || nodes[0];
        const pos = parent
            ? { x: parent.position.x + 220, y: parent.position.y + (Math.random() * 80 - 40) }
            : { x: 0, y: 0 };
        const newNode = {
            id, type: 'mindNode', position: pos,
            data: { label: t('mindmap.newNode'), color: parent?.data?.color || '#2C3E50', shape: 'rounded' }
        };
        setNodes((ns) => ns.map((n) => ({ ...n, selected: false })).concat({ ...newNode, selected: true }));
        if (parent) setEdges((eds) => addEdge({ id: `e-${parent.id}-${id}`, source: parent.id, target: id }, eds));
    }, [nodes, setNodes, setEdges, t]);

    const deleteSelected = useCallback(() => {
        const sel = new Set(nodes.filter((n) => n.selected).map((n) => n.id));
        if (!sel.size) return;
        setNodes((ns) => ns.filter((n) => !sel.has(n.id)));
        setEdges((eds) => eds.filter((e) => !sel.has(e.source) && !sel.has(e.target)));
    }, [nodes, setNodes, setEdges]);

    const autoLayout = useCallback(() => {
        setNodes((ns) => layoutWithDagre(ns, edges));
    }, [edges, setNodes]);

    const patchSelected = useCallback((patch) => {
        setNodes((ns) => ns.map((n) => (n.selected ? { ...n, data: { ...n.data, ...patch } } : n)));
    }, [setNodes]);

    return (
        <Box sx={{ position: 'absolute', inset: 0 }}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                fitView
                deleteKeyCode={['Backspace', 'Delete']}
            >
                <Background />
                <Controls />
                <MiniMap pannable zoomable />
            </ReactFlow>

            {/* Toolbar */}
            <Paper
                elevation={4}
                sx={{
                    position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
                    zIndex: 10, px: 1, py: 0.5, borderRadius: 3,
                    display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', maxWidth: 'calc(100% - 24px)'
                }}
            >
                <Tooltip title={t('mindmap.addNode')}>
                    <IconButton size="small" onClick={addNode}><Add fontSize="small" /></IconButton>
                </Tooltip>
                <Tooltip title={t('mindmap.deleteNode')}>
                    <span>
                        <IconButton size="small" onClick={deleteSelected} disabled={!selectedNode} sx={{ color: selectedNode ? '#E5484D' : undefined }}>
                            <DeleteOutline fontSize="small" />
                        </IconButton>
                    </span>
                </Tooltip>
                <Tooltip title={t('mindmap.autoLayout')}>
                    <IconButton size="small" onClick={autoLayout}><AccountTree fontSize="small" /></IconButton>
                </Tooltip>

                {selectedNode && (
                    <>
                        <ToggleButtonGroup
                            size="small"
                            exclusive
                            value={selectedNode.data.shape || 'rounded'}
                            onChange={(e, v) => v && patchSelected({ shape: v })}
                        >
                            <ToggleButton value="rounded" title={t('mindmap.shapeRounded')}>
                                <Box sx={{ width: 18, height: 12, border: '2px solid currentColor', borderRadius: '4px' }} />
                            </ToggleButton>
                            <ToggleButton value="square" title={t('mindmap.shapeSquare')}><CropSquare fontSize="small" /></ToggleButton>
                            <ToggleButton value="ellipse" title={t('mindmap.shapeEllipse')}><CircleOutlined fontSize="small" /></ToggleButton>
                        </ToggleButtonGroup>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 0.5 }}>
                            {NODE_COLORS.map((c) => (
                                <Box
                                    key={c}
                                    onClick={() => patchSelected({ color: c })}
                                    sx={{
                                        width: 18, height: 18, borderRadius: '50%', backgroundColor: c, cursor: 'pointer',
                                        border: selectedNode.data.color === c ? '2px solid #2C3E50' : '2px solid #fff',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                                    }}
                                />
                            ))}
                        </Box>
                    </>
                )}
            </Paper>
        </Box>
    );
};

const ReactFlowEngine = ({ map, onChange, t }) => {
    const initialData = useMemo(() => {
        try {
            const parsed = JSON.parse(map.engineData || '{}');
            return { nodes: parsed.nodes || [], edges: parsed.edges || [] };
        } catch {
            return { nodes: [], edges: [] };
        }
    // Parse engine data once per map; data updates flow through React Flow state.
    }, [map.id]);

    return (
        <ReactFlowProvider>
            <Flow initialData={initialData} onChange={onChange} t={t} />
        </ReactFlowProvider>
    );
};

export default ReactFlowEngine;
