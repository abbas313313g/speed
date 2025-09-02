
import { clsx, type ClassValue } from "clsx"
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
    const R = 6371; // Radius of the Earth in km
    const toRad = (value: number) => (value * Math.PI) / 180;

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
    const baseFee = 1000; // Minimum fee
    const feePerKm = 500; // 500 IQD per km

    if (distanceInKm <= 0) {
        return baseFee;
    }
    
    const distanceFee = distanceInKm * feePerKm;
    let totalFee = baseFee + distanceFee;
    
    // Round to the nearest 250 IQD
    totalFee = Math.round(totalFee / 250) * 250;
    
    // Ensure the fee is not less than the base fee
    return Math.max(totalFee, baseFee);
}
