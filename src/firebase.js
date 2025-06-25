// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Your web app's Firebase configuration
// Configuration based on your real Firebase data
// ⚠️ IMPORTANT: You still need to create a Web App and get the web appId
const firebaseConfig = {
    apiKey: "AIzaSyAat5vcOBIOeJXoGFfqkNybC9J-v0G8yA4", // ✅ Your real API key
    authDomain: "todo-flutter-fb8bf.firebaseapp.com",  // ✅ Standard authDomain
    projectId: "todo-flutter-fb8bf",                   // ✅ Your project ID
    storageBucket: "todo-flutter-fb8bf.appspot.com",  // ✅ Your storage bucket  
    messagingSenderId: "699564548059",                 // ✅ Your messaging sender ID
    appId: "1:699564548059:web:0e45b2291da108955fd1fe",   // ❌ CREATE WEB APP!
    measurementId: "G-94PRVB1G5L"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

export default app; 