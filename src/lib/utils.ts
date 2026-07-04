
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ar-IQ', {
    style: 'currency',
    currency: 'IQD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};


// دالة حساب المسافة بين نقطتين بالكيلومتر
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const R = 6371; // نصف قطر الأرض بالكيلومتر

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const radLat1 = toRad(lat1);
    const radLat2 = toRad(lat2);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(radLat1) * Math.cos(radLat2) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; 
    return distance;
}

// التحقق من النطاق الجغرافي لجنوب بابل (المدحتية، الهاشمية، القاسم)
export const isLocationInAllowedZones = (lat: number, lng: number) => {
    // إحداثيات مركزية تقريبية لجنوب بابل
    const babilSouthCenterLat = 32.3333;
    const babilSouthCenterLng = 44.6500;
    
    const dist = calculateDistance(lat, lng, babilSouthCenterLat, babilSouthCenterLng);
    
    // السماح بنطاق 18 كم لتغطية المدن الثلاث بشكل دقيق
    return dist <= 18;
}

// حساب سعر التوصيل بناءً على المسافة
export const calculateDeliveryFee = (distanceInKm: number) => {
    const minFee = 1000; // الحد الأدنى 1,000 دينار
    const maxFee = 15000; // الحد الأقصى 15,000 دينار
    const ratePerKm = 500; // 500 دينار لكل كيلومتر إضافي

    if (distanceInKm <= 2) return minFee;

    let totalFee = minFee + (distanceInKm - 2) * ratePerKm;
    
    // تقريب السعر لأقرب 250 دينار لسهولة التعامل
    totalFee = Math.round(totalFee / 250) * 250;
    
    return Math.min(Math.max(totalFee, minFee), maxFee);
}
