import { describe, it, beforeAll, afterAll, afterEach } from 'vitest';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { OTHER, OWNER, seed, setupRulesEnv } from './helpers';

const LEGACY_DOCS = [
    `user-bubbles/${OWNER}`,
    `user-bubbles/${OWNER}/bubbles/b1`,
    `user-tags/${OWNER}`,
    `user-fcm-tokens/${OWNER}/tokens/t1`,
];

let env;

beforeAll(async () => { env = await setupRulesEnv(); });
afterEach(async () => { await env.clearFirestore(); });
afterAll(async () => { await env.cleanup(); });

const ownerDb = () => env.authenticatedContext(OWNER).firestore();
const otherDb = () => env.authenticatedContext(OTHER).firestore();

describe('legacy v1 collections are read-only', () => {
    it.each(LEGACY_DOCS)('owner reads but cannot change %s', async (path) => {
        await seed(env, path, { title: 'old' });
        await assertSucceeds(getDoc(doc(ownerDb(), path)));
        await assertFails(setDoc(doc(ownerDb(), path), { title: 'new' }));
        await assertFails(updateDoc(doc(ownerDb(), path), { title: 'new' }));
        await assertFails(deleteDoc(doc(ownerDb(), path)));
    });

    it.each(LEGACY_DOCS)('other users and guests cannot read %s', async (path) => {
        await seed(env, path, { title: 'old' });
        await assertFails(getDoc(doc(otherDb(), path)));
        await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), path)));
    });
});

describe('mind maps stay owner read/write', () => {
    it('owner writes and reads a map, others cannot', async () => {
        const path = `user-mindmaps/${OWNER}/maps/m1`;
        await assertSucceeds(setDoc(doc(ownerDb(), path), { title: 'Plan' }));
        await assertSucceeds(getDoc(doc(ownerDb(), path)));
        await assertFails(getDoc(doc(otherDb(), path)));
    });
});

describe('closed paths', () => {
    it('keeps notification-sent closed to clients', async () => {
        await assertFails(getDoc(doc(ownerDb(), 'notification-sent/k1')));
        await assertFails(setDoc(doc(ownerDb(), 'notification-sent/k1'), { at: 1 }));
    });

    it('denies unknown paths', async () => {
        await assertFails(setDoc(doc(ownerDb(), `somewhere/${OWNER}`), { a: 1 }));
    });
});
