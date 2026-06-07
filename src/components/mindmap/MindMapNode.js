import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Box, IconButton } from '@mui/material';
import { Add, Close } from '@mui/icons-material';

// Weather-style cloud silhouette: flat rounded bottom + rounded puffs on top.
// Rendered as an SVG stretched to the node; non-scaling-stroke keeps the
// outline an even thickness regardless of the node's size.
const CLOUD_PATH =
    'M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z';

const shapeStyles = (shape, color, isRoot) => {
    const base = {
        border: `2px solid ${color}`,
        backgroundColor: '#ffffff'
    };
    switch (shape) {
        case 'square':
            return { ...base, borderRadius: 2 };
        case 'circle':
            return { ...base, borderRadius: '50%' };
        case 'ellipse':
            return { ...base, borderRadius: '50%' };
        case 'pill':
            return { ...base, borderRadius: 9999 };
        case 'cloud':
            return { border: 'none', backgroundColor: 'transparent', borderRadius: 0 };
        case 'none':
            return {
                border: 'none',
                backgroundColor: 'transparent',
                borderBottom: `3px solid ${color}`,
                borderRadius: 0
            };
        case 'rounded':
        default:
            return { ...base, borderRadius: isRoot ? 28 : 18 };
    }
};

const MindMapNode = ({
    node,
    color,
    isRoot,
    selected,
    editing,
    onPointerDown,
    onClick,
    onDoubleClick,
    onTextCommit,
    onAddChild,
    onDelete
}) => {
    const [draft, setDraft] = useState(node.text);
    const inputRef = useRef(null);
    const contentRef = useRef(null);
    const [circleSize, setCircleSize] = useState(null);

    const isCircle = node.shape === 'circle';

    useEffect(() => {
        setDraft(node.text);
    }, [node.text, editing]);

    // For the circle shape, measure the natural content size and force an
    // equal width/height (diameter) so the node renders as a true circle
    // regardless of flexbox/aspect-ratio quirks.
    useLayoutEffect(() => {
        if (!isCircle) {
            setCircleSize(null);
            return;
        }
        const el = contentRef.current;
        if (!el) return;
        const pad = isRoot ? 20 : 16;
        const diameter = Math.ceil(Math.max(el.scrollWidth, el.scrollHeight)) + pad * 2;
        setCircleSize(Math.max(diameter, isRoot ? 90 : 60));
    }, [isCircle, isRoot, editing, draft, node.text, node.fontSize, node.bold, node.icon, node.imageUrl]);

    useEffect(() => {
        if (editing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [editing]);

    const commit = () => {
        onTextCommit(draft);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            commit();
        } else if (e.key === 'Escape') {
            setDraft(node.text);
            onTextCommit(node.text);
        }
    };

    return (
        <Box
            onPointerDown={(e) => onPointerDown(e, node)}
            onClick={(e) => { e.stopPropagation(); onClick(node); }}
            onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick(node); }}
            sx={{
                position: 'absolute',
                left: node.x,
                top: node.y,
                transform: 'translate(-50%, -50%)',
                boxSizing: 'border-box',
                minWidth: (isCircle || node.shape === 'cloud') ? undefined : (isRoot ? 90 : 60),
                maxWidth: isCircle ? undefined : (node.shape === 'pill' ? 460 : 260),
                width: isCircle && circleSize
                    ? circleSize
                    : (node.shape === 'cloud' ? (isRoot ? 210 : 168) : 'max-content'),
                height: isCircle && circleSize ? circleSize : undefined,
                padding: node.shape === 'none'
                    ? '4px 6px'
                    : node.shape === 'pill'
                        ? (isRoot ? '16px 44px' : '10px 34px')
                        : node.shape === 'cloud'
                            ? (isRoot ? '24px 38px' : '18px 30px')
                            : isCircle
                                ? 0
                                : (isRoot ? '14px 22px' : '8px 14px'),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.75,
                cursor: editing ? 'text' : 'grab',
                userSelect: 'none',
                touchAction: 'none',
                boxShadow: (node.shape === 'none' || node.shape === 'cloud') ? 'none' : (selected ? `0 0 0 3px ${color}55, 0 4px 14px rgba(0,0,0,0.18)` : '0 2px 8px rgba(0,0,0,0.12)'),
                transition: 'box-shadow 0.15s ease',
                ...shapeStyles(node.shape, color, isRoot)
            }}
        >
            {node.shape === 'cloud' && (
                <svg
                    aria-hidden
                    viewBox="0 0 24 24"
                    preserveAspectRatio="none"
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        zIndex: -1,
                        overflow: 'visible',
                        filter: selected ? `drop-shadow(0 0 2px ${color})` : 'none'
                    }}
                >
                    <path
                        d={CLOUD_PATH}
                        fill="#ffffff"
                        stroke={color}
                        strokeWidth={selected ? 2 : 1.4}
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                    />
                </svg>
            )}
            <Box
                ref={contentRef}
                sx={{
                    display: isCircle ? 'flex' : 'contents',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: isCircle ? 0.75 : 0,
                    maxWidth: isCircle ? 200 : undefined,
                    textAlign: 'center'
                }}
            >
                {node.icon && (
                    <Box component="span" sx={{ fontSize: (node.fontSize || 16) + 4, lineHeight: 1 }}>
                        {node.icon}
                    </Box>
                )}
                {node.imageUrl && (
                    <Box
                        component="img"
                        src={node.imageUrl}
                        alt=""
                        draggable={false}
                        sx={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 1, flexShrink: 0 }}
                    />
                )}
                {editing ? (
                    <textarea
                        ref={inputRef}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onBlur={commit}
                        onKeyDown={handleKeyDown}
                        onPointerDown={(e) => e.stopPropagation()}
                        rows={1}
                        style={{
                            border: 'none',
                            outline: 'none',
                            resize: 'none',
                            background: 'transparent',
                            font: 'inherit',
                            fontSize: node.fontSize || 16,
                            fontWeight: node.bold ? 700 : 400,
                            color: node.shape === 'none' ? color : '#2C3E50',
                            textAlign: 'center',
                            width: Math.max(60, (draft.length + 1) * (node.fontSize || 16) * 0.55),
                            maxWidth: node.shape === 'pill' ? 430 : 230
                        }}
                    />
                ) : (
                    <Box
                        component="span"
                        sx={{
                            fontSize: (node.fontSize || 16) + 'px',
                            fontWeight: node.bold ? 700 : 400,
                            color: node.shape === 'none' ? color : '#2C3E50',
                            textAlign: 'center',
                            lineHeight: 1.2,
                            ...(node.shape === 'pill'
                                ? {
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    width: '100%',
                                    minWidth: 0
                                }
                                : {
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    overflowWrap: 'anywhere',
                                    display: '-webkit-box',
                                    WebkitBoxOrient: 'vertical',
                                    WebkitLineClamp: 3,
                                    overflow: 'hidden'
                                })
                        }}
                    >
                        {node.text || '\u00A0'}
                    </Box>
                )}
            </Box>

            {selected && !editing && (
                <>
                    <IconButton
                        size="small"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); onAddChild(node); }}
                        sx={{
                            position: 'absolute',
                            right: -14,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: 26,
                            height: 26,
                            backgroundColor: color,
                            color: '#fff',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                            '&:hover': { backgroundColor: color, filter: 'brightness(0.92)' }
                        }}
                    >
                        <Add sx={{ fontSize: 18 }} />
                    </IconButton>
                    {!isRoot && (
                        <IconButton
                            size="small"
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => { e.stopPropagation(); onDelete(node); }}
                            sx={{
                                position: 'absolute',
                                right: -14,
                                top: -14,
                                width: 22,
                                height: 22,
                                backgroundColor: '#fff',
                                color: '#E5484D',
                                border: '1px solid #E5484D',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                                '&:hover': { backgroundColor: '#FFEBEE' }
                            }}
                        >
                            <Close sx={{ fontSize: 14 }} />
                        </IconButton>
                    )}
                </>
            )}
        </Box>
    );
};

export default MindMapNode;
