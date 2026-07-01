import React, { createContext, useContext, useState, useCallback } from 'react';
import { lsGet, lsGetString } from '../utils/storage';
import { LS } from '../utils/storageKeys';
import { isAllTagsSelected, countBubblesByTagForBubblesView } from '../utils/bubbleVisibility';
import { isAllListTagsSelected, countBubblesByTagForListView } from '../utils/listVisibility';

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
    // Currently selected tag id for the create/edit bubble dialog
    // (was owned by useTags; now a live store field so useBubbleCrud can read it
    // directly instead of via the register() bridge).
    const [selectedTagId, setSelectedTagId] = useState('');

    // Search state for bubbles view
    const [searchFoundBubbles, setSearchFoundBubbles] = useState([]);
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

    // Filter state for bubbles view
    const [filterTags, setFilterTags] = useState(() => lsGet(LS.FILTER_TAGS, []));
    const [showNoTag, setShowNoTag] = useState(() => lsGet(LS.SHOW_NO_TAG, true));

    // Filter state for list view
    const [listFilter, setListFilter] = useState('active');
    const [listSearchQuery, setListSearchQuery] = useState('');
    const [listSortBy, setListSortBy] = useState(() => lsGetString(LS.LIST_SORT_BY) || 'updatedAt');
    const [listSortOrder, setListSortOrder] = useState(() => lsGetString(LS.LIST_SORT_ORDER) || 'desc');
    const [listFilterTags, setListFilterTags] = useState(() => lsGet(LS.LIST_FILTER_TAGS, []));
    const [listShowNoTag, setListShowNoTag] = useState(() => lsGet(LS.LIST_SHOW_NO_TAG, true));

    // Form state for the create/edit bubble dialogs (migrated from
    // useBubbleNotifications + useBubbleCrud in Stage E of 010d). The rAF pulse
    // loop and its refs stay in useBubbleNotifications — only this dialog UI state
    // moved here so the dialogs can read it from the store instead of via props.
    const [dueDate, setDueDate] = useState(null);              // create-form due date
    const [editDueDate, setEditDueDate] = useState(null);      // edit-form due date
    const [createNotifications, setCreateNotifications] = useState([]);
    const [editNotifications, setEditNotifications] = useState([]);
    const [createRecurrence, setCreateRecurrence] = useState(null);
    const [editRecurrence, setEditRecurrence] = useState(null);
    const [notifDialogOpen, setNotifDialogOpen] = useState(false); // shared create+edit notif sub-dialog
    const [notifValue, setNotifValue] = useState(null);            // shared create+edit
    const [bubbleSize, setBubbleSize] = useState(45);              // create-form bubble size
    const [editBubbleSize, setEditBubbleSize] = useState(45);      // edit-form bubble size

    // Registered callbacks from hooks (e.g., setListFilterTags, etc.)
    const [registered, setRegistered] = useState({});

    const register = useCallback((callbacks) => {
        setRegistered((prev) => ({ ...prev, ...callbacks }));
    }, []);

    // Store-computed derived values (pure functions of store state).
    // These must be available on first render (not via register() which populates via effect),
    // so they are defined inline here.
    const isAllSelected = useCallback(
        () => isAllTagsSelected(tags, filterTags, showNoTag),
        [tags, filterTags, showNoTag]
    );

    const getBubbleCountByTagForBubblesView = useCallback(
        (tagId) => countBubblesByTagForBubblesView(
            { bubbles, tags, searchFoundBubbles, debouncedSearchQuery },
            tagId
        ),
        [bubbles, tags, searchFoundBubbles, debouncedSearchQuery]
    );

    const isAllListFiltersSelected = useCallback(
        () => isAllListTagsSelected(tags, listFilterTags, listShowNoTag),
        [tags, listFilterTags, listShowNoTag]
    );

    const getBubbleCountByTagForListView = useCallback(
        (tagId) => countBubblesByTagForListView(
            { bubbles, tags, listFilter, listSearchQuery }, tagId
        ),
        [bubbles, tags, listFilter, listSearchQuery]
    );

    const value = {
        bubbles,
        setBubbles,
        tags,
        setTags,
        selectedTagId,
        setSelectedTagId,
        filterTags,
        setFilterTags,
        showNoTag,
        setShowNoTag,
        searchFoundBubbles,
        setSearchFoundBubbles,
        debouncedSearchQuery,
        setDebouncedSearchQuery,
        listFilter,
        setListFilter,
        listSearchQuery,
        setListSearchQuery,
        listSortBy,
        setListSortBy,
        listSortOrder,
        setListSortOrder,
        listFilterTags,
        setListFilterTags,
        listShowNoTag,
        setListShowNoTag,
        dueDate,
        setDueDate,
        editDueDate,
        setEditDueDate,
        createNotifications,
        setCreateNotifications,
        editNotifications,
        setEditNotifications,
        createRecurrence,
        setCreateRecurrence,
        editRecurrence,
        setEditRecurrence,
        notifDialogOpen,
        setNotifDialogOpen,
        notifValue,
        setNotifValue,
        bubbleSize,
        setBubbleSize,
        editBubbleSize,
        setEditBubbleSize,
        register,
        registered,
        isAllSelected,
        getBubbleCountByTagForBubblesView,
        isAllListFiltersSelected,
        getBubbleCountByTagForListView,
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
