// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MainMenuDrawer from './MainMenuDrawer';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key) => key, i18n: { language: 'en', changeLanguage: vi.fn() } }),
}));

describe('MainMenuDrawer: "Reminders on this device" (spec 3.3, 8.9)', () => {
    let container;
    let root;
    let onToggle;

    const render = (thisDevice) => act(() => root.render(
        <MainMenuDrawer
            open
            onClose={vi.fn()}
            isMobile={false}
            themeMode="light"
            mainView="bubbles"
            bubbleBackgroundEnabled
            categoriesPanelEnabled={false}
            thisDevice={thisDevice}
            onToggleThisDeviceReminders={onToggle}
        />
    ));
    const remindersSwitch = () => document.querySelector('input[aria-label="bubbles.deviceReminders"]');

    beforeEach(() => {
        onToggle = vi.fn();
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
    });

    it('shows whether this device gets reminders and turns them off', () => {
        render({ id: 'fid-1', fcmToken: 'token-1', notificationsEnabled: true });
        expect(remindersSwitch().checked).toBe(true);
        expect(document.body.textContent).not.toContain('bubbles.deviceRemindersNoPermission');
        act(() => remindersSwitch().click());
        expect(onToggle).toHaveBeenCalledWith(false);
    });

    it('says why reminders cannot reach a browser without the notification permission', () => {
        render({ id: 'fid-1', fcmToken: null, notificationsEnabled: true });
        expect(document.body.textContent).toContain('bubbles.deviceRemindersNoPermission');
    });

    it('locks the switch until this device is registered', () => {
        render(null);
        expect(remindersSwitch().disabled).toBe(true);
    });
});

describe('MainMenuDrawer: backup export and import (spec 10)', () => {
    let container;
    let root;
    let props;

    const render = () => act(() => root.render(
        <MainMenuDrawer
            open
            onClose={props.onClose}
            isMobile={false}
            themeMode="light"
            mainView="bubbles"
            bubbleBackgroundEnabled
            categoriesPanelEnabled={false}
            thisDevice={null}
            onExportBackup={props.onExportBackup}
            onImportBackupFile={props.onImportBackupFile}
        />
    ));
    const menuItem = (text) => Array.from(document.querySelectorAll('.MuiListItemButton-root')).find((el) => el.textContent === text);
    const fileInput = () => document.querySelector('input[type="file"]');

    beforeEach(() => {
        props = { onClose: vi.fn(), onExportBackup: vi.fn(), onImportBackupFile: vi.fn() };
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
    });

    it('exports a backup', () => {
        render();
        act(() => menuItem('backup.export').click());
        expect(props.onClose).toHaveBeenCalled();
        expect(props.onExportBackup).toHaveBeenCalledTimes(1);
    });

    it('opens the file chooser for the import and hands it the chosen file', () => {
        render();
        const choose = vi.spyOn(fileInput(), 'click');
        act(() => menuItem('backup.import').click());
        expect(choose).toHaveBeenCalledTimes(1);
        expect(fileInput().accept).toBe('application/json,.json');

        const file = new window.File(['{}'], 'backup.json', { type: 'application/json' });
        Object.defineProperty(fileInput(), 'files', { value: [file] });
        act(() => fileInput().dispatchEvent(new window.Event('change', { bubbles: true })));
        expect(props.onImportBackupFile).toHaveBeenCalledWith(file);
        expect(props.onClose).toHaveBeenCalled();
    });
});
