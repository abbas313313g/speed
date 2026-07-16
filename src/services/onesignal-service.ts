
'use server';

/**
 * @fileOverview خدمة إرسال إشعارات OneSignal للمناديب.
 */

export async function sendOrderNotification(workerId: string) {
    const appId = "fbb7ab81-ec87-4f8c-aaa8-de12522e62b3";
    // ملاحظة: يجب إضافة ONESIGNAL_REST_API_KEY في ملف .env للعمل في الإنتاج
    const apiKey = process.env.ONESIGNAL_REST_API_KEY;

    if (!apiKey) {
        console.warn("OneSignal REST API Key is missing. Please add it to your environment variables.");
        // سنستمر في المحاولة بدون التوثيق للمعاينة، لكن الإرسال الفعلي يتطلب المفتاح
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
                    "en": "لديك طلب جديد 🍔", 
                    "ar": "لديك طلب جديد 🍔" 
                },
                headings: { 
                    "en": "سبيد شوب", 
                    "ar": "سبيد شوب" 
                },
                priority: 10,
                android_accent_color: "FF008000"
            })
        });

        if (!response.ok) {
            const error = await response.json();
            console.error("OneSignal API Error:", error);
        }
    } catch (e) {
        console.error("Failed to send OneSignal notification:", e);
    }
}
