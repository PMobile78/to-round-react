import React, { createContext, useContext, useState, useCallback } from 'react';

/**
 * BubblesStore Context
 *
 * Central store for bubbles and tags state, replacing the old page-owned ref bridges.
 * Hooks can register themselves to make their setters/callbacks available
 * to other hooks without creating circular dependencies.
 */
const BubblesStoreContext = createContext(null);

/**
 * BubblesStoreProvider
 *
 * Provides bubbles/setBubbles and tags/setTags state, plus a register() method
 * for hooks to publish setters/callbacks for cross-hook consumption.
 */
export function BubblesStoreProvider({ children }) {
    const [bubbles, setBubbles] = useState([]);
    const [tags, setTags] = useState([]);

    // Search state for bubbles view
    const [searchFoundBubbles, setSearchFoundBubbles] = useState([]);
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

    // Filter state for list view
    const [listFilter, setListFilter] = useState('all');
    const [listSearchQuery, setListSearchQuery] = useState('');

    // Registered callbacks from hooks (e.g., setFilterTags, setListFilterTags, etc.)
    const [registered, setRegistered] = useState({});

    const register = useCallback((callbacks) => {
        setRegistered((prev) => ({ ...prev, ...callbacks }));
    }, []);

    const value = {
        bubbles,
        setBubbles,
        tags,
        setTags,
        searchFoundBubbles,
        setSearchFoundBubbles,
        debouncedSearchQuery,
        setDebouncedSearchQuery,
        listFilter,
        setListFilter,
        listSearchQuery,
        setListSearchQuery,
        register,
        registered,
    };

    return (
        <BubblesStoreContext.Provider value={value}>
            {children}
        </BubblesStoreContext.Provider>
    );
}

/**
 * useBubblesStore
 *
 * Hook to access the BubblesStore context.
 * Throws if used outside a BubblesStoreProvider.
 */
export function useBubblesStore() {
    const context = useContext(BubblesStoreContext);
    if (!context) {
        throw new Error('useBubblesStore must be used within a BubblesStoreProvider');
    }
    return context;
}
