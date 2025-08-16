
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
// IMPORTANT: Replace this with your actual Firebase config
export const firebaseConfig = {
  apiKey: "AIzaSyB7DzyOPNgIopY84WufXVr_HE_cXS8EGMg",
  authDomain: "speed-shop-8tchr.firebaseapp.com",
  projectId: "speed-shop-8tchr",
  storageBucket: "speed-shop-8tchr.appspot.com",
  messagingSenderId: "631051036670",
  appId: "1:631051036670:web:65982c072092bbcc79c2af"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

    