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
    apiKey: getEnv('VITE_FIREBASE_API_KEY') || "AIzaSyAzO8YiloSsXWe5ovzT_Ueb6ONIN0WSz00",
    authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN') || "zentis-f6d87.firebaseapp.com",
    projectId: getEnv('VITE_FIREBASE_PROJECT_ID') || "zentis-f6d87",
    storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET') || "zentis-f6d87.firebasestorage.app",
    messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID') || "566998559047",
    appId: getEnv('VITE_FIREBASE_APP_ID') || "1:566998559047:web:5cc2de9d4dd52bd684c462",
    measurementId: getEnv('VITE_FIREBASE_MEASUREMENT_ID') || "G-E8PKM76L9H"
};

// Validate Firebase configuration
const requiredEnvVars = [
    { key: 'VITE_FIREBASE_API_KEY', value: firebaseConfig.apiKey },
    { key: 'VITE_FIREBASE_AUTH_DOMAIN', value: firebaseConfig.authDomain },
    { key: 'VITE_FIREBASE_PROJECT_ID', value: firebaseConfig.projectId }
];

const missingVars = requiredEnvVars.filter(v => !v.value);

if (missingVars.length > 0) {
    const missing = missingVars.map(v => v.key).join(', ');
    const errorMsg = `Firebase configuration error: Missing required environment variables: ${missing}`;
    console.error(errorMsg);
    console.error('Please ensure your .env.local file contains all required Firebase credentials.');
    console.error('For production deployment, configure these as Firebase environment variables.');

    // In production, this is a critical error
    if (import.meta.env.PROD) {
        throw new Error(errorMsg);
    } else {
        // In development, log warning but allow initialization
        console.warn('Continuing with incomplete Firebase configuration (development mode)');
    }
} else {
    console.log('✓ Firebase configuration validated');
}

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
