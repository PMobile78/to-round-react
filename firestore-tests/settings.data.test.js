/**
 * The web data layer for the user document (src/services/data/settings.js) against the emulator
 * with the real firestore.rules.
 */
import { describe, it, beforeAll, afterAll, afterEach, expect, vi } from 'vitest';
import { Timestamp, doc, getDoc } from 'firebase/firestore';
import settingsFixtures from '../contract/fixtures/settings.json';
import { OWNER, setupRulesEnv } from './helpers';
import { ensureUserDoc, subscribeUserDoc, updateSettings } from '../src/services/data/settings';

let env;

beforeAll(async () => { env = await setupRulesEnv(); });
afterEach(async () => { await env.clearFirestore(); });
afterAll(async () => { await env.cleanup(); });

const device = () => env.authenticatedContext(OWNER).firestore();
const read = async (path) => (await getDoc(doc(device(), path))).data();
const DEFAULTS = settingsFixtures.valid.find((f) => f.name === 'defaults').value;
const CUSTOMISED = settingsFixtures.valid.find((f) => f.name === 'customised').value;

describe('user document and settings', () => {
    it('creates the user document once and never replaces it', async () => {
        expect(await ensureUserDoc(device(), OWNER, CUSTOMISED)).toBe(true);
        expect(await ensureUserDoc(device(), OWNER, DEFAULTS)).toBe(false);
        const data = await read(`users/${OWNER}`);
        expect(data).toMatchObject({ schemaVersion: 2, settings: CUSTOMISED });
        expect(data.createdAt).toBeInstanceOf(Timestamp);
    });

    it('lets two devices change different settings without overwriting each other', async () => {
        await ensureUserDoc(device(), OWNER, DEFAULTS);
        await Promise.all([
            updateSettings(device(), OWNER, { themeMode: 'dark' }),
            updateSettings(device(), OWNER, { labelFontSize: 12, listSort: { by: 'title', order: 'asc' } }),
        ]);
        expect((await read(`users/${OWNER}`)).settings).toEqual({
            ...DEFAULTS, themeMode: 'dark', labelFontSize: 12, listSort: { by: 'title', order: 'asc' },
        });
    });

    it('delivers the settings live, and null while the server has no document', async () => {
        const seen = [];
        const unsubscribe = subscribeUserDoc(device(), OWNER, (settings, meta) => seen.push(settings || meta));
        await vi.waitFor(() => expect(seen.at(-1)).toEqual({ fromCache: false }));
        await ensureUserDoc(device(), OWNER, DEFAULTS);
        await vi.waitFor(() => expect(seen.at(-1)).toEqual(DEFAULTS));
        await updateSettings(device(), OWNER, { design: 'clay' });
        await vi.waitFor(() => expect(seen.at(-1)).toEqual({ ...DEFAULTS, design: 'clay' }));
        unsubscribe();
    });
});
