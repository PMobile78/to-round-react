import { useEffect, useRef, useState } from 'react';
import { lsGet, lsSet } from '../utils/storage';

const DEFAULT_FAB_SIZE = 56;

export function useDraggableFab({ isMobile }) {
    const fabRef = useRef(null);
    const [fabPosition, setFabPosition] = useState(() => lsGet('bubbles-fab-position', null));
    const [isDraggingFab, setIsDraggingFab] = useState(false);
    const dragOffsetRef = useRef({ x: 0, y: 0 });
    const dragStartRef = useRef({ x: 0, y: 0 });
    const dragMovedRef = useRef(false);
    const suppressNextClickRef = useRef(false);

    const getDefaultFabPosition = () => {
        // Соответсвует прежнему стилю: bottom: 100, right: 20
        const x = Math.max(10, (typeof window !== 'undefined' ? window.innerWidth : 0) - 20 - DEFAULT_FAB_SIZE);
        const y = Math.max(10, (typeof window !== 'undefined' ? window.innerHeight : 0) - 100 - DEFAULT_FAB_SIZE);
        return { x, y };
    };

    useEffect(() => {
        // Если позиция не сохранена — выставляем позицию по умолчанию после первого рендера
        if (!isMobile) return;
        if (fabPosition) return;
        const raf = requestAnimationFrame(() => {
            const node = fabRef.current;
            const width = node?.offsetWidth || DEFAULT_FAB_SIZE;
            const height = node?.offsetHeight || DEFAULT_FAB_SIZE;
            const x = Math.max(10, window.innerWidth - 20 - width);
            const y = Math.max(10, window.innerHeight - 100 - height);
            setFabPosition({ x, y });
        });
        return () => cancelAnimationFrame(raf);
    }, [isMobile, fabPosition]);

    useEffect(() => {
        if (!fabPosition) return;
        lsSet('bubbles-fab-position', fabPosition);
    }, [fabPosition]);

    const onFabPointerMove = (event) => {
        const pointerX = event.clientX;
        const pointerY = event.clientY;
        const node = fabRef.current;
        const width = node?.offsetWidth || DEFAULT_FAB_SIZE;
        const height = node?.offsetHeight || DEFAULT_FAB_SIZE;
        let newX = pointerX - dragOffsetRef.current.x;
        let newY = pointerY - dragOffsetRef.current.y;
        // Ограничиваем область перемещения рамками окна
        newX = Math.min(Math.max(0, newX), (typeof window !== 'undefined' ? window.innerWidth : 0) - width);
        newY = Math.min(Math.max(0, newY), (typeof window !== 'undefined' ? window.innerHeight : 0) - height);
        setFabPosition({ x: newX, y: newY });

        // Детектим, был ли реальный drag (а не клик)
        const dx = Math.abs(pointerX - dragStartRef.current.x);
        const dy = Math.abs(pointerY - dragStartRef.current.y);
        if (dx > 3 || dy > 3) {
            dragMovedRef.current = true;
        }
    };

    const onFabPointerUp = () => {
        setIsDraggingFab(false);
        window.removeEventListener('pointermove', onFabPointerMove);
        window.removeEventListener('pointerup', onFabPointerUp);
        if (dragMovedRef.current) {
            suppressNextClickRef.current = true;
        }
        dragMovedRef.current = false;
    };

    const onFabPointerDown = (event) => {
        // Только левая кнопка мыши (если есть info), для тач/перо поля отсутствуют
        if (typeof event.button === 'number' && event.button !== 0) return;
        const node = fabRef.current;
        const rect = node?.getBoundingClientRect();
        const currentX = (fabPosition?.x ?? rect?.left ?? 0);
        const currentY = (fabPosition?.y ?? rect?.top ?? 0);
        dragOffsetRef.current = {
            x: event.clientX - currentX,
            y: event.clientY - currentY,
        };
        dragStartRef.current = { x: event.clientX, y: event.clientY };
        dragMovedRef.current = false;
        setIsDraggingFab(true);
        window.addEventListener('pointermove', onFabPointerMove);
        window.addEventListener('pointerup', onFabPointerUp);
    };

    return {
        fabRef,
        fabPosition,
        isDraggingFab,
        suppressNextClickRef,
        getDefaultFabPosition,
        onFabPointerDown,
    };
}
