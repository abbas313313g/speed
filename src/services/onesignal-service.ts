
'use server';

/**
 * @fileOverview خدمة إرسال إشعارات OneSignal للمناديب.
 */

export async function sendOrderNotification(workerId: string) {
    const appId = "fbb7ab81-ec87-4f8c-aaa8-de12522e62b3";
    const apiKey = process.env.ONESIGNAL_REST_API_KEY;

    if (!apiKey) {
        console.warn("OneSignal REST API Key is missing in environment variables.");
    }

    try {
        const response = await fetch("https://onesignal.com/api/v1/notifications", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Basic ${apiKey || ''}`
            },
            body: JSON.stringify({
                app_id: appId,
                include_external_user_ids: [workerId],
                contents: { 
                    "en": "You have a new delivery order! 🍔", 
                    "ar": "لديك طلب توصيل جديد! 🍔" 
                },
                headings: { 
                    "en": "Speed Shop", 
                    "ar": "سبيد شوب" 
                },
                priority: 10,
                // إعدادات إضافية لجعل الإشعار يظهر خارجياً بقوة
                android_visibility: 1, 
                android_accent_color: "FF00B358",
                ios_attachments: { "id1": "https://speed-shop.app/logo.png" },
                data: { "type": "NEW_ORDER", "workerId": workerId }
            })
        });

        if (!response.ok) {
            const error = await response.json();
            console.error("OneSignal API Error:", error);
        } else {
            console.log(`Notification sent successfully to worker: ${workerId}`);
        }
    } catch (e) {
        console.error("Failed to send OneSignal notification:", e);
    }
}
