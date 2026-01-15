import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBnvy-kzNe57AsZokhUzY4TKLrUUHAIu9M",
  authDomain: "finanzas-8bcb6.firebaseapp.com",
  projectId: "finanzas-8bcb6",
  storageBucket: "finanzas-8bcb6.firebasestorage.app",
  messagingSenderId: "602213067344",
  appId: "1:602213067344:web:2edcb0276759742647ff55",
  measurementId: "G-6QFEBWK4H4"
};

// Initialize Firebase (only if not already initialized)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Firestore
export const db = getFirestore(app);

export default app;
