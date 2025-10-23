
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
    const [isInitialCheckDone, setIsInitialCheckDone] = useState(false);

     useEffect(() => {
        if (restaurantsLoading) {
            return; // Wait until restaurants are loaded
        }

        const storedId = sessionStorage.getItem('restaurantId');
        const isLoginPage = window.location.pathname.includes('/login');

        if (storedId) {
            const found = restaurants.find(r => r.id === storedId);
            if (found) {
                setRestaurant(found);
            } else {
                // Stored ID is invalid, clear it and redirect
                sessionStorage.removeItem('restaurantId');
                if (!isLoginPage) {
                    router.replace('/restaurant/login');
                }
            }
        } else {
            // No stored ID, redirect to login if not already there
            if (!isLoginPage) {
                router.replace('/restaurant/login');
            }
        }
        setIsInitialCheckDone(true);
    }, [restaurants, restaurantsLoading, router]);

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
        isProcessing: isProcessing || restaurantsLoading || ordersLoading || !isInitialCheckDone,
    };

    return <RestaurantContext.Provider value={value}>{children}</RestaurantContext.Provider>;
};
