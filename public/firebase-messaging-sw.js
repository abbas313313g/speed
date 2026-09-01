
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// نفس إعدادات مشروعك في فيربيس
firebase.initializeApp({
  "projectId": "speed-shop-8tchr",
  "appId": "1:631051036670:web:65982c072092bbcc79c2af",
  "storageBucket": "speed-shop-8tchr.appspot.com",
  "apiKey": "AIzaSyB7DzyOPNgIopY84WufXVr_HE_cXS8EGMg",
  "authDomain": "speed-shop-8tchr.firebaseapp.com",
  "messagingSenderId": "631051036670"
});

const messaging = firebase.messaging();

// التعامل مع الرسائل التي تصل والتطبيق مغلق تماماً
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title || "طلب جديد! 🚀";
  const notificationOptions = {
    body: payload.notification.body || "لديك تحديث جديد في تطبيق سبيد شوب.",
    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><circle cx=%2250%22 cy=%2250%22 r=%2245%22 fill=%22%2300b358%22/><text y=%22.65em%22 x=%2250%25%22 text-anchor=%22middle%22 font-size=%2265%22 fill=%22white%22 font-family=%22Arial%22 font-weight=%22bold%22>S</text></svg>',
    badge: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><circle cx=%2250%22 cy=%2250%22 r=%2245%22 fill=%22%2300b358%22/></svg>',
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
