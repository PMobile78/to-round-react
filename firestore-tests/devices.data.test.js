/**
 * The web data layer for devices (src/services/data/devices.js) against the emulator with the
 * real firestore.rules (spec 3.3: registration on sign-in, the switch, removal on sign-out).
 */
import { describe, it, beforeAll, afterAll, afterEach, expect, vi } from 'vitest';
import { doc, getDoc } from 'firebase/firestore';
import { OWNER, PAST, seed, setupRulesEnv } from './helpers';
import {
    registerDevice, setDeviceNotificationsEnabled, subscribeDevice, unregisterDevice,
} from '../src/services/data/devices';

let env;

beforeAll(async () => { env = await setupRulesEnv(); });
afterEach(async () => { await env.clearFirestore(); });
afterAll(async () => { await env.cleanup(); });

const device = () => env.authenticatedContext(OWNER).firestore();
const read = async (path) => (await getDoc(doc(device(), path))).data();

describe('devices', () => {
    const devicePath = `users/${OWNER}/devices/fid-1`;

    it('registers a new device with notifications on', async () => {
        expect(await registerDevice(device(), OWNER, 'fid-1', 'token-1')).toBe(true);
        expect(await read(devicePath)).toMatchObject({ platform: 'web', fcmToken: 'token-1', notificationsEnabled: true });
    });

    it('registers without a token when notifications are not allowed', async () => {
        await registerDevice(device(), OWNER, 'fid-1', null);
        expect(await read(devicePath)).toMatchObject({ fcmToken: null, notificationsEnabled: true });
    });

    it('updates only the token of a known device and keeps its switch', async () => {
        await seed(env, devicePath, {
            platform: 'web', fcmToken: 'token-1', notificationsEnabled: false, createdAt: PAST, updatedAt: PAST,
        });
        expect(await registerDevice(device(), OWNER, 'fid-1', 'token-2')).toBe(false);
        const data = await read(devicePath);
        expect(data).toMatchObject({ fcmToken: 'token-2', notificationsEnabled: false, createdAt: PAST });
        expect(data.updatedAt.toMillis()).toBeGreaterThan(PAST.toMillis());
    });

    it('keeps the token of a known device when this browser could not get one (FCM error)', async () => {
        await seed(env, devicePath, {
            platform: 'web', fcmToken: 'token-1', notificationsEnabled: true, createdAt: PAST, updatedAt: PAST,
        });
        await expect(registerDevice(device(), OWNER, 'fid-1', undefined)).resolves.toBe(false);
        expect(await read(devicePath)).toMatchObject({ fcmToken: 'token-1', notificationsEnabled: true });
    });

    it('registers a new device without a token when this browser could not get one', async () => {
        await expect(registerDevice(device(), OWNER, 'fid-1', undefined)).resolves.toBe(true);
        expect(await read(devicePath)).toMatchObject({ fcmToken: null, notificationsEnabled: true });
    });

    it('turns notifications on this device off and on, live', async () => {
        await registerDevice(device(), OWNER, 'fid-1', 'token-1');
        const seen = [];
        const unsubscribe = subscribeDevice(device(), OWNER, 'fid-1', (d) => seen.push(d && d.notificationsEnabled));
        await vi.waitFor(() => expect(seen.at(-1)).toBe(true));
        await setDeviceNotificationsEnabled(device(), OWNER, 'fid-1', false);
        await vi.waitFor(() => expect(seen.at(-1)).toBe(false));
        await unregisterDevice(device(), OWNER, 'fid-1');
        await vi.waitFor(() => expect(seen.at(-1)).toBeNull());
        expect(await read(devicePath)).toBeUndefined();
        unsubscribe();
    });
});
