import { useCallback, useEffect, useRef, useState } from 'react';
import { db } from '../firebase';
import { deviceTimeZone } from '../contract/time';
import { checkMigration, planMigration, runMigration } from '../services/data/migration';
import logger from '../utils/logger';

// Right after a sign-in another open tab of the app can still answer for this one with the
// previous account (the Firestore cache shared by the tabs) until it wakes up, which a tab in the
// background does about once a minute, and the rules refuse until then: a refused check tries
// again every 3 seconds for a minute and a half before it counts as failed.
const CHECK_AGAIN_MS = 3000;
const CHECK_AGAIN_TIMES = 30;
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * The move from v1 for the signed-in user (spec 9.1). state: { step: 'checking' } |
 * { step: 'preview', preview } | { step: 'moving', done, total } | { step: 'error', error: i18n key } |
 * { step: 'ready' }. settings are the app's: their language names untitled tasks, and they seed
 * users/{uid} if the first sign-in could not create it.
 */
export function useMigration(uid, settings) {
    const [state, setState] = useState({ step: 'checking' });
    const plan = useRef(null);
    const latestSettings = useRef(settings);
    latestSettings.current = settings;
    // The latest check: an earlier one (another account, the gate gone) stops and shows nothing.
    const run = useRef(0);

    const check = useCallback(async () => {
        const id = run.current + 1;
        run.current = id;
        setState({ step: 'checking' });
        try {
            let v1;
            for (let again = 0; ; again += 1) {
                try {
                    v1 = await checkMigration(db, uid);
                    break;
                } catch (e) {
                    if (!e || e.code !== 'permission-denied' || again === CHECK_AGAIN_TIMES) throw e;
                }
                await pause(CHECK_AGAIN_MS);
                if (run.current !== id) return;
            }
            if (run.current !== id) return;
            if (!v1) {
                setState({ step: 'ready' });
                return;
            }
            plan.current = planMigration(v1, {
                now: new Date(),
                timeZone: deviceTimeZone(),
                language: latestSettings.current.language,
            });
            setState({ step: 'preview', preview: plan.current.preview });
        } catch (e) {
            if (run.current !== id) return;
            logger.error('Could not read the data to move from v1:', e);
            setState({ step: 'error', error: 'migration.checkFailed' });
        }
    }, [uid]);

    useEffect(() => {
        check();
        return () => {
            run.current += 1;
        };
    }, [check]);

    const move = useCallback(async () => {
        const current = plan.current;
        setState({ step: 'moving', done: 0, total: current.tasks.length + current.categories.length + 1 });
        try {
            await runMigration(db, uid, current, latestSettings.current, (done, total) => setState({ step: 'moving', done, total }));
            setState({ step: 'ready' });
        } catch (e) {
            logger.error('The move from v1 stopped:', e);
            setState({ step: 'error', error: 'migration.moveFailed' });
        }
    }, [uid]);

    return { state, move, retry: check };
}
