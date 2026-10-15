/**
 * Data contract v2 keeps settings, tasks and categories only in Firestore (spec section 2).
 * After the first sign-in has moved this browser's settings into users/{uid}.settings
 * (spec 3.5), the old keys go, together with the v1 copies of tasks and categories (spec 8.2).
 * The FAB position, the mind maps and the Firebase installation id stay on the device.
 */
import { LS } from './storageKeys';

export const removeLegacyLocalData = (storage, uid) => {
    [...Object.values(LS), `bubbles_${uid}`, `tags_${uid}`].forEach((key) => {
        try {
            storage.removeItem(key);
        } catch {
            // Blocked storage (private mode, policy): nothing to clean up there.
        }
    });
};
