
'use server';

import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

/**
 * وظيفة إرسال إشعار عبر جوجل FCM
 * ملاحظة: تتطلب هذه الوظيفة إعداد Firebase Admin SDK أو استخدام Cloud Functions للإرسال الفعلي
 */
export async function sendFcmNotification(targetId: string, collectionName: 'deliveryWorkers' | 'restaurants', title: string, body: string) {
    try {
        const docRef = doc(db, collectionName, targetId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            const token = data.fcmToken;

            if (token) {
                // هنا يتم استدعاء API جوجل للإرسال
                // سنقوم بطباعة العملية الآن، ويمكنك ربطها بـ Cloud Function لاحقاً
                console.log(`[FCM System] Sending to ${targetId}: ${title} - ${body}`);
            }
        }
    } catch (error) {
        console.error("Failed to trigger FCM:", error);
    }
}
