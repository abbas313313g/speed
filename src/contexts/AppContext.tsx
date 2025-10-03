
"use client";

import React, { createContext, useEffect, useState } from 'react';
import { useAddresses } from '@/hooks/useAddresses';
import { useCart } from '@/hooks/useCart.tsx';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { useRestaurants } from '@/hooks/useRestaurants';
import { useOrders } from '@/hooks/useOrders';
import { useBanners } from '@/hooks/useBanners';
import { useDeliveryZones } from '@/hooks/useDeliveryZones';
import { useCoupons } from '@/hooks/useCoupons';
import { useDeliveryWorkers } from '@/hooks/useDeliveryWorkers';
import { useSupportTickets } from '@/hooks/useSupportTickets';
import { useTelegram } from '@/hooks/useTelegram';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/hooks/use-toast';

// Centralized context to provide all hooks' values.
// This avoids deep nesting of providers in the main layout.

type AppContextType = 
    & ReturnType<typeof useAddresses>
    & ReturnType<typeof useCart>
    & ReturnType<typeof useProducts>
    & ReturnType<typeof useCategories>
    & ReturnType<typeof useRestaurants>
    & ReturnType<typeof useOrders>
    & ReturnType<typeof useBanners>
    & ReturnType<typeof useDeliveryZones>
    & ReturnType<typeof useCoupons>
    & ReturnType<typeof useDeliveryWorkers>
    & ReturnType<typeof useSupportTickets>
    & ReturnType<typeof useTelegram>
    & {
        userId: string | null;
        allUsers: any[]; // Kept for admin dashboard, assuming it's fetched somewhere
        isLoading: boolean;
    };


export const AppContext = createContext<AppContextType | null>(null);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
    const addresses = useAddresses();
    const products = useProducts();
    const categories = useCategories();
    const restaurants = useRestaurants();
    const orders = useOrders();
    const banners = useBanners();
    const deliveryZones = useDeliveryZones();
    const coupons = useCoupons();
    const deliveryWorkers = useDeliveryWorkers();
    const supportTickets = useSupportTickets();
    const telegram = useTelegram();
    const cart = useCart();
    const { toast } = useToast();

    const [userId, setUserId] = useState<string|null>(null);

     useEffect(() => {
        const getUserId = () => {
            let id = localStorage.getItem('speedShopUserId');
            if (!id) {
                id = uuidv4();
                localStorage.setItem('speedShopUserId', id);
            }
            return id;
        };
        setUserId(getUserId());
    }, []);


    const [isFetching, setIsFetching] = useState(true);

    const isLoading = addresses.isLoading ||
           products.isLoading ||
           categories.isLoading ||
           restaurants.isLoading ||
           orders.isLoading ||
           banners.isLoading ||
           deliveryZones.isLoading ||
           coupons.isLoading ||
           deliveryWorkers.isLoading ||
           supportTickets.isLoading ||
           telegram.isLoading ||
           isFetching;


    useEffect(() => {
        const fetchAllData = async () => {
            try {
                // The hooks will fetch their own data.
                // We just need to wait for all of them to be done.
                // The `isLoading` state in each hook will become false when done.
                if (!isLoading) {
                    setIsFetching(false);
                }
            } catch (error) {
                console.error("Failed to fetch initial app data:", error);
                toast({
                    title: 'فشل تحميل البيانات',
                    description: 'حدث خطأ أثناء تحميل بيانات التطبيق. الرجاء المحاولة مرة أخرى.',
                    variant: 'destructive',
                });
                setIsFetching(false);
            }
        };

        if (isFetching) {
            fetchAllData();
        }

    }, [isFetching, isLoading, toast]);

    const value: AppContextType = {
        ...addresses,
        ...products,
        ...categories,
        ...restaurants,
        ...orders,
        ...banners,
        ...deliveryZones,
        ...coupons,
        ...deliveryWorkers,
        ...supportTickets,
        ...telegram,
        ...cart,
        userId,
        allUsers: [], // Placeholder for now
        isLoading,
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};
