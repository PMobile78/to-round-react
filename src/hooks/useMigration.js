import { useCallback, useEffect, useRef, useState } from 'react';
import { db } from '../firebase';
import { deviceTimeZone } from '../contract/time';
import { checkMigration, planMigration, runMigration } from '../services/data/migration';
import logger from '../utils/logger';

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

    const check = useCallback(async () => {
        setState({ step: 'checking' });
        try {
            const v1 = await checkMigration(db, uid);
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
            logger.error('Could not read the data to move from v1:', e);
            setState({ step: 'error', error: 'migration.checkFailed' });
        }
    }, [uid]);

    useEffect(() => {
        check();
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
