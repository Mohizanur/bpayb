// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAaWIAdPdrYAwX-avdlNXD6xzWIn-3a6cc",
  authDomain: "birrpay-20e82.firebaseapp.com",
  projectId: "birrpay-20e82",
  storageBucket: "birrpay-20e82.firebasestorage.app",
  messagingSenderId: "208393179425",
  appId: "1:208393179425:web:7df8beee8b5e54ae9c2e60",
  measurementId: "G-LNCF97JVWH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
let analytics;

// Initialize Analytics only in production and if window is defined (browser)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  analytics = getAnalytics(app);
}

export { app, db, auth, analytics };
