// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";


export const firebaseConfig = {
  projectId: "speed-shop-8tchr",
  appId: "1:631051036670:web:65982c072092bbcc79c2af",
  storageBucket: "speed-shop-8tchr.firebasestorage.app",
  apiKey: "AIzaSyB7DzyOPNgIopY84WufXVr_HE_cXS8EGMg",
  authDomain: "speed-shop-8tchr.firebaseapp.com",
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

    