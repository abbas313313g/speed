
'use server';

/**
 * @fileOverview خدمة إرسال إشعارات OneSignal للمناديب والمطاعم.
 */

const APP_ID = "48becd5d-aae6-4e25-8f8d-451b8ec5ef8a";
const API_KEY = "os_v2_app_jc7m2xnk4zhcld4niuny5rppriov5zbgllhe7mmol7da2nz74gmochvah76zre3hrycv3p46qgkyqizou6inh45kl7c2iezuytz3dfy";

async function sendNotification(targetId: string, title: string, message: string, type: string) {
    try {
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

export async function sendOrderNotification(workerId: string) {
    await sendNotification(
        workerId, 
        "سبيد شوب - مهمة جديدة", 
        "لديك مهمة توصيل جديدة بانتظار قبولك! 🚀", 
        "NEW_ORDER_FOR_WORKER"
    );
}

export async function sendNewOrderToRestaurant(restaurantId: string) {
    await sendNotification(
        restaurantId, 
        "سبيد شوب - طلب جديد", 
        "وصلك طلب جديد من زبون! يرجى الدخول للقبول والتحضير 🍔", 
        "NEW_ORDER_FOR_RESTAURANT"
    );
}
