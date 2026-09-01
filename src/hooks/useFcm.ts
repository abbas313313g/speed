
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
                // تسجيل الـ Service Worker يدوياً للتأكد من وجوده وحل مشكلة الـ 404
                const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js').catch(err => {
                    console.warn("Service Worker registration failed, but continuing...", err);
                    return null;
                });

                // استخراج التوكن من جوجل مع تمرير التسجيل اليدوي
                const token = await getToken(msg, {
                    vapidKey: 'BGH9n4_Z-yE9E-H_H6n4-O4-O4-O4-O4-O4-O4-O4-O4', // ستحتاج لوضع الـ VAPID Key الخاص بك من لوحة Firebase هنا لاحقاً ليعمل الإرسال الحقيقي
                    serviceWorkerRegistration: registration || undefined
                }).catch(err => {
                    console.warn("FCM Token fetch failed (ignore if VAPID key is placeholder):", err);
                    return null;
                });

                if (token) {
                    // حفظ التوكن في وثيقة المستخدم لتتمكن من مراسلته وهو مغلق
                    await updateDoc(doc(db, collectionName, docId), {
                        fcmToken: token,
                        lastTokenUpdate: new Date().toISOString()
                    });
                }
            }
        } catch (error) {
            // معالجة صامتة للأخطاء لضمان استقرار واجهة المستخدم
            console.error("FCM System Error:", error);
        }
    }, [docId, collectionName]);

    useEffect(() => {
        if (docId) {
            requestPermission();
        }
    }, [docId, requestPermission]);

    return { requestPermission };
};
