// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setDeviceNotificationsEnabled, subscribeDevice } from '../services/data/devices';
import { useThisDevice } from './useThisDevice';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../firebase', () => ({ db: 'db' }));
vi.mock('../firebaseMessaging', () => ({ thisDeviceId: vi.fn(() => Promise.resolve('fid-1')) }));
vi.mock('../services/data/devices', () => ({
    subscribeDevice: vi.fn(),
    setDeviceNotificationsEnabled: vi.fn(() => Promise.resolve()),
}));
vi.mock('../utils/logger', () => ({ default: { error: vi.fn() } }));

const DEVICE = { id: 'fid-1', platform: 'web', fcmToken: 'token-1', notificationsEnabled: true };

describe('useThisDevice: this browser in users/{uid}/devices (spec 3.3)', () => {
    let container;
    let root;
    let result;
    let deliver;
    let unsubscribe;

    function Probe({ uid }) {
        result = useThisDevice(uid);
        return null;
    }

    const mount = async (uid = 'u1') => {
        await act(async () => root.render(<Probe uid={uid} />));
    };

    beforeEach(() => {
        unsubscribe = vi.fn();
        subscribeDevice.mockImplementation((db, uid, deviceId, onDevice) => {
            deliver = onDevice;
            return unsubscribe;
        });
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
        vi.clearAllMocks();
    });

    it('follows the document of this device', async () => {
        await mount();
        expect(subscribeDevice).toHaveBeenCalledWith('db', 'u1', 'fid-1', expect.any(Function), expect.any(Function));
        expect(result.device).toBe(null);
        act(() => deliver(DEVICE));
        expect(result.device).toEqual(DEVICE);
    });

    it('turns the reminders of this device off and on', async () => {
        await mount();
        act(() => result.setNotificationsEnabled(false));
        expect(setDeviceNotificationsEnabled).toHaveBeenCalledWith('db', 'u1', 'fid-1', false);
    });

    it('stops following the device when the user signs out', async () => {
        await mount();
        act(() => root.unmount());
        root = createRoot(container);
        expect(unsubscribe).toHaveBeenCalledTimes(1);
    });
});
