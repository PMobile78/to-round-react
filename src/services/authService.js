import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    updateProfile
} from 'firebase/auth';
import { auth } from '../firebase';

// Создание нового пользователя
export const createUser = async (email, password, displayName = '') => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Обновляем профиль пользователя с именем, если указано
        if (displayName) {
            await updateProfile(user, { displayName });
        }

        console.log('User created successfully:', user.email);
        return { success: true, user };
    } catch (error) {
        console.error('Error creating user:', error);
        return { success: false, error: error.message };
    }
};

// Вход пользователя
export const loginUser = async (email, password) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log('User logged in successfully:', user.email);
        return { success: true, user };
    } catch (error) {
        console.error('Error logging in:', error);
        return { success: false, error: error.message };
    }
};

// Выход пользователя
export const logoutUser = async () => {
    try {
        await signOut(auth);
        console.log('User logged out successfully');
        return { success: true };
    } catch (error) {
        console.error('Error logging out:', error);
        return { success: false, error: error.message };
    }
};

// Сброс пароля
export const resetPassword = async (email) => {
    try {
        await sendPasswordResetEmail(auth, email);
        console.log('Password reset email sent');
        return { success: true };
    } catch (error) {
        console.error('Error sending password reset email:', error);
        return { success: false, error: error.message };
    }
};

// Слушатель изменения состояния аутентификации
export const onAuthStateChange = (callback) => {
    return onAuthStateChanged(auth, callback);
};

// Получение текущего пользователя
export const getCurrentUser = () => {
    return auth.currentUser;
};

// Проверка авторизации
export const isAuthenticated = () => {
    return !!auth.currentUser;
}; 