
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


// Function to calculate distance between two lat/lng points in kilometers
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const R = 6371; // Radius of the Earth in km

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const radLat1 = toRad(lat1);
    const radLat2 = toRad(lat2);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(radLat1) * Math.cos(radLat2) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return distance;
}

// Function to calculate delivery fee based on distance
export const calculateDeliveryFee = (distanceInKm: number) => {
    const feePerThreeKm = 1000; // 1000 IQD for every 3 km
    const feePerKm = feePerThreeKm / 3;
    const minFee = 1000; // Min fee is 1,000 IQD
    const maxFee = 20000; // Max fee is 20,000 IQD

    if (distanceInKm <= 0) {
        return minFee;
    }

    // Calculate the raw fee based on distance
    let totalFee = distanceInKm * feePerKm;

    // Round the fee to the nearest 250
    totalFee = Math.round(totalFee / 250) * 250;
    
    // Apply min and max fee constraints
    totalFee = Math.max(minFee, totalFee);
    totalFee = Math.min(totalFee, maxFee);

    return totalFee;
}
