
'use server';

/**
 * محرك إرسال الإشعارات المميز عبر ون سيجنال
 * يدعم الآن الإرسال المتعدد لمعرفات التطبيق والويب معاً
 */
export async function sendRestaurantOrderNotification(subscriptionIds: string[], restaurantName: string, orderNumber: number) {
    const appId = 'fbb7ab81-ec87-4f8c-aaa8-de12522e62b3';
    const restKey = 'os_v2_app_7o32xapmq5hyzkvi3yjfeltcwmnxym7l5ucezhngrovny3cgtdssubwhdurs7i4ou4nabaurpp52i3byu5srpu4kj3hqurf6uxay4yy';

    if (!subscriptionIds || subscriptionIds.length === 0) {
        console.warn("OneSignal Notification Skipped: No Subscription IDs provided.");
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
                // نرسل لكافة المعرفات (تطبيق وويب) في طلب واحد
                include_subscription_ids: subscriptionIds,
                headings: { 
                    "ar": "طلب جديد وصل! 🍔", 
                    "en": "New Order Received!" 
                },
                contents: { 
                    "ar": `كابتن سبيد يحييك! طلب جديد برقم #${orderNumber} بانتظار لمستك الفنية.. افتح لوحة التحكم الآن! 🚀`,
                    "en": `New order #${orderNumber} is waiting for your preparation! Open your dashboard now.`
                },
                priority: 10,
                android_accent_color: "00b358",
                small_icon: "ic_stat_onesignal_default",
                android_visibility: 1,
                ios_badgeType: "Increase",
                ios_badgeCount: 1,
                // ميزات إضافية للويب
                web_buttons: [
                    { id: "view", text: "عرض الطلب", icon: "" }
                ]
            })
        });

        if (!response.ok) {
            const error = await response.json();
            console.error("OneSignal API Error Response:", error);
        } else {
            console.log(`[OneSignal] Notification successfully dispatched to ${restaurantName} (IDs: ${subscriptionIds.join(', ')})`);
        }
    } catch (error) {
        console.error("OneSignal Network/Fetch Error:", error);
    }
}

export async function sendOrderNotification(workerId: string) {
    return;
}

export async function sendNewOrderToRestaurant(restaurantId: string) {
    return;
}
