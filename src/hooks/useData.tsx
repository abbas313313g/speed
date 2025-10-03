
import { useState, useEffect, useMemo } from 'react';
import type { Category, Restaurant, Product, DeliveryZone, User } from '@/lib/types';
import { categories as initialCategories, restaurants as initialRestaurants, products as initialProducts, deliveryZones as initialDeliveryZones } from '@/lib/mock-data';
import { ShoppingBasket } from 'lucide-react';

// A simple hook to manage static data, mimicking a data fetch.
export const useData = () => {
    const [isLoading, setIsLoading] = useState(true);
    
    // In a real app, this would be a fetch call.
    // Here, we just simulate loading with a timeout.
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 500); // Simulate network delay
        return () => clearTimeout(timer);
    }, []);

    const iconMap = useMemo(() => initialCategories.reduce((acc, cat) => {
        acc[cat.iconName] = cat.icon;
        return acc;
    }, {} as {[key: string]: React.ComponentType<{ className?: string }>}), []);

    const categories = useMemo(() => {
        return initialCategories.map(cat => ({
            ...cat,
            icon: iconMap[cat.iconName] || ShoppingBasket
        }));
    }, [iconMap]);
    
    return {
        products: initialProducts,
        restaurants: initialRestaurants,
        categories: categories,
        deliveryZones: initialDeliveryZones,
        allUsers: [], // Mock users
        isLoading,
    };
};
