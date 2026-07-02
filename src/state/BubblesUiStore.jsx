import React, { createContext, useContext, useState, useCallback } from 'react';
import { lsGet, lsGetString } from '../utils/storage';
import { LS } from '../utils/storageKeys';
import { isAllTagsSelected, countBubblesByTagForBubblesView } from '../utils/bubbleVisibility';
import { isAllListTagsSelected, countBubblesByTagForListView } from '../utils/listVisibility';
import { useBubblesData } from './BubblesDataStore';

/**
 * BubblesUiContext
 *
 * Central store for bubbles/tags view state (dialogs, filters, form state, etc.).
 * Composed with BubblesDataContext via useBubblesData() to compute derived values
 * that mix UI state and data.
 */
const BubblesUiContext = createContext(null);

/**
 * BubblesUiProvider
 *
 * Provides all UI state (dialogs, filters, forms) plus register/registered mechanism
 * for cross-hook communication. Theme/design props pass through from App.
 */
export function BubblesUiProvider({
    children,
    // Theme/design controls owned by useThemeMode in App
    themeModeState,
    setThemeMode,
    design,
    setDesign,
    designs,
    toggleTheme,
    themeToggleProps,
    onOpenMindMap,
}) {
    // Acquire data-layer state for computing mixed derived values
    const { bubbles, tags } = useBubblesData();

    // Currently selected tag id for the create/edit bubble dialog
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

    // Form state for the create/edit bubble dialogs
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

    // Dialog open-flags + settings values
    const [menuDrawerOpen, setMenuDrawerOpen] = useState(false);
    const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
    const [fontSettingsDialog, setFontSettingsDialog] = useState(false);
    const [appearanceDialogOpen, setAppearanceDialogOpen] = useState(false);
    const [changePasswordOpen, setChangePasswordOpen] = useState(false);
    const [logoutDialog, setLogoutDialog] = useState(false);
    const [listViewDialog, setListViewDialog] = useState(false);
    const [aboutOpen, setAboutOpen] = useState(false);
    const [fontSize, setFontSize] = useState(() => {
        const savedFontSize = lsGetString(LS.FONT_SIZE);
        return savedFontSize ? parseInt(savedFontSize) : 8;
    });
    const [bubbleBackgroundEnabled, setBubbleBackgroundEnabled] = useState(() => {
        const saved = lsGetString(LS.BACKGROUND_ENABLED);
        return saved === null ? true : saved === 'true';
    });
    const [mainView, setMainView] = useState(() => {
        return lsGetString(LS.MAIN_VIEW) === 'tasks' ? 'tasks' : 'bubbles';
    });

    // Tag-editor + categories dialog state
    const [tagDialog, setTagDialog] = useState(false);
    const [tagName, setTagName] = useState('');
    const [tagColor, setTagColor] = useState('#2f6bdb');
    const [editingTag, setEditingTag] = useState(null);
    const [deletingTags, setDeletingTags] = useState(new Set()); // tags mid soft-delete
    const [categoriesDialog, setCategoriesDialog] = useState(false);

    // Registered callbacks from hooks
    const [registered, setRegistered] = useState({});

    const register = useCallback((callbacks) => {
        setRegistered((prev) => ({ ...prev, ...callbacks }));
    }, []);

    // Mixed derived values (read both UI state and data).
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
        menuDrawerOpen,
        setMenuDrawerOpen,
        filterDrawerOpen,
        setFilterDrawerOpen,
        fontSettingsDialog,
        setFontSettingsDialog,
        appearanceDialogOpen,
        setAppearanceDialogOpen,
        changePasswordOpen,
        setChangePasswordOpen,
        logoutDialog,
        setLogoutDialog,
        listViewDialog,
        setListViewDialog,
        aboutOpen,
        setAboutOpen,
        fontSize,
        setFontSize,
        bubbleBackgroundEnabled,
        setBubbleBackgroundEnabled,
        mainView,
        setMainView,
        tagDialog,
        setTagDialog,
        tagName,
        setTagName,
        tagColor,
        setTagColor,
        editingTag,
        setEditingTag,
        deletingTags,
        setDeletingTags,
        categoriesDialog,
        setCategoriesDialog,
        // Theme/design controls
        themeModeState,
        setThemeMode,
        design,
        setDesign,
        designs,
        toggleTheme,
        themeToggleProps,
        onOpenMindMap,
        register,
        registered,
        isAllSelected,
        getBubbleCountByTagForBubblesView,
        isAllListFiltersSelected,
        getBubbleCountByTagForListView,
    };

    return (
        <BubblesUiContext.Provider value={value}>
            {children}
        </BubblesUiContext.Provider>
    );
}

/**
 * useBubblesUi
 *
 * Hook to access the BubblesUiContext.
 * Throws if used outside a BubblesUiProvider.
 */
export function useBubblesUi() {
    const context = useContext(BubblesUiContext);
    if (!context) {
        throw new Error('useBubblesUi must be used within a BubblesUiProvider');
    }
    return context;
}
