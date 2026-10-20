/**
 * The user document users/{uid} and its settings (data contract v2, spec sections 3.4 and 3.5).
 */
import { doc, getDoc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { newUserDocData, settingsFromUserDoc, settingsUpdateData } from './convert';

const userRef = (db, uid) => doc(db, 'users', uid);

/**
 * Live settings: onSettings(settings) while users/{uid} exists, onSettings(null, { fromCache })
 * while it does not; fromCache false means the server says so, not only this device's cache.
 */
export const subscribeUserDoc = (db, uid, onSettings, onError) => onSnapshot(userRef(db, uid), { includeMetadataChanges: true }, (snapshot) => {
    if (snapshot.exists()) onSettings(settingsFromUserDoc(snapshot.data()));
    else onSettings(null, { fromCache: snapshot.metadata.fromCache });
}, onError);

/**
 * Creates users/{uid} with these settings unless it already exists (spec 3.4); true if created.
 * Never replaces the document: if another device creates it at the same moment, the rules
 * reject this write.
 */
export const ensureUserDoc = async (db, uid, settings) => {
    const ref = userRef(db, uid);
    if ((await getDoc(ref)).exists()) return false;
    await setDoc(ref, newUserDocData(settings));
    return true;
};

/** Writes only the changed settings, field by field (spec 3.5). */
export const updateSettings = (db, uid, changes) => updateDoc(userRef(db, uid), settingsUpdateData(changes));
