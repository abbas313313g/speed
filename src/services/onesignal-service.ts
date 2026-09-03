'use server';

/**
 * محرك إرسال الإشعارات المميز عبر ون سيجنال
 */
export async function sendRestaurantOrderNotification(playerId: string, restaurantName: string, orderNumber: number) {
    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
    const restKey = process.env.ONESIGNAL_REST_API_KEY;

    if (!appId || !restKey || !playerId) {
        console.warn("OneSignal Config Missing or No Player ID provided.");
        return;
    }

    try {
        const response = await fetch('https://onesignal.com/api/v1/notifications', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${restKey}`
            },
            body: JSON.stringify({
                app_id: appId,
                include_player_ids: [playerId],
                headings: { "ar": "طلب جديد وصل! 🍔", "en": "New Order Received!" },
                contents: { 
                    "ar": `كابتن سبيد يحييك! طلب جديد برقم #${orderNumber} بانتظار لمستك الفنية.. افتح لوحة التحكم الآن! 🚀`,
                    "en": `New order #${orderNumber} is waiting for your preparation! Open your dashboard now.`
                },
                priority: 10,
                android_accent_color: "00b358",
                small_icon: "ic_stat_onesignal_default"
            })
        });

        if (!response.ok) {
            const error = await response.json();
            console.error("OneSignal API Error:", error);
        }
    } catch (error) {
        console.error("OneSignal Network Error:", error);
    }
}

export async function sendOrderNotification(workerId: string) {
    // وظيفة احتياطية للمناديب
    return;
}

export async function sendNewOrderToRestaurant(restaurantId: string) {
    // وظيفة احتياطية قديمة
    return;
}