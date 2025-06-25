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
    onSnapshot
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
            tagId: bubble.tagId || null
        }));

        await setDoc(bubblesRef, {
            bubbles: bubblesForStorage,
            updatedAt: serverTimestamp(),
            userId
        });

        console.log('Bubbles content saved to Firestore successfully for user:', userId);
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
            tagId: bubble.tagId || null
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
            console.log('Bubbles content loaded from Firestore successfully for user:', userId);
            return data.bubbles || [];
        }
        console.log('No bubbles document found in Firestore for user:', userId);
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
        console.log('Bubbles cleared from Firestore successfully for user:', userId);
    } catch (error) {
        console.error('Error clearing bubbles from Firestore:', error);
        // Fallback to localStorage
        const userId = getCurrentUser()?.uid || 'anonymous';
        localStorage.removeItem(`bubbles_${userId}`);
    }
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

        console.log('Tags saved to Firestore successfully for user:', userId);
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
            console.log('Tags loaded from Firestore successfully for user:', userId);
            return data.tags || [];
        }
        console.log('No tags document found in Firestore for user:', userId);
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
