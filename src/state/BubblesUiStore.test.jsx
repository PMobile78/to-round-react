// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import settingsFixtures from '../../contract/fixtures/settings.json';
import { subscribeUserDoc, updateSettings as writeSettings } from '../services/data/settings';
import { SettingsContext } from './SettingsContext';
import { useUserSettings } from './SettingsStore';
import { BubblesUiProvider, useBubblesUi } from './BubblesUiStore';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../firebase', () => ({ db: 'db' }));
vi.mock('../services/data/settings', () => ({
    ensureUserDoc: vi.fn(() => Promise.resolve(false)),
    subscribeUserDoc: vi.fn(() => vi.fn()),
    updateSettings: vi.fn(() => Promise.resolve()),
}));
vi.mock('./BubblesDataStore', () => ({
    useBubblesData: () => ({ bubbles: [], tags: [{ id: 'a' }, { id: 'b' }] }),
}));
vi.mock('../utils/logger', () => ({ default: { error: vi.fn() } }));

const DEFAULTS = settingsFixtures.valid.find((f) => f.name === 'defaults').value;

describe('BubblesUiStore: settings-backed values (spec 3.5)', () => {
    let container;
    let root;
    let ui;

    function Consumer() {
        ui = useBubblesUi();
        return null;
    }

    function App() {
        const api = useUserSettings('u1');
        return (
            <SettingsContext.Provider value={api}>
                {api.settings && <BubblesUiProvider><Consumer /></BubblesUiProvider>}
            </SettingsContext.Provider>
        );
    }

    const lastWrite = () => writeSettings.mock.calls.at(-1)[2];

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        act(() => root.render(<App />));
        act(() => subscribeUserDoc.mock.calls[0][2](DEFAULTS));
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
        vi.clearAllMocks();
    });

    it('shows the filter "all" as every category and writes a full choice back as null', () => {
        expect(ui.filterTags).toEqual(['a', 'b']);
        act(() => ui.setFilterTags(['a']));
        expect(lastWrite()).toEqual({ bubbleFilter: { categoryIds: ['a'], showUncategorized: true, plannedOnly: false } });
        expect(ui.filterTags).toEqual(['a']);
        act(() => ui.setFilterTags((prev) => [...prev, 'b']));
        expect(lastWrite()).toEqual({ bubbleFilter: { categoryIds: null, showUncategorized: true, plannedOnly: false } });
    });

    it('keeps both changes when one handler changes the categories and "no category" together', () => {
        act(() => {
            ui.setFilterTags(['a']);
            ui.setShowNoTag(false);
        });
        expect(lastWrite()).toEqual({ bubbleFilter: { categoryIds: ['a'], showUncategorized: false, plannedOnly: false } });
        expect(ui.filterTags).toEqual(['a']);
        expect(ui.showNoTag).toBe(false);
    });

    it('adds a new category to an explicit filter and leaves "all" as it is', () => {
        act(() => ui.setListFilterTags(['a']));
        act(() => ui.includeCategoryInFilters('c'));
        expect(writeSettings.mock.calls.map((call) => call[2])).toEqual([
            { listFilter: { categoryIds: ['a'], showUncategorized: true } },
            { listFilter: { categoryIds: ['a', 'c'], showUncategorized: true } },
        ]);
    });

    it('maps the main view and the category sort to their v2 names', () => {
        act(() => ui.setMainView('tasks'));
        expect(lastWrite()).toEqual({ mainView: 'list' });
        expect(ui.mainView).toBe('tasks');
        act(() => ui.setListSortBy('tag'));
        expect(lastWrite()).toEqual({ listSort: { by: 'category', order: 'desc' } });
        expect(ui.listSortBy).toBe('tag');
    });

    it('saves the label size, the background, the panel and the hints as their own settings', () => {
        act(() => ui.setFontSize(12));
        expect(lastWrite()).toEqual({ labelFontSize: 12 });
        act(() => ui.setBubbleBackgroundEnabled((on) => !on));
        expect(lastWrite()).toEqual({ bubbleBackground: false });
        act(() => ui.setCategoriesPanelEnabled(true));
        expect(lastWrite()).toEqual({ showCategoriesPanel: true });
        act(() => ui.setShowInstructions(false));
        expect(lastWrite()).toEqual({ showInstructions: false });
        expect(ui).toMatchObject({ fontSize: 12, bubbleBackgroundEnabled: false, categoriesPanelEnabled: true, showInstructions: false });
    });
});
