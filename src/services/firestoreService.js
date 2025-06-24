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

// Use a fixed document ID for all devices to share the same data
const getDocumentId = () => {
    // Use a fixed ID so that all devices work with the same document
    return 'to-round-data';
};

// Collections references
const BUBBLES_COLLECTION = 'to-round';
const TAGS_COLLECTION = 'tags';

// Bubbles operations
export const saveBubblesToFirestore = async (bubblesData) => {
    try {
        const documentId = getDocumentId();
        const bubblesRef = doc(db, BUBBLES_COLLECTION, documentId);

        const bubblesForStorage = bubblesData.map(bubble => ({
            id: bubble.id,
            x: bubble.body?.position?.x || bubble.x || 0,
            y: bubble.body?.position?.y || bubble.y || 0,
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
            documentId
        });

        console.log('Bubbles saved to Firestore successfully');
    } catch (error) {
        console.error('Error saving bubbles to Firestore:', error);
        // Fallback to localStorage
        const bubblesForStorage = bubblesData.map(bubble => ({
            id: bubble.id,
            x: bubble.body?.position?.x || bubble.x || 0,
            y: bubble.body?.position?.y || bubble.y || 0,
            radius: bubble.radius,
            title: bubble.title || '',
            description: bubble.description || '',
            fillStyle: bubble.body?.render?.fillStyle || bubble.fillStyle || 'transparent',
            strokeStyle: bubble.body?.render?.strokeStyle || bubble.strokeStyle || '#3B7DED',
            tagId: bubble.tagId || null
        }));
        localStorage.setItem('bubbles', JSON.stringify(bubblesForStorage));
    }
};

export const loadBubblesFromFirestore = async () => {
    try {
        const documentId = getDocumentId();
        const bubblesRef = doc(db, BUBBLES_COLLECTION, documentId);
        const docSnap = await getDoc(bubblesRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            console.log('Bubbles loaded from Firestore successfully');
            return data.bubbles || [];
        }
        console.log('No bubbles document found in Firestore');
        // Fallback to localStorage
        const stored = localStorage.getItem('bubbles');
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error('Error loading bubbles from Firestore:', error);
        // Fallback to localStorage
        const stored = localStorage.getItem('bubbles');
        return stored ? JSON.parse(stored) : [];
    }
};

export const clearBubblesFromFirestore = async () => {
    try {
        const documentId = getDocumentId();
        const bubblesRef = doc(db, BUBBLES_COLLECTION, documentId);
        await deleteDoc(bubblesRef);
        console.log('Bubbles cleared from Firestore successfully');
    } catch (error) {
        console.error('Error clearing bubbles from Firestore:', error);
        // Fallback to localStorage
        localStorage.removeItem('bubbles');
    }
};

// Tags operations
export const saveTagsToFirestore = async (tagsData) => {
    try {
        const documentId = getDocumentId();
        const tagsRef = doc(db, TAGS_COLLECTION, documentId);

        await setDoc(tagsRef, {
            tags: tagsData,
            updatedAt: serverTimestamp(),
            documentId
        });

        console.log('Tags saved to Firestore successfully');
    } catch (error) {
        console.error('Error saving tags to Firestore:', error);
        // Fallback to localStorage
        localStorage.setItem('tags', JSON.stringify(tagsData));
    }
};

export const loadTagsFromFirestore = async () => {
    try {
        const documentId = getDocumentId();
        const tagsRef = doc(db, TAGS_COLLECTION, documentId);
        const docSnap = await getDoc(tagsRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            console.log('Tags loaded from Firestore successfully');
            return data.tags || [];
        }
        console.log('No tags document found in Firestore');
        // Fallback to localStorage
        const stored = localStorage.getItem('tags');
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error('Error loading tags from Firestore:', error);
        // Fallback to localStorage
        const stored = localStorage.getItem('tags');
        return stored ? JSON.parse(stored) : [];
    }
};

// Real-time listeners (optional)
export const subscribeToBubblesUpdates = (callback) => {
    try {
        const documentId = getDocumentId();
        const bubblesRef = doc(db, BUBBLES_COLLECTION, documentId);

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
        const documentId = getDocumentId();
        const tagsRef = doc(db, TAGS_COLLECTION, documentId);

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