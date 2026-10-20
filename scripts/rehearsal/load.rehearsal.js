/**
 * Rehearsal of the move (spec 9.3, step 2), part 1: loads a v1 export (the old web's "Export JSON")
 * into the v1 collections of an Auth-emulator account, as the old web kept them:
 * user-bubbles/{uid}/bubbles/{id} and user-tags/{uid}.tags.
 *
 *   REHEARSAL_EXPORT=<file> REHEARSAL_EMAIL=<account> npm run rehearsal:load
 *
 * Steps around it: docs/migration.md.
 */
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { doc, setDoc, writeBatch } from 'firebase/firestore';
import { isValidId } from '../../src/contract/validate';
import { openEmulator, uidOf } from './emulator';

let env;

beforeAll(async () => { env = await openEmulator(); });
afterAll(async () => { await env.cleanup(); });

it('loads the export into the v1 collections of the account', async () => {
    const file = JSON.parse(readFileSync(process.env.REHEARSAL_EXPORT, 'utf8'));
    expect(file.version).toBe(1);
    const uid = await uidOf(process.env.REHEARSAL_EMAIL);
    // The old web kept each task as a document named by its id: a record without one cannot be there.
    const bubbles = file.bubbles.filter((bubble) => bubble && bubble.id !== undefined && bubble.id !== null
        && isValidId(String(bubble.id)));
    await env.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        for (let start = 0; start < bubbles.length; start += 400) {
            const batch = writeBatch(db);
            bubbles.slice(start, start + 400)
                .forEach((bubble) => batch.set(doc(db, 'user-bubbles', uid, 'bubbles', String(bubble.id)), bubble));
            await batch.commit();
        }
        await setDoc(doc(db, 'user-tags', uid), { tags: file.tags, userId: uid });
    });
    process.stdout.write(`Loaded ${bubbles.length} tasks (${file.bubbles.length - bubbles.length} without an id left out) `
        + `and ${file.tags.length} categories into the v1 collections of ${process.env.REHEARSAL_EMAIL}.\n`);
});
