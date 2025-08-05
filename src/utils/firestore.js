import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);

initializeApp({
  credential: cert(firebaseConfig),
});

export const firestore = getFirestore();
