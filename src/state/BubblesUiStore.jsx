import React, { createContext, useContext, useState, useCallback, useMemo, useRef } from 'react';
import { isAllTagsSelected, countBubblesByTagForBubblesView } from '../utils/bubbleVisibility';
import { isAllListTagsSelected, countBubblesByTagForListView } from '../utils/listVisibility';
import { isColorAvailable as isColorAvailablePure } from '../hooks/tagColors';
import { useBubblesData } from './BubblesDataStore';
import { useSettings } from './SettingsContext';
import {
    categoryIdsFor, mainViewForSettings, mainViewForUi, selectedTagIds, sortByForSettings, sortByForUi,
} from './settingsView';

/**
 * BubblesUiContext
 *
 * Central store for bubbles/tags view state (dialogs, filters, form state, etc.).
 * Composed with BubblesDataContext via useBubblesData() to compute derived values
 * that mix UI state and data. The values that are user settings (filters, list
 * sort, label size, background, main view, panel, hints) come from
 * users/{uid}.settings through SettingsContext and are written back field by field.
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
    const { settings, updateSettings, getSettings } = useSettings();
    const tagsRef = useRef(tags);
    tagsRef.current = tags;

    // Currently selected tag id for the create/edit bubble dialog
    const [selectedTagId, setSelectedTagId] = useState('');

    // Search state for bubbles view
    const [searchFoundBubbles, setSearchFoundBubbles] = useState([]);
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

    // Settings-backed values (spec 3.5). Setters take a value or an updater, like useState
    // setters; each one starts from getSettings(), so changes made in one handler add up.
    const resolve = (next, current) => (typeof next === 'function' ? next(current) : next);
    const setSetting = useCallback((key, next, toUi = (v) => v, toSettings = (v) => v) => {
        updateSettings({ [key]: toSettings(resolve(next, toUi(getSettings()[key]))) });
    }, [updateSettings, getSettings]);

    // Filter state for bubbles view: settings.bubbleFilter
    const filterTags = useMemo(
        () => selectedTagIds(settings.bubbleFilter.categoryIds, tags),
        [settings.bubbleFilter.categoryIds, tags]
    );
    const showNoTag = settings.bubbleFilter.showUncategorized;
    const bubbleViewPlannedTasksOnly = settings.bubbleFilter.plannedOnly;
    // changes = { categoryIds?, showUncategorized?, plannedOnly? } in settings terms
    const setBubbleFilter = useCallback((changes) => {
        updateSettings({ bubbleFilter: { ...getSettings().bubbleFilter, ...changes } });
    }, [updateSettings, getSettings]);
    const setFilterTags = useCallback((next) => {
        const current = selectedTagIds(getSettings().bubbleFilter.categoryIds, tagsRef.current);
        setBubbleFilter({ categoryIds: categoryIdsFor(resolve(next, current), tagsRef.current) });
    }, [setBubbleFilter, getSettings]);
    const setShowNoTag = useCallback((next) => {
        setBubbleFilter({ showUncategorized: resolve(next, getSettings().bubbleFilter.showUncategorized) });
    }, [setBubbleFilter, getSettings]);
    const setBubbleViewPlannedTasksOnly = useCallback((next) => {
        setBubbleFilter({ plannedOnly: resolve(next, getSettings().bubbleFilter.plannedOnly) });
    }, [setBubbleFilter, getSettings]);

    // Filter state for list view: the status tab and the search are not settings
    const [listFilter, setListFilter] = useState('active');
    const [listSearchQuery, setListSearchQuery] = useState('');
    const listSortBy = sortByForUi(settings.listSort.by);
    const listSortOrder = settings.listSort.order;
    const setListSortBy = useCallback((next) => {
        const { listSort } = getSettings();
        updateSettings({ listSort: { ...listSort, by: sortByForSettings(resolve(next, sortByForUi(listSort.by))) } });
    }, [updateSettings, getSettings]);
    const setListSortOrder = useCallback((next) => {
        const { listSort } = getSettings();
        updateSettings({ listSort: { ...listSort, order: resolve(next, listSort.order) } });
    }, [updateSettings, getSettings]);
    // settings.listFilter
    const listFilterTags = useMemo(
        () => selectedTagIds(settings.listFilter.categoryIds, tags),
        [settings.listFilter.categoryIds, tags]
    );
    const listShowNoTag = settings.listFilter.showUncategorized;
    // changes = { categoryIds?, showUncategorized? } in settings terms
    const setListCategoryFilter = useCallback((changes) => {
        updateSettings({ listFilter: { ...getSettings().listFilter, ...changes } });
    }, [updateSettings, getSettings]);
    const setListFilterTags = useCallback((next) => {
        const current = selectedTagIds(getSettings().listFilter.categoryIds, tagsRef.current);
        setListCategoryFilter({ categoryIds: categoryIdsFor(resolve(next, current), tagsRef.current) });
    }, [setListCategoryFilter, getSettings]);
    const setListShowNoTag = useCallback((next) => {
        setListCategoryFilter({ showUncategorized: resolve(next, getSettings().listFilter.showUncategorized) });
    }, [setListCategoryFilter, getSettings]);
    // A new category shows up in both filters: an explicit choice gets it, "all" (null) has it already
    const includeCategoryInFilters = useCallback((categoryId) => {
        const { bubbleFilter, listFilter: listCategoryFilter } = getSettings();
        if (bubbleFilter.categoryIds !== null) setBubbleFilter({ categoryIds: [...bubbleFilter.categoryIds, categoryId] });
        if (listCategoryFilter.categoryIds !== null) {
            setListCategoryFilter({ categoryIds: [...listCategoryFilter.categoryIds, categoryId] });
        }
    }, [getSettings, setBubbleFilter, setListCategoryFilter]);

    // Form state for the create/edit bubble dialogs (spec 3.1): the date picker's Date or null,
    // reminders in minutes before the due, the repeat editor's value or null
    const [createDue, setCreateDue] = useState(null);
    const [editDue, setEditDue] = useState(null);
    const [createReminders, setCreateReminders] = useState([]);
    const [editReminders, setEditReminders] = useState([]);
    const [createRepeat, setCreateRepeat] = useState(null);
    const [editRepeat, setEditRepeat] = useState(null);
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
    const fontSize = settings.labelFontSize;
    const setFontSize = useCallback((next) => setSetting('labelFontSize', next), [setSetting]);
    const bubbleBackgroundEnabled = settings.bubbleBackground;
    const setBubbleBackgroundEnabled = useCallback((next) => setSetting('bubbleBackground', next), [setSetting]);
    const mainView = mainViewForUi(settings.mainView);
    const setMainView = useCallback(
        (next) => setSetting('mainView', next, mainViewForUi, mainViewForSettings),
        [setSetting]
    );
    const categoriesPanelEnabled = settings.showCategoriesPanel;
    const setCategoriesPanelEnabled = useCallback((next) => setSetting('showCategoriesPanel', next), [setSetting]);
    const showInstructions = settings.showInstructions;
    const setShowInstructions = useCallback((next) => setSetting('showInstructions', next), [setSetting]);

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

    // Tag-editor derived value (depends on tags and editingTag, which are in UI store).
    const isColorAvailable = useCallback(
        (color) => isColorAvailablePure(tags, color, editingTag),
        [tags, editingTag]
    );

    const value = {
        selectedTagId,
        setSelectedTagId,
        filterTags,
        setFilterTags,
        showNoTag,
        setShowNoTag,
        bubbleViewPlannedTasksOnly,
        setBubbleViewPlannedTasksOnly,
        setBubbleFilter,
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
        setListCategoryFilter,
        includeCategoryInFilters,
        createDue,
        setCreateDue,
        editDue,
        setEditDue,
        createReminders,
        setCreateReminders,
        editReminders,
        setEditReminders,
        createRepeat,
        setCreateRepeat,
        editRepeat,
        setEditRepeat,
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
        categoriesPanelEnabled,
        setCategoriesPanelEnabled,
        showInstructions,
        setShowInstructions,
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
        isColorAvailable,
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
