
"use client";

import React, { createContext, useState, useEffect, useCallback } from 'react';
import type { Restaurant, OrderStatus } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useRestaurants } from '@/hooks/useRestaurants';
import { useOrders } from '@/hooks/useOrders';
import { useRouter } from 'next/navigation';

interface RestaurantContextType {
    restaurant: Restaurant | null;
    login: (restaurantNumber: string, code: string) => Promise<boolean>;
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
            return;
        }
        
        setIsInitialCheckDone(true);

        const storedId = sessionStorage.getItem('restaurantId');
        const isLoginPage = window.location.pathname.includes('/login');

        if (storedId) {
            const found = restaurants.find(r => r.id === storedId);
            if (found) {
                setRestaurant(found);
                 if (isLoginPage) {
                    router.replace('/restaurant');
                }
            } else {
                sessionStorage.removeItem('restaurantId');
                if (!isLoginPage) {
                    router.replace('/restaurant/login');
                }
            }
        } else {
            if (!isLoginPage) {
                router.replace('/restaurant/login');
            }
        }
    }, [restaurants, restaurantsLoading, router]);

    const login = useCallback(async (restaurantNumber: string, code: string): Promise<boolean> => {
        // البحث عن المطعم بواسطة "رقم المطعم" المخصص
        const selectedRestaurant = restaurants.find(r => r.restaurantNumber === restaurantNumber);
        
        if (selectedRestaurant && selectedRestaurant.loginCode === code) {
            sessionStorage.setItem('restaurantId', selectedRestaurant.id);
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
            await updateOrderStatus(orderId, status);
        } catch (error) {
            // Error is handled in the hook
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
