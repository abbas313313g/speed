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

/**
 * فحص هل الموقع ضمن مناطق جنوب بابل (المدحتية، الهاشمية، القاسم)
 * نستخدم نقطة مركزية ونطاق تغطية 22 كم
 */
export const isLocationInAllowedZones = (lat: number, lng: number) => {
    try {
        // مركز تقريبي يغطي المدحتية والقاسم والهاشمية
        const babilSouthCenterLat = 32.3333;
        const babilSouthCenterLng = 44.6500;
        const dist = calculateDistance(lat, lng, babilSouthCenterLat, babilSouthCenterLng);
        // نطاق 22 كم يغطي المدن الثلاث والقرى المحيطة بها
        return dist <= 22; 
    } catch (e) {
        return true; // في حال حدوث خطأ، نسمح بالدخول مؤقتاً
    }
}

export const calculateDeliveryFee = (distanceInKm: number) => {
    const minFee = 1000;
    const includedDistance = 3; 
    const ratePerKm = 1000 / 3; 

    if (!distanceInKm || distanceInKm <= includedDistance) {
        return minFee;
    }
    
    const extraDistance = distanceInKm - includedDistance;
    let totalFee = minFee + (extraDistance * ratePerKm);
    
    totalFee = Math.round(totalFee / 250) * 250;
    
    return Math.min(Math.max(totalFee, 1000), 15000);
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

export const compressImage = async (base64: string, maxWidth = 600, quality = 0.5): Promise<string> => {
    if (!base64 || !base64.startsWith('data:image')) return base64;
    if (base64.length < 40000) return base64;

    return new Promise((resolve) => {
        const img = new Image();
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
            ctx?.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(base64);
    });
};