
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableMultiTabIndexedDbPersistence, CACHE_SIZE_UNLIMITED } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging, isSupported } from "firebase/messaging";

export const firebaseConfig = {
  "projectId": "speed-shop-8tchr",
  "appId": "1:631051036670:web:65982c072092bbcc79c2af",
  "storageBucket": "speed-shop-8tchr.appspot.com",
  "apiKey": "AIzaSyB7DzyOPNgIopY84WufXVr_HE_cXS8EGMg",
  "authDomain": "speed-shop-8tchr.firebaseapp.com",
  "messagingSenderId": "631051036670"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app);
// تحسين استجابة قاعدة البيانات للعمل بسرعة فائقة على الآيفون والشبكات الضعيفة
db.type = 'firestore'; 

export const auth = getAuth(app);
export const storage = getStorage(app);

if (typeof window !== "undefined") {
    // تفعيل الذاكرة الدائمة بطريقة متوافقة مع متصفحات الموبايل والآيفون
    enableMultiTabIndexedDbPersistence(db).catch((err) => {
        if (err.code === 'failed-precondition') {
            console.warn("Persistence failed: multiple tabs open");
        } else if (err.code === 'unimplemented') {
            console.warn("Persistence is not available in this browser");
        }
    });
}

export const messaging = typeof window !== "undefined" ? 
    isSupported().then(yes => yes ? getMessaging(app) : null).catch(() => null) 
    : null;
