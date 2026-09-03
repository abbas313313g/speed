'use server';

/**
 * محرك إرسال الإشعارات المميز عبر ون سيجنال
 * يستخدم معرف المشروع الخاص بالمستخدم لضمان الوصول الفوري
 */
export async function sendRestaurantOrderNotification(subscriptionId: string, restaurantName: string, orderNumber: number) {
    // الآيدي الخاص بمشروعك كما زودتنا به
    const appId = 'fbb7ab81-ec87-4f8c-aaa8-de12522e62b3';
    // مفتاح الـ REST API الذي زودتنا به لتفعيل الإشعارات فوراً
    const restKey = 'os_v2_app_7o32xapmq5hyzkvi3yjfeltcwmnxym7l5ucezhngrovny3cgtdssubwhdurs7i4ou4nabaurpp52i3byu5srpu4kj3hqurf6uxay4yy';

    if (!subscriptionId) {
        console.warn("OneSignal Notification Skipped: No Subscription ID provided for the store.");
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
                // نرسل للجهاز المحدد حصراً عبر Subscription ID
                include_subscription_ids: [subscriptionId],
                headings: { 
                    "ar": "طلب جديد وصل! 🍔", 
                    "en": "New Order Received!" 
                },
                contents: { 
                    "ar": `كابتن سبيد يحييك! طلب جديد برقم #${orderNumber} بانتظار لمستك الفنية.. افتح لوحة التحكم الآن! 🚀`,
                    "en": `New order #${orderNumber} is waiting for your preparation! Open your dashboard now.`
                },
                priority: 10, // أولوية قصوى لتجاوز وضع توفير الطاقة في الهواتف
                android_accent_color: "00b358",
                small_icon: "ic_stat_onesignal_default",
                // ميزات إضافية لضمان الاستيقاظ
                android_visibility: 1,
                ios_badgeType: "Increase",
                ios_badgeCount: 1
            })
        });

        if (!response.ok) {
            const error = await response.json();
            console.error("OneSignal API Error Response:", error);
        } else {
            console.log(`[OneSignal] Notification successfully dispatched to store ${restaurantName} (ID: ${subscriptionId})`);
        }
    } catch (error) {
        console.error("OneSignal Network/Fetch Error:", error);
    }
}

export async function sendOrderNotification(workerId: string) {
    // وظيفة احتياطية للمناديب في حال تم تفعيلها مستقبلاً
    return;
}

export async function sendNewOrderToRestaurant(restaurantId: string) {
    // وظيفة توافقية قديمة
    return;
}
