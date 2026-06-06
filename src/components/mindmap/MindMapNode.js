import React, { useEffect, useRef, useState } from 'react';
import { Box, IconButton } from '@mui/material';
import { Add, Close } from '@mui/icons-material';

const shapeStyles = (shape, color, isRoot) => {
    const base = {
        border: `2px solid ${color}`,
        backgroundColor: '#ffffff'
    };
    switch (shape) {
        case 'ellipse':
            return { ...base, borderRadius: '50%' };
        case 'cloud':
            return { ...base, borderRadius: '50% 40% 55% 45% / 55% 50% 45% 50%' };
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

    useEffect(() => {
        setDraft(node.text);
    }, [node.text, editing]);

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
                minWidth: isRoot ? 90 : 60,
                maxWidth: 260,
                padding: node.shape === 'none' ? '4px 6px' : (isRoot ? '14px 22px' : '8px 14px'),
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                cursor: editing ? 'text' : 'grab',
                userSelect: 'none',
                touchAction: 'none',
                boxShadow: node.shape === 'none' ? 'none' : (selected ? `0 0 0 3px ${color}55, 0 4px 14px rgba(0,0,0,0.18)` : '0 2px 8px rgba(0,0,0,0.12)'),
                transition: 'box-shadow 0.15s ease',
                ...shapeStyles(node.shape, color, isRoot)
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
                        maxWidth: 230
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
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        lineHeight: 1.2
                    }}
                >
                    {node.text || '\u00A0'}
                </Box>
            )}

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
