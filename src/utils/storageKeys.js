// Storage key registry — single source of truth for all persisted app state
export const LS = Object.freeze({
    THEME_MODE: 'app-theme-mode',
    DESIGN: 'app-design',
    FILTER_TAGS: 'bubbles-filter-tags',
    SHOW_NO_TAG: 'bubbles-show-no-tag',
    PLANNED_TASKS_ONLY: 'bubbles-planned-tasks-only',
    LIST_FILTER_TAGS: 'bubbles-list-filter-tags',
    LIST_SHOW_NO_TAG: 'bubbles-list-show-no-tag',
    MAIN_VIEW: 'bubbles-main-view',
    FONT_SIZE: 'bubbles-font-size',
    LIST_SORT_BY: 'bubbles-list-sort-by',
    LIST_SORT_ORDER: 'bubbles-list-sort-order',
    SHOW_INSTRUCTIONS: 'bubbles-show-instructions',
    BACKGROUND_ENABLED: 'bubbles-background-enabled',
    CATEGORIES_PANEL_ENABLED: 'bubbles-categories-panel-enabled',
    USE_RICH_TEXT: 'bubbles-use-rich-text',
    I18N_LNG: 'i18nextLng',
});
