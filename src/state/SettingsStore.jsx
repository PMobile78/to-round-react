import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { db } from '../firebase';
import i18n from '../i18n';
import { ensureUserDoc, subscribeUserDoc, updateSettings as writeSettings } from '../services/data/settings';
import { settingsFromLocalStorage } from '../contract/migrateV1';
import { removeLegacyLocalData } from '../utils/legacyLocalData';
import logger from '../utils/logger';

/**
 * The signed-in user's settings, users/{uid}.settings (data contract v2, spec 3.4–3.5).
 * App keeps them with useUserSettings and hands them down through SettingsContext.
 */

// localStorage itself can throw (blocked storage): every access stays inside the callbacks.
const legacyStorage = {
    getItem: (key) => window.localStorage.getItem(key),
    removeItem: (key) => window.localStorage.removeItem(key),
};

// One creation of users/{uid} at a time, also across the effect re-runs of StrictMode.
const creating = new Map();
const createOnce = (uid, settings) => {
    if (!creating.has(uid)) creating.set(uid, ensureUserDoc(db, uid, settings).finally(() => creating.delete(uid)));
    return creating.get(uid);
};

/**
 * Live settings of uid. At sign-in the user document is created if it does not exist yet,
 * seeded from this browser's old settings, and then the old local keys are removed. A new
 * account takes the language of the sign-in screen. If the first start could not create the
 * document (offline), it is created once the server says it is still missing.
 * settings is null while signed out and until the document is read.
 */
export function useUserSettings(uid) {
    const [settings, setSettings] = useState(null);
    // Latest settings, also right after a local change: several changes made in one
    // handler build on each other instead of on the last render.
    const latest = useRef(null);

    const apply = useCallback((next) => {
        latest.current = next;
        setSettings(next);
    }, []);

    useEffect(() => {
        apply(null);
        if (!uid) return undefined;
        const initial = settingsFromLocalStorage(legacyStorage.getItem, i18n.language);
        const create = () => createOnce(uid, initial)
            .then(() => removeLegacyLocalData(legacyStorage, uid))
            .catch((e) => {
                // No document and no way to create it now (e.g. the first start offline):
                // work with this browser's settings until the document can be read.
                logger.error('Could not create the user document:', e);
                if (!latest.current) apply(initial);
            });
        create();
        return subscribeUserDoc(db, uid, (next, meta) => {
            // The same settings again (the server confirming this device's write): nothing to show.
            if (next && JSON.stringify(next) !== JSON.stringify(latest.current)) apply(next);
            if (!next && meta && !meta.fromCache) create();
        }, (e) => logger.error('Settings listener error:', e));
    }, [uid, apply]);

    const updateSettings = useCallback((changes) => {
        if (!uid || !latest.current) return;
        apply({ ...latest.current, ...changes });
        writeSettings(db, uid, changes).catch((e) => logger.error('Could not save settings:', e));
    }, [uid, apply]);

    const getSettings = useCallback(() => latest.current, []);

    return useMemo(() => ({ settings, updateSettings, getSettings }), [settings, updateSettings, getSettings]);
}
