
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
        return dist <= 22; 
    } catch (e) {
        return true; 
    }
}

/**
 * محرك حساب أجور التوصيل المطور:
 * 1000 دينار لكل 2.8 كم.
 * التقسيم: كل 700 متر (0.7 كم) تساوي 250 دينار.
 * الحد الأدنى: 1000 دينار.
 */
export const calculateDeliveryFee = (distanceInKm: number) => {
    const minFee = 1000;
    const unitDistance = 0.7; // 700 متر لكل وحدة (2.8 كم / 4 وحدات)
    const unitPrice = 250; // سعر الوحدة الواحدة

    if (!distanceInKm || distanceInKm <= 0) {
        return minFee;
    }
    
    // حساب عدد الوحدات (كل وحدة 700 متر)
    const units = Math.ceil(distanceInKm / unitDistance);
    let totalFee = units * unitPrice;
    
    // التأكد من أن الحد الأدنى هو 1000 دينار (والذي يغطي حتى 2.8 كم)
    return Math.min(Math.max(totalFee, minFee), 15000);
}

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

export const compressImage = async (base64: string, maxWidth = 800, quality = 0.6): Promise<string> => {
    if (!base64 || !base64.startsWith('data:image')) return base64;
    // لا تضغط إذا كانت الصورة صغيرة أصلاً (أقل من 50 كيلو بايت)
    if (base64.length < 50000) return base64;

    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = base64;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            if (width > maxWidth) {
                height = (maxWidth / width) * height;
                width = maxWidth;
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            } else {
                resolve(base64);
            }
        };
        img.onerror = () => resolve(base64);
    });
};
