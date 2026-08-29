
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, onSnapshot, doc, query, where, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Restaurant } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

function isStoreOpen(r: Restaurant): boolean {
    if (r.isManualClosed) return false;
    
    const openTimeStr = r.openTime;
    const closeTimeStr = r.closeTime;
    if (!openTimeStr || !closeTimeStr) return true; 

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const [openHours, openMinutes] = openTimeStr.split(':').map(Number);
    const openTime = openHours * 60 + openMinutes;
    const [closeHours, closeMinutes] = closeTimeStr.split(':').map(Number);
    let closeTime = closeHours * 60 + closeMinutes;
    
    if (closeTime < openTime) return currentTime >= openTime || currentTime < closeTime;
    return currentTime >= openTime && currentTime < closeTime;
}

export const useRestaurants = (branchId?: string) => {
    const [restaurantsData, setRestaurantsData] = useState<Restaurant[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        try {
            const restaurantsRef = collection(db, 'restaurants');
            let q = query(restaurantsRef, limit(100)); 
            
            if (branchId && branchId !== 'all') {
                q = query(restaurantsRef, where('branchId', '==', branchId), limit(100));
            }

            const unsub = onSnapshot(q,
                (snapshot) => {
                    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Restaurant[];
                    setRestaurantsData(data);
                    setIsLoading(false);
                },
                (error) => {
                    console.error("Firestore error:", error);
                    setIsLoading(false);
                }
            );
            return () => unsub();
        } catch (e) {
            setIsLoading(false);
        }
    }, [branchId]);
    
    const restaurants = useMemo(() => {
        return restaurantsData.map(r => ({
            ...r,
            isStoreOpen: isStoreOpen(r)
        }));
    }, [restaurantsData]);

    const addRestaurant = useCallback(async (restaurantData: Omit<Restaurant, 'id'> & { image: string }) => {
        try {
            const finalData = { 
                ...restaurantData, 
                branchId: branchId && branchId !== 'all' ? branchId : (restaurantData.branchId || 'main'),
                rating: Number(restaurantData.rating) || 5,
                commissionRate: Number(restaurantData.commissionRate) || 10,
                latitude: Number(restaurantData.latitude) || 0,
                longitude: Number(restaurantData.longitude) || 0,
                isManualClosed: false
            };
            const docRef = await addDoc(collection(db, "restaurants"), finalData);
            toast({ title: "تمت إضافة المتجر بنجاح" });
            return docRef.id;
        } catch (error: any) { 
            toast({ title: "فشل إضافة المتجر", variant: "destructive" }); 
            throw error;
        }
    }, [toast, branchId]);

    const updateRestaurant = useCallback(async (updatedRestaurant: Partial<Restaurant> & { id: string }) => {
        try {
            const { id, ...restaurantData } = updatedRestaurant;
            await updateDoc(doc(db, "restaurants", id), restaurantData);
            toast({ title: "تم تحديث المتجر بنجاح" });
        } catch (error: any) { 
            toast({ title: "فشل تحديث المتجر", variant: "destructive" }); 
            throw error;
        }
    }, [toast]);

    const deleteRestaurant = useCallback(async (restaurantId: string) => {
        try {
            await deleteDoc(doc(db, "restaurants", restaurantId));
            toast({ title: "تم حذف المتجر بنجاح" });
        } catch (error: any) { 
            toast({ title: "فشل حذف المتجر", variant: "destructive" }); 
        }
    }, [toast]);

    return { restaurants, isLoading, addRestaurant, updateRestaurant, deleteRestaurant };
};
