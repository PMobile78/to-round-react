import {
    collection,
    doc,
    setDoc,
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
const TAGS_COLLECTION = 'user-tags';

// Bubble statuses
export const BUBBLE_STATUS = {
    ACTIVE: 'active',
    DONE: 'done',
    POSTPONE: 'postpone',
    DELETED: 'deleted'
};

// Auto-cleanup period (30 days in milliseconds)
const CLEANUP_PERIOD = 30 * 24 * 60 * 60 * 1000;

// Bubbles operations
export const saveBubblesToFirestore = async (bubblesData) => {
    try {
        const userId = getUserDocumentId();
        const bubblesRef = doc(db, BUBBLES_COLLECTION, userId);

        // Save only bubble content, without coordinates
        const bubblesForStorage = bubblesData.map(bubble => ({
            id: bubble.id,
            radius: bubble.radius,
            title: bubble.title || '',
            description: bubble.description || '',
            fillStyle: bubble.body?.render?.fillStyle || bubble.fillStyle || 'transparent',
            strokeStyle: bubble.body?.render?.strokeStyle || bubble.strokeStyle || '#3B7DED',
            tagId: bubble.tagId || null,
            status: bubble.status || BUBBLE_STATUS.ACTIVE,
            createdAt: bubble.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            deletedAt: bubble.deletedAt || null
        }));

        await setDoc(bubblesRef, {
            bubbles: bubblesForStorage,
            updatedAt: serverTimestamp(),
            userId
        });

    } catch (error) {
        console.error('Error saving bubbles to Firestore:', error);
        // Fallback to localStorage with user-specific key
        const userId = getCurrentUser()?.uid || 'anonymous';
        const bubblesForStorage = bubblesData.map(bubble => ({
            id: bubble.id,
            radius: bubble.radius,
            title: bubble.title || '',
            description: bubble.description || '',
            fillStyle: bubble.body?.render?.fillStyle || bubble.fillStyle || 'transparent',
            strokeStyle: bubble.body?.render?.strokeStyle || bubble.strokeStyle || '#3B7DED',
            tagId: bubble.tagId || null,
            status: bubble.status || BUBBLE_STATUS.ACTIVE,
            createdAt: bubble.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            deletedAt: bubble.deletedAt || null
        }));
        localStorage.setItem(`bubbles_${userId}`, JSON.stringify(bubblesForStorage));
    }
};

export const loadBubblesFromFirestore = async () => {
    try {
        const userId = getUserDocumentId();
        const bubblesRef = doc(db, BUBBLES_COLLECTION, userId);
        const docSnap = await getDoc(bubblesRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            return data.bubbles || [];
        }
        // Fallback to localStorage with user-specific key
        const stored = localStorage.getItem(`bubbles_${userId}`);
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error('Error loading bubbles from Firestore:', error);
        // Fallback to localStorage with user-specific key
        const userId = getCurrentUser()?.uid || 'anonymous';
        const stored = localStorage.getItem(`bubbles_${userId}`);
        return stored ? JSON.parse(stored) : [];
    }
};

export const clearBubblesFromFirestore = async () => {
    try {
        const userId = getUserDocumentId();
        const bubblesRef = doc(db, BUBBLES_COLLECTION, userId);
        await deleteDoc(bubblesRef);
    } catch (error) {
        console.error('Error clearing bubbles from Firestore:', error);
        // Fallback to localStorage
        const userId = getCurrentUser()?.uid || 'anonymous';
        localStorage.removeItem(`bubbles_${userId}`);
    }
};

// Update bubble status
export const updateBubbleStatus = async (bubbleId, newStatus, bubblesData) => {
    try {
        const updatedBubbles = bubblesData.map(bubble => {
            if (bubble.id === bubbleId) {
                const updatedBubble = {
                    ...bubble,
                    status: newStatus,
                    updatedAt: new Date().toISOString()
                };

                // Set deletedAt when status is deleted
                if (newStatus === BUBBLE_STATUS.DELETED) {
                    updatedBubble.deletedAt = new Date().toISOString();
                } else if (bubble.status === BUBBLE_STATUS.DELETED && newStatus !== BUBBLE_STATUS.DELETED) {
                    // Clear deletedAt when restoring from deleted
                    updatedBubble.deletedAt = null;
                }

                return updatedBubble;
            }
            return bubble;
        });

        await saveBubblesToFirestore(updatedBubbles);
        return updatedBubbles;
    } catch (error) {
        console.error('Error updating bubble status:', error);
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
        console.error('Error cleaning up old deleted bubbles:', error);
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
        });

    } catch (error) {
        console.error('Error saving tags to Firestore:', error);
        // Fallback to localStorage with user-specific key
        const userId = getCurrentUser()?.uid || 'anonymous';
        localStorage.setItem(`tags_${userId}`, JSON.stringify(tagsData));
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
        console.error('Error loading tags from Firestore:', error);
        // Fallback to localStorage with user-specific key
        const userId = getCurrentUser()?.uid || 'anonymous';
        const stored = localStorage.getItem(`tags_${userId}`);
        return stored ? JSON.parse(stored) : [];
    }
};

// Real-time listeners (optional)
export const subscribeToBubblesUpdates = (callback) => {
    try {
        const userId = getUserDocumentId();
        const bubblesRef = doc(db, BUBBLES_COLLECTION, userId);

        return onSnapshot(bubblesRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                callback(data.bubbles || []);
            } else {
                callback([]);
            }
        });
    } catch (error) {
        console.error('Error setting up bubbles listener:', error);
        return () => { }; // Return empty unsubscribe function
    }
};

export const subscribeToTagsUpdates = (callback) => {
    try {
        const userId = getUserDocumentId();
        const tagsRef = doc(db, TAGS_COLLECTION, userId);

        return onSnapshot(tagsRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                callback(data.tags || []);
            } else {
                callback([]);
            }
        });
    } catch (error) {
        console.error('Error setting up tags listener:', error);
        return () => { }; // Return empty unsubscribe function
    }
};
