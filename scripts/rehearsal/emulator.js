/**
 * The local emulators of `npm run start:emulator` (project demo-to-round) for the rehearsal of the
 * move: a Firestore client that the rules do not limit, and the accounts of the Auth emulator.
 * A demo- project never reaches a real Firebase project.
 */
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { categoryFromDoc, taskFromDoc } from '../../src/services/data/convert';

const PROJECT = 'demo-to-round';
const AUTH_EMULATOR = 'http://127.0.0.1:9099';

export const openEmulator = () => initializeTestEnvironment({
    projectId: PROJECT,
    firestore: { host: '127.0.0.1', port: 8180 },
});

/** The uid of the Auth-emulator account with this email (registered in the web first). */
export const uidOf = async (email) => {
    const response = await fetch(`${AUTH_EMULATOR}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:query`, {
        method: 'POST',
        headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
        body: '{}',
    });
    const account = ((await response.json()).userInfo || []).find((a) => a.email === email);
    if (!account) throw new Error(`No Auth-emulator account ${email}: register it in the web on the emulator first.`);
    return account.localId;
};

/** users/{uid} as the check compares it: { language, migration, categories, tasks }, in backup form. */
export const readMoved = async (env, uid) => {
    let moved;
    await env.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        const [user, categories, tasks] = await Promise.all([
            getDoc(doc(db, 'users', uid)),
            getDocs(collection(db, 'users', uid, 'categories')),
            getDocs(collection(db, 'users', uid, 'tasks')),
        ]);
        const data = user.data() || {};
        moved = {
            language: data.settings ? data.settings.language : 'en',
            migration: data.migration || null,
            categories: categories.docs.map((d) => categoryFromDoc(d.id, d.data())),
            tasks: tasks.docs.map((d) => taskFromDoc(d.id, d.data())),
        };
    });
    return moved;
};
