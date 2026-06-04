import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    updateProfile
} from 'firebase/auth';
import { auth } from '../firebase';

const firebaseErrorMessages = {
    'auth/user-not-found': 'User not found.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/email-already-in-use': 'Email is already registered.',
    'auth/weak-password': 'Password is too weak.',
    'auth/invalid-email': 'Invalid email address.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Please check your connection.',
    'auth/popup-closed-by-user': 'Sign-in popup was closed.',
};

const mapFirebaseError = (error) => {
    return firebaseErrorMessages[error.code] || 'An unexpected error occurred.';
};

// Create new user
export const createUser = async (email, password, displayName = '') => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Update user profile with name if provided
        if (displayName) {
            await updateProfile(user, { displayName });
        }

        return { success: true, user };
    } catch (error) {
        console.error('Error creating user:', error);
        return { success: false, error: mapFirebaseError(error) };
    }
};

// User login
export const loginUser = async (email, password) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        return { success: true, user };
    } catch (error) {
        console.error('Error logging in:', error);
        return { success: false, error: mapFirebaseError(error) };
    }
};

// User logout
export const logoutUser = async () => {
    try {
        await signOut(auth);
        return { success: true };
    } catch (error) {
        console.error('Error logging out:', error);
        return { success: false, error: mapFirebaseError(error) };
    }
};

// Password reset
export const resetPassword = async (email) => {
    try {
        await sendPasswordResetEmail(auth, email);
        return { success: true };
    } catch (error) {
        console.error('Error sending password reset email:', error);
        return { success: false, error: mapFirebaseError(error) };
    }
};

// Authentication state change listener
export const onAuthStateChange = (callback) => {
    return onAuthStateChanged(auth, callback);
};

// Get current user
export const getCurrentUser = () => {
    return auth.currentUser;
};

// Check authentication
export const isAuthenticated = () => {
    return !!auth.currentUser;
}; 