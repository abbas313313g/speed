
"use client";

import React, { createContext, useState, useEffect, useCallback } from 'react';
import type { Restaurant, OrderStatus } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useRestaurants } from '@/hooks/useRestaurants';
import { useOrders } from '@/hooks/useOrders';
import { useRouter } from 'next/navigation';

interface RestaurantContextType {
    restaurant: Restaurant | null;
    login: (id: string, code: string) => Promise<boolean>;
    logout: () => void;
    updateRestaurantOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
    isProcessing: boolean;
}

export const RestaurantContext = createContext<RestaurantContextType | null>(null);

export const RestaurantProvider = ({ children }: { children: React.ReactNode }) => {
    const { toast } = useToast();
    const router = useRouter();
    const { restaurants, isLoading: restaurantsLoading } = useRestaurants();
    const { updateOrderStatus, isLoading: ordersLoading } = useOrders();
    const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        const storedId = sessionStorage.getItem('restaurantId');
        if (storedId && restaurants.length > 0) {
            const found = restaurants.find(r => r.id === storedId);
            if(found) setRestaurant(found);
        }
    }, [restaurants]);

    const login = useCallback(async (id: string, code: string): Promise<boolean> => {
        const selectedRestaurant = restaurants.find(r => r.id === id);
        if (selectedRestaurant && selectedRestaurant.loginCode === code) {
            sessionStorage.setItem('restaurantId', id);
            setRestaurant(selectedRestaurant);
            return true;
        }
        return false;
    }, [restaurants]);

    const logout = useCallback(() => {
        sessionStorage.removeItem('restaurantId');
        setRestaurant(null);
        router.push('/restaurant/login');
    }, [router]);

    const updateRestaurantOrderStatus = useCallback(async (orderId: string, status: OrderStatus) => {
        setIsProcessing(true);
        try {
            // We don't pass workerId, so this is safe for restaurant use
            await updateOrderStatus(orderId, status);
        } finally {
            setIsProcessing(false);
        }
    }, [updateOrderStatus]);

    const value = {
        restaurant,
        login,
        logout,
        updateRestaurantOrderStatus,
        isProcessing: isProcessing || restaurantsLoading || ordersLoading,
    };

    return <RestaurantContext.Provider value={value}>{children}</RestaurantContext.Provider>;
};
