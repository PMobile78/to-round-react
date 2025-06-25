// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Your web app's Firebase configuration
// Конфигурация на основе ваших реальных данных Firebase
// ⚠️ ВАЖНО: Вам всё еще нужно создать Web App и получить web appId
const firebaseConfig = {
    apiKey: "AIzaSyAat5vcOBIOeJXoGFfqkNybC9J-v0G8yA4", // ✅ Ваш реальный API ключ
    authDomain: "todo-flutter-fb8bf.firebaseapp.com",  // ✅ Стандартный authDomain
    projectId: "todo-flutter-fb8bf",                   // ✅ Ваш project ID
    storageBucket: "todo-flutter-fb8bf.appspot.com",  // ✅ Ваш storage bucket  
    messagingSenderId: "699564548059",                 // ✅ Ваш messaging sender ID
    appId: "1:699564548059:web:0e45b2291da108955fd1fe",   // ❌ СОЗДАЙТЕ WEB APP!
    measurementId: "G-94PRVB1G5L"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

export default app; 