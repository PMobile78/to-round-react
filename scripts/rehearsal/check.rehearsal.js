/**
 * Rehearsal of the move (spec 9.3, step 2), part 2: after the web on the emulator has moved the
 * account, compares users/{uid} with what the export becomes by the rules of 9.2 — the numbers,
 * the marker and every field of every record (the due, the reminders and the repeat make the
 * reminder schedule). Prints only the numbers and the mismatches.
 *
 *   REHEARSAL_EXPORT=<file> REHEARSAL_EMAIL=<account> npm run rehearsal:check
 *
 * Steps around it: docs/migration.md.
 */
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { migrationDiff } from './migrationDiff';
import { openEmulator, readMoved, uidOf } from './emulator';

let env;

beforeAll(async () => { env = await openEmulator(); });
afterAll(async () => { await env.cleanup(); });

it('finds users/{uid} equal to the export moved by the rules of 9.2', async () => {
    const file = JSON.parse(readFileSync(process.env.REHEARSAL_EXPORT, 'utf8'));
    const diff = migrationDiff(file, await readMoved(env, await uidOf(process.env.REHEARSAL_EMAIL)));
    // process.stdout: the happy-dom console of the test does not reach the terminal.
    process.stdout.write(`Tasks: ${diff.tasks.expected} expected, ${diff.tasks.moved} moved. `
        + `Categories: ${diff.categories.expected} expected, ${diff.categories.moved} moved. Marker: ${JSON.stringify(diff.marker)}.\n`);
    diff.mismatches.forEach((m) => process.stdout.write(`Mismatch: ${m.kind} ${m.id} «${m.title}» ${m.field}`
        + ('expected' in m ? `: expected ${JSON.stringify(m.expected)}, moved ${JSON.stringify(m.moved)}` : '') + '\n'));
    expect(diff.mismatches).toEqual([]);
    expect(diff.marker).toEqual({ tasks: diff.tasks.expected, categories: diff.categories.expected });
});
