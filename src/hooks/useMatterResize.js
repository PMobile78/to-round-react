import { useEffect } from 'react';
import { computeCanvasSize, updateRenderAndBounds } from '../utils/physicsUtils';

/**
 * React hook that synchronizes Matter.js renderer size and world boundaries
 * on window resize and when sidebar visibility changes.
 */
export function useMatterResize({
    engineRef,
    renderRef,
    wallsRef,
    isMobile,
    categoriesPanelEnabled,
    setCanvasSize,
    matterReady = false,
}) {
    useEffect(() => {
        if (!matterReady || !renderRef.current || !engineRef.current) return;

        const engine = engineRef.current;
        const render = renderRef.current;

        const handleResize = () => {
            const newSize = computeCanvasSize({ isMobile, categoriesPanelEnabled });
            setCanvasSize(newSize);
            updateRenderAndBounds({ engine, render, wallsRef, newSize });
        };

        // initial pass (e.g. when toggling categories panel)
        handleResize();

        // window resize handling with debounce
        let resizeTimeout;
        const debouncedResize = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(handleResize, 100);
        };

        window.addEventListener('resize', debouncedResize);
        return () => {
            clearTimeout(resizeTimeout);
            window.removeEventListener('resize', debouncedResize);
        };
    }, [isMobile, categoriesPanelEnabled, engineRef, renderRef, wallsRef, setCanvasSize, matterReady]);
}


