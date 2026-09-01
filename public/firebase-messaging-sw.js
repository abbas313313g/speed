
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// تهيئة فيربيس داخل الـ Service Worker
// هذه الإعدادات عامة وآمنة للنشر
firebase.initializeApp({
  apiKey: "AIzaSyB7DzyOPNgIopY84WufXVr_HE_cXS8EGMg",
  authDomain: "speed-shop-8tchr.firebaseapp.com",
  projectId: "speed-shop-8tchr",
  storageBucket: "speed-shop-8tchr.appspot.com",
  messagingSenderId: "631051036670",
  appId: "1:631051036670:web:65982c072092bbcc79c2af"
});

const messaging = firebase.messaging();

// التعامل مع الرسائل الواردة والتطبيق مغلق (في الخلفية)
messaging.onBackgroundMessage((payload) => {
  console.log('[Background Message] Received:', payload);
  
  const notificationTitle = payload.notification.title || 'تنبيه جديد من سبيد شوب';
  const notificationOptions = {
    body: payload.notification.body || 'لديك تحديث جديد بخصوص الطلبات',
    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><circle cx=%2250%22 cy=%2250%22 r=%2245%22 fill=%22%2300b358%22/><text y=%22.65em%22 x=%2250%25%22 text-anchor=%22middle%22 font-size=%2265%22 fill=%22white%22 font-family=%22Arial%22 font-weight=%22bold%22>S</text></svg>',
    badge: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><circle cx=%2250%22 cy=%2250%22 r=%2245%22 fill=%22%2300b358%22/></svg>',
    vibrate: [200, 100, 200],
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
