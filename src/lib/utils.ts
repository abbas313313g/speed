import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatCurrency = (amount: number) => {
  try {
    return new Intl.NumberFormat('ar-IQ', {
      style: 'currency',
      currency: 'IQD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount).replace('د.ع.‏', 'د.ع');
  } catch (e) {
    return amount + ' د.ع';
  }
};

export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    try {
        const toRad = (value: number) => (value * Math.PI) / 180;
        const R = 6371; 
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const radLat1 = toRad(lat1);
        const radLat2 = toRad(lat2);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(radLat1) * Math.cos(radLat2) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; 
    } catch (e) {
        return 0;
    }
}

export const isLocationInAllowedZones = (lat: number, lng: number) => {
    try {
        const babilSouthCenterLat = 32.3333;
        const babilSouthCenterLng = 44.6500;
        const dist = calculateDistance(lat, lng, babilSouthCenterLat, babilSouthCenterLng);
        return dist <= 18;
    } catch (e) {
        return true;
    }
}

/**
 * حساب سعر التوصيل بناءً على قاعدة:
 * سعر أساسي (أقل شي) = 1000 دينار عراقي
 * ثم تضاف الأجور بناءً على المسافة (كل 3 كم بـ 1000 دينار إضافية)
 * التقريب يكون لأقرب 250 دينار عراقي
 */
export const calculateDeliveryFee = (distanceInKm: number) => {
    if (!distanceInKm || distanceInKm <= 0) return 1000;
    
    const baseFee = 1000; // الحد الأدنى المقرر (فتح الطلب)
    const ratePerKm = 1000 / 3; // سعر الكيلومتر (1000 دينار لكل 3 كم)
    
    // المبلغ الإجمالي = السعر الأساسي + أجور المسافة المقطوعة
    let totalFee = baseFee + (distanceInKm * ratePerKm);
    
    // التقريب لأقرب فئة نقدية عراقية متوفرة (250، 500، 750، 1000)
    totalFee = Math.round(totalFee / 250) * 250;
    
    // ضمان بقاء السعر فوق 1000 وعدم تخطيه حدوداً غير منطقية
    return Math.min(Math.max(totalFee, 1000), 15000);
}

// نظام التخزين الآمن والمحمي للـ WebView
export const safeStorage = {
    get: (key: string) => {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                return window.localStorage.getItem(key);
            }
        } catch (e) {}
        return null;
    },
    set: (key: string, value: string) => {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.setItem(key, value);
            }
        } catch (e) {}
    },
    remove: (key: string) => {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.removeItem(key);
            }
        } catch (e) {}
    }
};
