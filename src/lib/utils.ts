
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatCurrency = (amount: number) => {
  // توحيد قراءة الأرقام والعملة لتظهر بشكل متساوٍ على كافة الأجهزة
  return new Intl.NumberFormat('ar-IQ', {
    style: 'currency',
    currency: 'IQD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount).replace('د.ع.‏', 'د.ع');
};

export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
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
}

// التحقق من النطاق الجغرافي الصارم (جنوب بابل)
export const isLocationInAllowedZones = (lat: number, lng: number) => {
    const babilSouthCenterLat = 32.3333;
    const babilSouthCenterLng = 44.6500;
    const dist = calculateDistance(lat, lng, babilSouthCenterLat, babilSouthCenterLng);
    // نطاق 18 كم يغطي القاسم والهاشمية والمدحتية بدقة
    return dist <= 18;
}

export const getZoneNameFromCoordinates = (lat: number, lng: number): string => {
    const zones = [
        { name: "المدحتية", lat: 32.4172, lng: 44.6644 },
        { name: "الهاشمية", lat: 32.3500, lng: 44.6167 },
        { name: "القاسم", lat: 32.3000, lng: 44.6833 }
    ];
    let nearestZone = zones[0];
    let minDistance = calculateDistance(lat, lng, zones[0].lat, zones[0].lng);
    for (let i = 1; i < zones.length; i++) {
        const dist = calculateDistance(lat, lng, zones[i].lat, zones[i].lng);
        if (dist < minDistance) {
            minDistance = dist;
            nearestZone = zones[i];
        }
    }
    return nearestZone.name;
}

export const calculateDeliveryFee = (distanceInKm: number) => {
    const minFee = 1000;
    const maxFee = 15000;
    const ratePerKm = 500;
    if (distanceInKm <= 2) return minFee;
    let totalFee = minFee + (distanceInKm - 2) * ratePerKm;
    totalFee = Math.round(totalFee / 250) * 250;
    return Math.min(Math.max(totalFee, minFee), maxFee);
}
