import {
    collection,
    doc,
    setDoc,
    updateDoc,
    getDoc,
    getDocs,
    deleteDoc,
    query,
    orderBy,
    serverTimestamp,
    onSnapshot,
    where,
    writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import { getCurrentUser } from './authService';
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

// Serialize a bubble into a plain storage object (single source of truth)
const serializeBubble = (bubble) => ({
    id: String(bubble.id),
    radius: bubble.radius,
    title: bubble.title || '',
    description: bubble.description || '',
    fillStyle: bubble.body?.render?.fillStyle || bubble.fillStyle || 'transparent',
    strokeStyle: bubble.body?.render?.strokeStyle || bubble.strokeStyle || '#3B7DED',
    tagId: bubble.tagId || null,
    status: bubble.status || BUBBLE_STATUS.ACTIVE,
    createdAt: bubble.createdAt || new Date().toISOString(),
    updatedAt: bubble.updatedAt || new Date().toISOString(),
    deletedAt: bubble.deletedAt || null,
    dueDate: bubble.dueDate || null,
    notifications: bubble.notifications || [],
    recurrence: bubble.recurrence || null,
    overdueSticky: typeof bubble.overdueSticky === 'boolean' ? bubble.overdueSticky : false,
    overdueAt: bubble.overdueAt || null,
    useRichText: !!bubble.useRichText
});

// Auto-cleanup period (30 days in milliseconds)
const CLEANUP_PERIOD = 30 * 24 * 60 * 60 * 1000;

// Bubbles operations
export const saveBubblesToFirestore = async (bubblesData) => {
    try {
        const userId = getUserDocumentId();
        const parentRef = doc(db, BUBBLES_COLLECTION, userId);
        const bubblesCol = collection(db, BUBBLES_COLLECTION, userId, BUBBLES_SUBCOLLECTION);

        // existing docs
        const existingSnap = await getDocs(bubblesCol);
        const existingIds = new Set(existingSnap.docs.map(d => d.id));

        // Prepare batch upserts/deletes
        const batch = writeBatch(db);

        // Upsert incoming
        const incomingIds = new Set();
        for (const bubble of bubblesData) {
            const id = String(bubble.id);
            incomingIds.add(id);
            const ref = doc(bubblesCol, id);
            batch.set(ref, serializeBubble(bubble), { merge: true });
        }

        // Delete removed
        for (const id of existingIds) {
            if (!incomingIds.has(id)) {
                const ref = doc(bubblesCol, id);
                batch.delete(ref);
            }
        }

        // Touch parent doc
        batch.set(parentRef, { updatedAt: serverTimestamp(), userId, schema: 'normalized' }, { merge: true });

        await batch.commit();

    } catch (error) {
        logger.error('Error saving bubbles to Firestore (normalized). Trying legacy doc...', error);
        const currentUser = getCurrentUser();
        if (!currentUser) return;
        try {
            // Legacy fallback: store as array in parent document
            const userId = currentUser.uid;
            const bubblesRef = doc(db, BUBBLES_COLLECTION, userId);
            const bubblesForStorage = bubblesData.map(serializeBubble);
            await setDoc(bubblesRef, { bubbles: bubblesForStorage, updatedAt: serverTimestamp(), userId }, { merge: true });
        } catch (legacyError) {
            logger.error('Legacy save failed. Falling back to localStorage.', legacyError);
            // Fallback to localStorage with user-specific key
            const userId = currentUser.uid;
            const bubblesForStorage = bubblesData.map(serializeBubble);
            localStorage.setItem(`bubbles_${userId}`, JSON.stringify(bubblesForStorage));
        }
    }
};

export const loadBubblesFromFirestore = async () => {
    try {
        const userId = getUserDocumentId();
        // Try new normalized storage first
        const bubblesCol = collection(db, BUBBLES_COLLECTION, userId, BUBBLES_SUBCOLLECTION);
        const snapshot = await getDocs(bubblesCol);
        const normalized = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        if (normalized.length > 0) return normalized;

        // Fallback to old array-based doc
        const oldDocRef = doc(db, BUBBLES_COLLECTION, userId);
        const docSnap = await getDoc(oldDocRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            const legacy = Array.isArray(data.bubbles) ? data.bubbles : [];
            if (legacy.length > 0) {
                // One-time migrate to subcollection (best-effort)
                try {
                    await saveBubblesToFirestore(legacy);
                    await setDoc(oldDocRef, { migratedToSubcollection: true, updatedAt: serverTimestamp(), userId }, { merge: true });
                } catch (_) { /* ignore migration errors */ }
            }
            return legacy;
        }
        // Fallback to localStorage with user-specific key
        const stored = localStorage.getItem(`bubbles_${userId}`);
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        logger.error('Error loading bubbles from Firestore:', error);
        // Fallback to localStorage with user-specific key
        const uid = getCurrentUser()?.uid;
        if (!uid) return [];
        const stored = localStorage.getItem(`bubbles_${uid}`);
        return stored ? JSON.parse(stored) : [];
    }
};

export const clearBubblesFromFirestore = async () => {
    try {
        const userId = getUserDocumentId();
        try {
            // Delete all docs in subcollection
            const bubblesCol = collection(db, BUBBLES_COLLECTION, userId, BUBBLES_SUBCOLLECTION);
            const snap = await getDocs(bubblesCol);
            const batch = writeBatch(db);
            snap.forEach(d => batch.delete(d.ref));
            // keep parent doc with timestamp
            const parentRef = doc(db, BUBBLES_COLLECTION, userId);
            batch.set(parentRef, { updatedAt: serverTimestamp(), userId }, { merge: true });
            await batch.commit();
        } catch (normalizedErr) {
            logger.warn('Clear subcollection failed, trying legacy doc delete', normalizedErr);
            const bubblesRef = doc(db, BUBBLES_COLLECTION, userId);
            await deleteDoc(bubblesRef);
        }
    } catch (error) {
        logger.error('Error clearing bubbles from Firestore:', error);
        // Fallback to localStorage
        const uid = getCurrentUser()?.uid;
        if (uid) localStorage.removeItem(`bubbles_${uid}`);
    }
};

// Update bubble status
export const updateBubbleStatus = async (bubbleId, newStatus, bubblesData) => {
    try {
        const bubble = bubblesData.find(b => b.id === bubbleId);
        if (!bubble) throw new Error(`Bubble ${bubbleId} not found`);

        const fields = {
            status: newStatus,
            updatedAt: new Date().toISOString()
        };

        if (newStatus === BUBBLE_STATUS.DELETED) {
            fields.deletedAt = new Date().toISOString();
        } else if (bubble.status === BUBBLE_STATUS.DELETED && newStatus !== BUBBLE_STATUS.DELETED) {
            fields.deletedAt = null;
        }

        if (newStatus === BUBBLE_STATUS.DONE) {
            fields.dueDate = null;
            fields.notifications = [];
            fields.recurrence = null;
            fields.overdueSticky = false;
            fields.overdueAt = null;
        }

        const userId = getUserDocumentId();
        const ref = doc(db, BUBBLES_COLLECTION, userId, BUBBLES_SUBCOLLECTION, String(bubbleId));
        await updateDoc(ref, fields);

        const updatedBubbles = bubblesData.map(b =>
            b.id === bubbleId ? { ...b, ...fields } : b
        );
        return updatedBubbles;
    } catch (error) {
        logger.error('Error updating bubble status:', error);
        throw error;
    }
};

// Get bubbles by status
export const getBubblesByStatus = (bubblesData, status) => {
    if (!status) return bubblesData;
    return bubblesData.filter(bubble => bubble.status === status);
};

// Auto-cleanup old deleted bubbles
export const cleanupOldDeletedBubbles = async (bubblesData) => {
    try {
        const currentTime = Date.now();
        const filteredBubbles = bubblesData.filter(bubble => {
            // Keep non-deleted bubbles
            if (bubble.status !== BUBBLE_STATUS.DELETED) {
                return true;
            }

            // Keep deleted bubbles that are newer than 30 days
            if (bubble.deletedAt) {
                const deletedTime = new Date(bubble.deletedAt).getTime();
                return (currentTime - deletedTime) < CLEANUP_PERIOD;
            }

            // Keep bubbles without deletedAt (shouldn't happen, but just in case)
            return true;
        });

        // Only update if we actually removed some bubbles
        if (filteredBubbles.length < bubblesData.length) {
            await saveBubblesToFirestore(filteredBubbles);
            return filteredBubbles;
        }

        return bubblesData;
    } catch (error) {
        logger.error('Error cleaning up old deleted bubbles:', error);
        return bubblesData;
    }
};

// Mark bubble as done
export const markBubbleAsDone = async (bubbleId, bubblesData) => {
    return await updateBubbleStatus(bubbleId, BUBBLE_STATUS.DONE, bubblesData);
};

// Mark bubble as deleted
export const markBubbleAsDeleted = async (bubbleId, bubblesData) => {
    return await updateBubbleStatus(bubbleId, BUBBLE_STATUS.DELETED, bubblesData);
};

// Restore bubble from deleted
export const restoreBubble = async (bubbleId, bubblesData) => {
    return await updateBubbleStatus(bubbleId, BUBBLE_STATUS.ACTIVE, bubblesData);
};

// Tags operations
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
        localStorage.setItem(`tags_${uid}`, JSON.stringify(tagsData));
    }
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
        const stored = localStorage.getItem(`tags_${userId}`);
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        logger.error('Error loading tags from Firestore:', error);
        // Fallback to localStorage with user-specific key
        const uid = getCurrentUser()?.uid;
        if (!uid) return [];
        const stored = localStorage.getItem(`tags_${uid}`);
        return stored ? JSON.parse(stored) : [];
    }
};

// Real-time listeners (optional)
export const subscribeToBubblesUpdates = (callback) => {
    try {
        const userId = getUserDocumentId();
        const bubblesCol = collection(db, BUBBLES_COLLECTION, userId, BUBBLES_SUBCOLLECTION);
        let currentUnsub = null;
        currentUnsub = onSnapshot(bubblesCol, (querySnap) => {
            const list = [];
            querySnap.forEach(d => list.push({ id: d.id, ...d.data() }));
            callback(list);
        }, (err) => {
            logger.warn('Subcollection onSnapshot error, falling back to legacy doc listener', err);
            currentUnsub?.();  // close the primary (may already be closed by Firebase)
            const legacyRef = doc(db, BUBBLES_COLLECTION, userId);
            currentUnsub = onSnapshot(legacyRef, (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    callback(data.bubbles || []);
                } else {
                    callback([]);
                }
            });
        });
        return () => currentUnsub?.();  // always calls whatever is current
    } catch (error) {
        logger.error('Error setting up bubbles listener:', error);
        return () => { };
    }
};

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
