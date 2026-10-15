// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import settingsFixtures from '../../contract/fixtures/settings.json';
import { ensureUserDoc, subscribeUserDoc, updateSettings as writeSettings } from '../services/data/settings';
import { useUserSettings } from './SettingsStore';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../firebase', () => ({ db: 'db' }));
vi.mock('../services/data/settings', () => ({
    ensureUserDoc: vi.fn(() => Promise.resolve(true)),
    subscribeUserDoc: vi.fn(() => vi.fn()),
    updateSettings: vi.fn(() => Promise.resolve()),
}));
vi.mock('../utils/logger', () => ({ default: { error: vi.fn() } }));

const DEFAULTS = settingsFixtures.valid.find((f) => f.name === 'defaults').value;
const flush = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

describe('useUserSettings (users/{uid}.settings, spec 3.4-3.5)', () => {
    let container;
    let root;
    let api;

    function Probe({ uid }) {
        api = useUserSettings(uid);
        return null;
    }
    const render = (uid) => act(() => root.render(<Probe uid={uid} />));
    const deliver = (settings) => act(() => subscribeUserDoc.mock.calls.at(-1)[2](settings));

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

    it('has no settings while signed out', () => {
        render(null);
        expect(api.settings).toBeNull();
        expect(subscribeUserDoc).not.toHaveBeenCalled();
    });

    it('creates the user document from this browser\'s old settings at the first sign-in, then removes the old keys', async () => {
        localStorage.setItem('app-theme-mode', 'dark');
        localStorage.setItem('bubbles-main-view', 'tasks');
        localStorage.setItem('bubbles_u1', '[]');
        localStorage.setItem('bubbles-fab-position', '{"x":1,"y":2}');
        render('u1');
        expect(ensureUserDoc).toHaveBeenCalledWith('db', 'u1', expect.objectContaining({ themeMode: 'dark', mainView: 'list' }));
        await flush();
        expect(Object.keys(localStorage)).toEqual(['bubbles-fab-position']);
    });

    it('waits for the settings from Firestore', () => {
        render('u1');
        expect(subscribeUserDoc).toHaveBeenCalledWith('db', 'u1', expect.any(Function), expect.any(Function));
        expect(api.settings).toBeNull();
        deliver(null); // the document does not exist yet
        expect(api.settings).toBeNull();
        deliver(DEFAULTS);
        expect(api.settings).toEqual(DEFAULTS);
    });

    it('shows a change at once, writes only that field and lets the next change build on it', () => {
        render('u1');
        deliver(DEFAULTS);
        act(() => api.updateSettings({ labelFontSize: 12 }));
        expect(api.settings.labelFontSize).toBe(12);
        expect(api.getSettings().labelFontSize).toBe(12);
        expect(writeSettings).toHaveBeenCalledWith('db', 'u1', { labelFontSize: 12 });
    });

    it('falls back to this browser\'s settings when the document cannot be read or created (first start offline)', async () => {
        ensureUserDoc.mockReturnValueOnce(Promise.reject(new Error('offline')));
        localStorage.setItem('app-design', 'clay');
        render('u1');
        await flush();
        expect(api.settings).toMatchObject({ design: 'clay' });
        expect(localStorage.getItem('app-design')).toBe('clay');
    });
});
