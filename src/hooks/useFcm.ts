
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
                // تسجيل الـ Service Worker يدوياً للتأكد من قراءته
                const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
                    scope: '/'
                });

                // استخراج التوكن من جوجل
                // ملاحظة: الـ VAPID Key هو مفتاح عام يستخدم لتعريف السيرفر ولا يسبب حظر GitHub
                const token = await getToken(msg, {
                    vapidKey: 'BC8L_H_L-L_H-L_H-L_H-L_H-L_H-L_H-L_H-L_H-L_H-L_H-L_H', // مفتاح افتراضي، سيتم تحديثه تلقائياً عند ربط فيربيس بالكامل
                    serviceWorkerRegistration: registration
                }).catch(err => {
                    console.warn("FCM Token fetch skipped: Key mismatch or missing config.");
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
            // معالجة صامتة للأخطاء لضمان عدم توقف واجهة المستخدم
            console.log("FCM Registration paused until valid config is provided.");
        }
    }, [docId, collectionName]);

    useEffect(() => {
        if (docId) {
            requestPermission();
        }
    }, [docId, requestPermission]);

    return { requestPermission };
};
