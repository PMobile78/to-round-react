// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useThemeMode } from './useThemeMode';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('useThemeMode (spec 3.5)', () => {
    let container;
    let root;
    let mode;
    let systemQuery;

    function Probe({ settings, updateSettings }) {
        mode = useThemeMode(settings, updateSettings);
        return null;
    }
    const render = (props) => act(() => root.render(<Probe {...props} />));

    beforeEach(() => {
        localStorage.clear();
        const listeners = new Set();
        systemQuery = {
            matches: false,
            addEventListener: (type, fn) => listeners.add(fn),
            removeEventListener: (type, fn) => listeners.delete(fn),
            flip(matches) {
                this.matches = matches;
                listeners.forEach((fn) => fn());
            },
        };
        vi.spyOn(window, 'matchMedia').mockImplementation(() => systemQuery);
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
        vi.restoreAllMocks();
    });

    it('uses the system theme and the classic design before sign-in and keeps a change only on screen', () => {
        const updateSettings = vi.fn();
        render({ settings: null, updateSettings });
        expect(mode).toMatchObject({ themeMode: 'system', actualTheme: 'light', design: 'classic' });
        act(() => mode.toggleTheme());
        expect(mode.themeMode).toBe('light');
        expect(updateSettings).not.toHaveBeenCalled();
        expect(localStorage.length).toBe(0);
    });

    it('follows the user settings after sign-in and writes changes there', () => {
        const updateSettings = vi.fn();
        render({ settings: { themeMode: 'dark', design: 'clay' }, updateSettings });
        expect(mode).toMatchObject({ themeMode: 'dark', actualTheme: 'dark', design: 'clay' });
        act(() => mode.setThemeMode('light'));
        act(() => mode.setDesign('modern'));
        act(() => mode.setDesign('no-such-design'));
        expect(updateSettings.mock.calls).toEqual([[{ themeMode: 'light' }], [{ design: 'modern' }]]);
    });

    it('follows a change of the system theme in "system" mode', () => {
        render({ settings: { themeMode: 'system', design: 'classic' }, updateSettings: vi.fn() });
        expect(mode.actualTheme).toBe('light');
        act(() => systemQuery.flip(true));
        expect(mode.actualTheme).toBe('dark');
    });
});
