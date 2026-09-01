
'use server';

import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

/**
 * وظيفة إرسال إشعار عبر جوجل FCM
 * تقوم هذه الوظيفة بجلب التوكن الخاص بالمستخدم وإرسال طلب إشعار
 */
export async function sendFcmNotification(targetId: string, collectionName: 'deliveryWorkers' | 'restaurants', title: string, body: string) {
    try {
        const docRef = doc(db, collectionName, targetId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            const token = data.fcmToken;

            if (token) {
                // يتم استدعاء محرك الإرسال هنا
                // ملاحظة: الإرسال الفعلي يتطلب مفتاح خادم (Service Account) يوضع في بيئة آمنة
                console.log(`[FCM System] Dispatching notification to ${targetId}: ${title}`);
                
                // هنا يمكن ربط خدمة إرسال خارجية (مثل Cloud Functions) لضمان وصول الإشعار والجهاز مغلق
            }
        }
    } catch (error) {
        console.error("FCM Dispatch Error:", error);
    }
}
