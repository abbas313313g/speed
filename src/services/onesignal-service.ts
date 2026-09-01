'use server';

/**
 * @fileOverview خدمة إرسال إشعارات OneSignal للمناديب والمطاعم.
 * تم تحصين هذه الخدمة لتعمل بشكل صامت ولا تؤثر على سير عمل التطبيق في حال فشلها.
 */

const APP_ID = "48becd5d-aae6-4e25-8f8d-451b8ec5ef8a";
const API_KEY = "os_v2_app_jc7m2xnk4zhcld4niuny5rppriov5zbgllhe7mmol7da2nz74gmochvah76zre3hrycv3p46qgkyqizou6inh45kl7c2iezuytz3dfy";

async function sendNotification(targetId: string, title: string, message: string, type: string) {
    try {
        // نستخدم fetch مع مهلة زمنية قصيرة لضمان عدم تعليق العملية
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch("https://onesignal.com/api/v1/notifications", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Basic ${API_KEY}`
            },
            body: JSON.stringify({
                app_id: APP_ID,
                include_external_user_ids: [targetId],
                contents: { "en": message, "ar": message },
                headings: { "en": title, "ar": title },
                priority: 10,
                android_visibility: 1, 
                android_accent_color: "FF00B358",
                data: { "type": type, "targetId": targetId }
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            // فشل الإرسال (مثلاً ID غير موجود)، نسجل ذلك داخلياً فقط ولا نوقف العمل
            console.warn("OneSignal Notification not delivered, but process continues.");
        }
    } catch (e) {
        // خطأ في الشبكة أو في السيرفر، يتم تجاهله لضمان استقرار التطبيق
        console.error("OneSignal Service is currently unreachable. Order process is unaffected.");
    }
}

export async function sendOrderNotification(workerId: string) {
    // نرسل الإشعار ولا ننتظر الرد (Fire and Forget)
    sendNotification(
        workerId, 
        "سبيد شوب - مهمة جديدة", 
        "لديك مهمة توصيل جديدة بانتظار قبولك! 🚀", 
        "NEW_ORDER_FOR_WORKER"
    );
}

export async function sendNewOrderToRestaurant(restaurantId: string) {
    // نرسل الإشعار ولا ننتظر الرد (Fire and Forget)
    sendNotification(
        restaurantId, 
        "سبيد شوب - طلب جديد", 
        "وصلك طلب جديد من زبون! يرجى الدخول للقبول والتحضير 🍔", 
        "NEW_ORDER_FOR_RESTAURANT"
    );
}
