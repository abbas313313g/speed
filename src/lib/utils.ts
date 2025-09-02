
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
    const baseFee = 1000;
    const feePerKm = 500;
    const maxFee = 10000;
    const baseDistance = 2; // The first 2 km are included in the base fee

    if (distanceInKm <= baseDistance) {
        return baseFee;
    }
    
    // Calculate the fee for the distance exceeding the base distance
    const extraDistance = distanceInKm - baseDistance;
    const distanceFee = extraDistance * feePerKm;
    
    let totalFee = baseFee + distanceFee;
    
    // Round to the nearest 250 IQD
    totalFee = Math.round(totalFee / 250) * 250;
    
    // Clamp the fee between the base fee and the maximum fee
    return Math.min(totalFee, maxFee);
}
