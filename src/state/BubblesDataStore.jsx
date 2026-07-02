import React, { createContext, useContext, useState, useCallback } from 'react';
import { countActiveBubblesByTag } from '../utils/bubbleVisibility';
import { isColorAvailable as isColorAvailablePure, canCreateMoreTags as canCreateMoreTagsPure } from '../hooks/tagColors';

/**
 * BubblesDataContext
 *
 * Central store for bubbles and tags data (non-UI state).
 */
const BubblesDataContext = createContext(null);

/**
 * BubblesDataProvider
 *
 * Provides bubbles/setBubbles and tags/setTags state, plus three computed functions
 * that read only data (no UI state).
 */
export function BubblesDataProvider({ children }) {
    const [bubbles, setBubbles] = useState([]);
    const [tags, setTags] = useState([]);

    // Data-only computed values (pure functions of bubbles/tags only).
    const isColorAvailable = useCallback(
        (color) => isColorAvailablePure(tags, color, null),
        [tags]
    );

    const canCreateMoreTags = useCallback(
        () => canCreateMoreTagsPure(tags),
        [tags]
    );

    const getBubbleCountByTag = useCallback(
        (tagId) => countActiveBubblesByTag(bubbles, tags, tagId),
        [bubbles, tags]
    );

    const value = {
        bubbles,
        setBubbles,
        tags,
        setTags,
        getBubbleCountByTag,
        isColorAvailable,
        canCreateMoreTags,
    };

    return (
        <BubblesDataContext.Provider value={value}>
            {children}
        </BubblesDataContext.Provider>
    );
}

/**
 * useBubblesData
 *
 * Hook to access the BubblesDataContext.
 * Throws if used outside a BubblesDataProvider.
 */
export function useBubblesData() {
    const context = useContext(BubblesDataContext);
    if (!context) {
        throw new Error('useBubblesData must be used within a BubblesDataProvider');
    }
    return context;
}
