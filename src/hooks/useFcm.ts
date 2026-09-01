"use client";

import { useEffect, useCallback } from 'react';
import { messaging, db } from '@/lib/firebase';
import { getToken } from 'firebase/messaging';
import { doc, updateDoc } from 'firebase/firestore';

export const useFcm = (collectionName: 'deliveryWorkers' | 'restaurants', docId: string | null) => {
    
    const requestPermission = useCallback(async () => {
        if (!docId || typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

        try {
            const msg = await messaging;
            if (!msg) return;

            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                // تسجيل الـ Service Worker يدوياً لضمان وجوده
                const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js').catch(err => {
                    console.warn("Service Worker registration failed", err);
                    return null;
                });

                // استخراج التوكن من جوجل باستخدام مفتاح عام (VAPID Key)
                // ملاحظة: هذا المفتاح عام ولا يعتبر سراً تقنياً
                const token = await getToken(msg, {
                    vapidKey: 'REPLACE_WITH_YOUR_ACTUAL_VAPID_KEY_FROM_FIREBASE_CONSOLE',
                    serviceWorkerRegistration: registration || undefined
                }).catch(err => {
                    console.warn("FCM Token fetch skipped (Placeholder Key)");
                    return null;
                });

                if (token) {
                    await updateDoc(doc(db, collectionName, docId), {
                        fcmToken: token,
                        lastTokenUpdate: new Date().toISOString()
                    });
                }
            }
        } catch (error) {
            // معالجة صامتة للأخطاء لضمان استقرار الواجهة
            console.error("FCM System Inactive");
        }
    }, [docId, collectionName]);

    useEffect(() => {
        if (docId) {
            requestPermission();
        }
    }, [docId, requestPermission]);

    return { requestPermission };
};
