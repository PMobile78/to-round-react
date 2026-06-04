import React from 'react';

/**
 * Drag-to-resize hook for the mobile rich text editor.
 * Returns editorHeight (px) and handleDragStart event handler.
 */
export function useEditorResize(initialHeight = 300) {
    const [editorHeight, setEditorHeight] = React.useState(initialHeight);
    const dragInfoRef = React.useRef({ startY: 0, startHeight: initialHeight, active: false });

    const stopGlobalDragListeners = React.useCallback(() => {
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
        window.removeEventListener('touchmove', handleDragMove, { passive: false });
        window.removeEventListener('touchend', handleDragEnd);
    }, []);

    const handleDragEnd = React.useCallback(() => {
        dragInfoRef.current.active = false;
        stopGlobalDragListeners();
    }, [stopGlobalDragListeners]);

    const handleDragMove = React.useCallback((e) => {
        if (!dragInfoRef.current.active) return;
        const clientY = (e.touches && e.touches[0]) ? e.touches[0].clientY : e.clientY;
        if (typeof clientY !== 'number') return;
        if (e.cancelable) {
            e.preventDefault();
        }
        const delta = clientY - dragInfoRef.current.startY;
        const next = Math.max(180, Math.min(900, dragInfoRef.current.startHeight + delta));
        setEditorHeight(next);
    }, []);

    const handleDragStart = React.useCallback((e) => {
        const clientY = (e.touches && e.touches[0]) ? e.touches[0].clientY : e.clientY;
        if (typeof clientY !== 'number') return;
        dragInfoRef.current.startY = clientY;
        dragInfoRef.current.startHeight = editorHeight;
        dragInfoRef.current.active = true;
        window.addEventListener('mousemove', handleDragMove);
        window.addEventListener('mouseup', handleDragEnd);
        window.addEventListener('touchmove', handleDragMove, { passive: false });
        window.addEventListener('touchend', handleDragEnd);
    }, [editorHeight, handleDragEnd, handleDragMove]);

    React.useEffect(() => {
        return () => stopGlobalDragListeners();
    }, [stopGlobalDragListeners]);

    return { editorHeight, handleDragStart };
}
