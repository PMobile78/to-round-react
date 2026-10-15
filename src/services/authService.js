import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    updateProfile,
    EmailAuthProvider,
    reauthenticateWithCredential,
    updatePassword
} from 'firebase/auth';
import { auth } from '../firebase';
import logger from '../utils/logger';
import { unregisterThisDevice } from '../firebaseMessaging';

// Upper bound for the best-effort device cleanup on logout, so a slow
// network / FCM round-trip cannot hang the sign-out.
const LOGOUT_TOKEN_CLEANUP_TIMEOUT_MS = 2000;

const firebaseErrorMessages = {
    'auth/user-not-found': 'User not found.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/email-already-in-use': 'Email is already registered.',
    'auth/weak-password': 'Password is too weak.',
    'auth/invalid-email': 'Invalid email address.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Please check your connection.',
    'auth/popup-closed-by-user': 'Sign-in popup was closed.',
    'auth/requires-recent-login': 'Please sign in again and retry.',
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
        logger.error('Error creating user:', error);
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
        logger.error('Error logging in:', error);
        return { success: false, error: mapFirebaseError(error) };
    }
};

// User logout
export const logoutUser = async () => {
    try {
        const uid = auth.currentUser?.uid;
        // Remove this device (users/{uid}/devices) before sign-out: owner-only rules block it
        // afterwards (spec 3.3). Best-effort and time-boxed: swallow its errors and never let a
        // slow FCM/network round-trip hang logout — proceed to sign-out after the timeout regardless.
        try {
            await Promise.race([
                uid ? unregisterThisDevice(uid) : Promise.resolve(),
                new Promise((resolve) => setTimeout(resolve, LOGOUT_TOKEN_CLEANUP_TIMEOUT_MS)),
            ]);
        } catch (e) { /* logout proceeds regardless */ }
        await signOut(auth);
        return { success: true };
    } catch (error) {
        logger.error('Error logging out:', error);
        return { success: false, error: mapFirebaseError(error) };
    }
};

// Password reset email in the given UI language, with a "Continue" link back to the app.
// The app's domain must be listed in Firebase Auth → Settings → Authorized domains.
export const resetPassword = async (email, languageCode) => {
    try {
        auth.languageCode = languageCode;
        await sendPasswordResetEmail(auth, email, { url: `${window.location.origin}${import.meta.env.BASE_URL}` });
        return { success: true };
    } catch (error) {
        logger.error('Error sending password reset email:', error);
        return { success: false, error: mapFirebaseError(error) };
    }
};

// Change password for the currently signed-in email/password user.
// Requires reauthentication because Firebase rejects updatePassword on stale sessions.
export const changePassword = async (currentPassword, newPassword) => {
    try {
        const user = auth.currentUser;
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, newPassword);
        return { success: true };
    } catch (error) {
        logger.error('Error changing password:', error);
        return { success: false, error: mapFirebaseError(error), code: error.code };
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