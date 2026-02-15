import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

// Your web app's Firebase configuration
// Helper to access environment variables in both Vite and Node.js environments
const getEnv = (key: string) => {
    // Check for Vite's import.meta.env
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        return import.meta.env[key];
    }
    // Check for Node.js process.env
    if (typeof process !== 'undefined' && process.env) {
        return process.env[key];
    }
    return '';
};

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: getEnv('VITE_FIREBASE_API_KEY'),
    authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: getEnv('VITE_FIREBASE_PROJECT_ID'),
    storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
    appId: getEnv('VITE_FIREBASE_APP_ID')
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);

// Connect to emulators if in development mode and VITE_USE_EMULATORS is set
if (getEnv('VITE_USE_EMULATORS') === 'true') {
    // Auth Emulator
    connectAuthEmulator(auth, 'http://127.0.0.1:9099');
    
    // Firestore Emulator
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    
    // Storage Emulator
    connectStorageEmulator(storage, '127.0.0.1', 9199);
    
    console.log('Firebase Emulators connected');
}

export default app;
