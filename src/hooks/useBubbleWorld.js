import React, { useEffect, useMemo } from 'react';
import Matter from 'matter-js';
import useSearch from './useSearch';
import { selectVisibleBubbles, computeBubbleSearchRender } from '../utils/bubbleVisibility';

/**
 * Matter.js world synchronization extracted from BubblesPage (Task E of #69 / #64).
 *
 * The pure "which bubbles belong in the world" decision and the per-bubble search
 * styling live in ../utils/bubbleVisibility (unit-tested). This hook keeps only the
 * Matter.js side effects — adding/removing bodies, the circleRadius rescale fix,
 * and writing `body.render` styles — plus the search wiring (useSearch +
 * foundBubblesIds + query sync).
 *
 * All inputs are page-owned state already defined before the world-sync logic, so
 * the hook takes plain values — no store registration or ref bridge is needed.
 */
export function useBubbleWorld({
    engineRef,
    bubbles,
    tags,
    filterTags,
    showNoTag,
    bubbleViewPlannedTasksOnly,
    bubblesSearchQuery,
    theme,
}) {
    // Which bubbles belong in the physics world (active + tag/no-tag + planned).
    const getFilteredBubbles = useMemo(
        () => selectVisibleBubbles({ bubbles, tags, filterTags, showNoTag, bubbleViewPlannedTasksOnly }),
        [bubbles, tags, filterTags, showNoTag, bubbleViewPlannedTasksOnly]
    );

    // Применение фильтрации при загрузке пузырей
    useEffect(() => {
        if (bubbles.length > 0 && engineRef.current) {
            // Применяем фильтрацию сразу после загрузки пузырей
            const filteredIds = new Set(getFilteredBubbles.map(b => b.id));

            bubbles.forEach(bubble => {
                if (bubble && bubble.body) {
                    const isVisible = filteredIds.has(bubble.id);
                    const isCurrentlyInWorld = engineRef.current.world.bodies.includes(bubble.body);

                    if (isVisible && !isCurrentlyInWorld) {
                        // Добавляем пузырь в физический мир только если он проходит фильтрацию
                        Matter.World.add(engineRef.current.world, bubble.body);
                    }
                }
            });
        }
    }, [bubbles, getFilteredBubbles, engineRef]);

    // Use the search hook only to determine which bubbles are found (not to filter)
    const {
        filteredItems: searchFoundBubbles,
        setSearchQuery: setCurrentBubblesSearchQuery,
        debouncedSearchQuery: debouncedBubblesSearchQuery,
    } = useSearch(getFilteredBubbles, tags);

    // Создаем Set ID найденных пузырей для быстрого поиска
    const foundBubblesIds = useMemo(() => {
        return new Set(searchFoundBubbles.map(bubble => bubble.id));
    }, [searchFoundBubbles]);

    // Синхронизируем состояние поиска
    React.useEffect(() => {
        setCurrentBubblesSearchQuery(bubblesSearchQuery);
    }, [bubblesSearchQuery, setCurrentBubblesSearchQuery]);

    // Filter bubbles visibility and highlight search results
    useEffect(() => {
        if (!engineRef.current) return;

        const filteredIds = new Set(getFilteredBubbles.map(b => b.id));
        const hasSearchQuery = Boolean(debouncedBubblesSearchQuery && debouncedBubblesSearchQuery.trim());

        // Apply opacity + stroke/glow for the current search state to an in-world body.
        const applySearchRender = (bubble, isFound) => {
            const tag = bubble.tagId ? tags.find(t => t.id === bubble.tagId) : null;
            const tagColor = tag ? tag.color : null;
            Object.assign(
                bubble.body.render,
                computeBubbleSearchRender({ tagColor, isFound, hasSearchQuery, theme })
            );
        };

        bubbles.forEach(bubble => {
            if (bubble && bubble.body) {
                const isVisible = filteredIds.has(bubble.id);
                const isCurrentlyInWorld = engineRef.current.world.bodies.includes(bubble.body);
                const isFound = foundBubblesIds.has(bubble.id);

                if (isVisible && !isCurrentlyInWorld) {
                    // Add bubble to physical world if it's visible and not already there
                    // Ensure body size matches logical radius (fix for restored bubbles after pop animation)
                    if (bubble.body && Math.abs(bubble.body.circleRadius - bubble.radius) > 0.5) {
                        const scale = bubble.radius / bubble.body.circleRadius;
                        Matter.Body.scale(bubble.body, scale, scale);
                    }
                    Matter.World.add(engineRef.current.world, bubble.body);
                    applySearchRender(bubble, isFound);
                } else if (!isVisible && isCurrentlyInWorld) {
                    // Remove bubble from the physical world
                    Matter.World.remove(engineRef.current.world, bubble.body);
                } else if (isVisible && isCurrentlyInWorld) {
                    // Update styles for visible bubbles based on search
                    // Also normalize radius if it diverged from the stored one
                    if (bubble.body && Math.abs(bubble.body.circleRadius - bubble.radius) > 0.5) {
                        const scale = bubble.radius / bubble.body.circleRadius;
                        Matter.Body.scale(bubble.body, scale, scale);
                    }
                    applySearchRender(bubble, isFound);
                }
            }
        });

        // Membership changes already wake the engine via world afterAdd/afterRemove, but a
        // style-only change (e.g. search highlight on the same visible set) must still trigger
        // a repaint while the idle loop is paused (perf #76).
        engineRef.current.requestWake?.();
    }, [getFilteredBubbles, bubbles, tags, foundBubblesIds, debouncedBubblesSearchQuery, theme, engineRef]);

    return { getFilteredBubbles, searchFoundBubbles, debouncedBubblesSearchQuery, foundBubblesIds };
}
