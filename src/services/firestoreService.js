import {
    doc,
    setDoc,
    updateDoc,
    getDoc,
    serverTimestamp,
    onSnapshot,
    runTransaction
} from 'firebase/firestore';
import { db } from '../firebase';
import { getCurrentUser } from './authService';
import { lsGet, lsSet } from '../utils/storage';
import logger from '../utils/logger';

// Get user ID for document creation
const getUserDocumentId = () => {
    const user = getCurrentUser();
    if (!user) {
        throw new Error('User not authenticated');
    }
    return user.uid;
};

// Collections references
const BUBBLES_COLLECTION = 'user-bubbles';
const BUBBLES_SUBCOLLECTION = 'bubbles'; // normalized: one doc per bubble
const TAGS_COLLECTION = 'user-tags';

// Bubble statuses
export const BUBBLE_STATUS = {
    ACTIVE: 'active',
    DONE: 'done',
    POSTPONE: 'postpone',
    DELETED: 'deleted'
};

// Point-wise update fields of single bubble
export const updateBubbleFields = async (bubbleId, fields, userId = getUserDocumentId()) => {
    const ref = doc(db, BUBBLES_COLLECTION, userId, BUBBLES_SUBCOLLECTION, String(bubbleId));
    await updateDoc(ref, fields);
};

// Get bubbles by status
export const getBubblesByStatus = (bubblesData, status) => {
    if (!status) return bubblesData;
    return bubblesData.filter(bubble => bubble.status === status);
};

// Tags operations
//
// Tags live as an array in a single document (`user-tags/{uid}`). Whole-array
// writes (saveTagsToFirestore) clobber concurrent edits from other devices when
// the local snapshot is stale. For single-tag add/edit/delete prefer the
// transactional helpers below: each reads the current array *inside* the
// transaction and applies only its own delta, so a concurrent change on another
// device is preserved. saveTagsToFirestore stays for deliberate whole-list ops
// (import, reorder) where replacing the entire array is the intended semantics.
export const saveTagsToFirestore = async (tagsData) => {
    try {
        const userId = getUserDocumentId();
        const tagsRef = doc(db, TAGS_COLLECTION, userId);

        await setDoc(tagsRef, {
            tags: tagsData,
            updatedAt: serverTimestamp(),
            userId
        }, { merge: true });

    } catch (error) {
        logger.error('Error saving tags to Firestore:', error);
        // Fallback to localStorage with user-specific key
        const uid = getCurrentUser()?.uid;
        if (!uid) return;
        lsSet(`tags_${uid}`, tagsData);
    }
};

// Read the current tags array from a transaction snapshot, defensively.
const readTagsFromSnap = (snap) => {
    if (!snap.exists()) return [];
    const tags = snap.data()?.tags;
    return Array.isArray(tags) ? tags : [];
};

// Add or update a single tag atomically. Returns the resulting tags array.
// Transaction reads fresh server state, so a tag added/edited on another device
// since the local snapshot is not overwritten.
export const upsertTagInFirestore = async (tag) => {
    const userId = getUserDocumentId();
    const tagsRef = doc(db, TAGS_COLLECTION, userId);
    return runTransaction(db, async (transaction) => {
        const snap = await transaction.get(tagsRef);
        const current = readTagsFromSnap(snap);
        const idx = current.findIndex(t => t.id === tag.id);
        const next = idx >= 0
            ? current.map(t => (t.id === tag.id ? tag : t))
            : [...current, tag];
        transaction.set(tagsRef, { tags: next, updatedAt: serverTimestamp(), userId }, { merge: true });
        return next;
    });
};

// Remove a single tag by id atomically. Returns the resulting tags array.
export const deleteTagFromFirestore = async (tagId, userId = getUserDocumentId()) => {
    const tagsRef = doc(db, TAGS_COLLECTION, userId);
    return runTransaction(db, async (transaction) => {
        const snap = await transaction.get(tagsRef);
        const current = readTagsFromSnap(snap);
        const next = current.filter(t => t.id !== tagId);
        transaction.set(tagsRef, { tags: next, updatedAt: serverTimestamp(), userId }, { merge: true });
        return next;
    });
};

export const loadTagsFromFirestore = async () => {
    try {
        const userId = getUserDocumentId();
        const tagsRef = doc(db, TAGS_COLLECTION, userId);
        const docSnap = await getDoc(tagsRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            return data.tags || [];
        }
        // Fallback to localStorage with user-specific key
        const stored = lsGet(`tags_${userId}`);
        return stored || [];
    } catch (error) {
        logger.error('Error loading tags from Firestore:', error);
        // Fallback to localStorage with user-specific key
        const uid = getCurrentUser()?.uid;
        if (!uid) return [];
        const stored = lsGet(`tags_${uid}`);
        return stored || [];
    }
};

// Real-time listeners (optional)
export const subscribeToTagsUpdates = (callback) => {
    try {
        const userId = getUserDocumentId();
        const tagsRef = doc(db, TAGS_COLLECTION, userId);

        return onSnapshot(tagsRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                const tags = data.tags || [];
                // Ensure we always pass an array to the callback
                callback(Array.isArray(tags) ? tags : []);
            } else {
                callback([]);
            }
        });
    } catch (error) {
        logger.error('Error setting up tags listener:', error);
        return () => { }; // Return empty unsubscribe function
    }
};
