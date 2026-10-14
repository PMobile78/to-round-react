import { describe, it, beforeAll, afterAll, afterEach } from 'vitest';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import deviceFixtures from '../contract/fixtures/devices.json';
import { OTHER, OWNER, deviceFromFixture, seed, setupRulesEnv } from './helpers';

let env;

beforeAll(async () => { env = await setupRulesEnv(); });
afterEach(async () => { await env.clearFirestore(); });
afterAll(async () => { await env.cleanup(); });

const deviceRef = (id, uid = OWNER) => doc(env.authenticatedContext(uid).firestore(), `users/${OWNER}/devices/${id}`);
const webDevice = () => deviceFromFixture(deviceFixtures.valid[0].value);

describe('users/{uid}/devices: contract fixtures', () => {
    it.each(deviceFixtures.valid)('accepts $name', async ({ value }) => {
        const [id, data] = deviceFromFixture(value);
        await assertSucceeds(setDoc(deviceRef(id), data));
    });

    it.each(deviceFixtures.invalid)('rejects $name', async ({ value }) => {
        const [id, data] = deviceFromFixture(value);
        await assertFails(setDoc(deviceRef(id), data));
    });
});

describe('users/{uid}/devices: updates and access', () => {
    it('turns notifications off with a server updatedAt', async () => {
        const [id, data] = webDevice();
        await seed(env, `users/${OWNER}/devices/${id}`, data);
        await assertSucceeds(updateDoc(deviceRef(id), { notificationsEnabled: false, updatedAt: serverTimestamp() }));
    });

    it('rejects an update that does not stamp updatedAt', async () => {
        const [id, data] = webDevice();
        await seed(env, `users/${OWNER}/devices/${id}`, data);
        await assertFails(updateDoc(deviceRef(id), { fcmToken: null }));
    });

    it('lets the owner remove the device on logout and keeps others out', async () => {
        const [id, data] = webDevice();
        await seed(env, `users/${OWNER}/devices/${id}`, data);
        await assertFails(getDoc(deviceRef(id, OTHER)));
        await assertFails(deleteDoc(deviceRef(id, OTHER)));
        await assertSucceeds(deleteDoc(deviceRef(id)));
    });
});
