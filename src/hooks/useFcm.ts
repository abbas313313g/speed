
"use client";

import { useEffect, useCallback } from 'react';
import { messaging, db } from '@/lib/firebase';
import { getToken } from 'firebase/messaging';
import { doc, updateDoc } from 'firebase/firestore';

export const useFcm = (collectionName: 'deliveryWorkers' | 'restaurants', docId: string | null) => {
    
    const requestPermission = useCallback(async () => {
        if (!docId || typeof window === 'undefined') return;

        try {
            const msg = await messaging;
            if (!msg) return;

            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                // استخراج التوكن من جوجل
                const token = await getToken(msg, {
                    vapidKey: 'BGH9n4_Z-yE9E-H_H6n4-O4-O4-O4-O4-O4-O4-O4-O4' // ستحتاج لوضع الـ VAPID Key الخاص بك من لوحة Firebase هنا لاحقاً
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
            console.error("FCM Token Error:", error);
        }
    }, [docId, collectionName]);

    useEffect(() => {
        if (docId) {
            requestPermission();
        }
    }, [docId, requestPermission]);

    return { requestPermission };
};
