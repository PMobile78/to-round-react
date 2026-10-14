import { describe, it, beforeAll, afterAll, afterEach } from 'vitest';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { Timestamp, deleteDoc, deleteField, doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import settingsFixtures from '../contract/fixtures/settings.json';
import { OTHER, OWNER, seed, setupRulesEnv, userDocWith } from './helpers';

const DEFAULTS = settingsFixtures.valid[0].value;
let env;

beforeAll(async () => { env = await setupRulesEnv(); });
afterEach(async () => { await env.clearFirestore(); });
afterAll(async () => { await env.cleanup(); });

const userRef = (uid = OWNER) => doc(env.authenticatedContext(uid).firestore(), `users/${OWNER}`);

describe('users/{uid}: settings (contract fixtures)', () => {
    it.each(settingsFixtures.valid)('accepts $name', async ({ value }) => {
        await assertSucceeds(setDoc(userRef(), userDocWith(value)));
    });

    it.each(settingsFixtures.invalid)('rejects $name', async ({ value }) => {
        await assertFails(setDoc(userRef(), userDocWith(value)));
    });
});

describe('users/{uid}: updates', () => {
    it('changes one setting by its dot path with a server updatedAt', async () => {
        await seed(env, `users/${OWNER}`, userDocWith(DEFAULTS));
        await assertSucceeds(updateDoc(userRef(), { 'settings.themeMode': 'dark', updatedAt: serverTimestamp() }));
    });

    it('rejects an update that does not stamp updatedAt', async () => {
        await seed(env, `users/${OWNER}`, userDocWith(DEFAULTS));
        await assertFails(updateDoc(userRef(), { 'settings.themeMode': 'dark' }));
    });

    it('rejects removing a required setting', async () => {
        await seed(env, `users/${OWNER}`, userDocWith(DEFAULTS));
        await assertFails(updateDoc(userRef(), { 'settings.listSort': deleteField(), updatedAt: serverTimestamp() }));
    });

    it('accepts the migration marker', async () => {
        await seed(env, `users/${OWNER}`, userDocWith(DEFAULTS));
        await assertSucceeds(updateDoc(userRef(), {
            migration: { fromV1At: serverTimestamp(), tasks: 12, categories: 3 },
            updatedAt: serverTimestamp(),
        }));
    });

    it('rejects a createdAt from the future', async () => {
        const future = Timestamp.fromMillis(Date.now() + 10 * 60 * 1000);
        await assertFails(setDoc(userRef(), { ...userDocWith(DEFAULTS), createdAt: future }));
    });

    it('never lets the owner delete the user document', async () => {
        await seed(env, `users/${OWNER}`, userDocWith(DEFAULTS));
        await assertFails(deleteDoc(userRef()));
    });
});

describe('users/{uid}: access', () => {
    it('keeps other users and guests out', async () => {
        await seed(env, `users/${OWNER}`, userDocWith(DEFAULTS));
        await assertFails(getDoc(userRef(OTHER)));
        await assertFails(setDoc(userRef(OTHER), userDocWith(DEFAULTS)));
        await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), `users/${OWNER}`)));
    });
});
