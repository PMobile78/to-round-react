// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsContext } from '../state/SettingsContext';
import LanguageSelector from './LanguageSelector';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const i18n = { language: 'en', changeLanguage: vi.fn() };
vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key) => key, i18n }),
}));

describe('LanguageSelector (spec 3.5)', () => {
    let container;
    let root;

    const pickUkrainian = () => {
        act(() => container.querySelector('button').click());
        const item = Array.from(document.querySelectorAll('[role="menuitem"]'))
            .find((el) => el.textContent.includes('Українська'));
        act(() => item.click());
    };

    beforeEach(() => {
        localStorage.clear();
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
        vi.clearAllMocks();
    });

    it('switches only this screen before sign-in and saves nothing', () => {
        act(() => root.render(<LanguageSelector />));
        pickUkrainian();
        expect(i18n.changeLanguage).toHaveBeenCalledWith('uk');
        expect(localStorage.length).toBe(0);
    });

    it('saves the language in the user settings after sign-in', () => {
        const updateSettings = vi.fn();
        act(() => root.render(
            <SettingsContext.Provider value={{ settings: {}, updateSettings, getSettings: () => ({}) }}>
                <LanguageSelector />
            </SettingsContext.Provider>
        ));
        pickUkrainian();
        expect(updateSettings).toHaveBeenCalledWith({ language: 'uk' });
        expect(i18n.changeLanguage).not.toHaveBeenCalled();
    });
});
