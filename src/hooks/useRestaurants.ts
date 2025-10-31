
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, onSnapshot, doc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { db, storage } from '@/lib/firebase';
import type { Restaurant } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

function isStoreOpen(openTimeStr?: string, closeTimeStr?: string): boolean {
    if (!openTimeStr || !closeTimeStr) return true; // Default to open if times are not set
    
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const [openHours, openMinutes] = openTimeStr.split(':').map(Number);
    const openTime = openHours * 60 + openMinutes;

    const [closeHours, closeMinutes] = closeTimeStr.split(':').map(Number);
    let closeTime = closeHours * 60 + closeMinutes;
    
    // Handle overnight closing times (e.g., 22:00 to 02:00)
    if (closeTime < openTime) {
       // If current time is after open time OR before close time (on the next day)
       return currentTime >= openTime || currentTime < closeTime;
    }

    return currentTime >= openTime && currentTime < closeTime;
}


export const useRestaurants = () => {
    const [restaurantsData, setRestaurantsData] = useState<Restaurant[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'restaurants'),
            (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Restaurant[];
                setRestaurantsData(data);
                setIsLoading(false);
            },
            (error) => {
                console.error("Error fetching restaurants:", error);
                toast({ title: "فشل جلب المتاجر", description: "حدث خطأ أثناء تحميل البيانات.", variant: "destructive" });
                setIsLoading(false);
            }
        );
        return () => unsub();
    }, [toast]);
    
    const restaurants = useMemo(() => {
        return restaurantsData.map(r => ({
            ...r,
            isStoreOpen: isStoreOpen(r.openTime, r.closeTime)
        }));
    }, [restaurantsData]);

    const uploadImage = useCallback(async (base64: string, path: string): Promise<string> => {
        if (!base64 || !base64.startsWith('data:')) {
            return base64;
        }
        const storageRef = ref(storage, path);
        const snapshot = await uploadString(storageRef, base64, 'data_url');
        return getDownloadURL(snapshot.ref);
    }, []);
    
    const addRestaurant = useCallback(async (restaurantData: Omit<Restaurant, 'id'> & { image: string }) => {
        try {
            const imageUrl = await uploadImage(restaurantData.image, `restaurants/${uuidv4()}`);
            await addDoc(collection(db, "restaurants"), { ...restaurantData, image: imageUrl });
            toast({ title: "تمت إضافة المتجر بنجاح" });
        } catch (error) { 
            console.error("Error adding restaurant:", error);
            toast({ title: "فشل إضافة المتجر", description: "حدث خطأ ما، يرجى المحاولة مرة أخرى.", variant: "destructive" }); 
        }
    }, [toast, uploadImage]);

    const updateRestaurant = useCallback(async (updatedRestaurant: Partial<Restaurant> & { id: string }) => {
        try {
            const { id, image, ...restaurantData } = updatedRestaurant;
            const finalData: Partial<Omit<Restaurant, 'id'>> = { ...restaurantData };
             if (image && image.startsWith('data:')) {
                finalData.image = await uploadImage(image, `restaurants/${id}`);
            } else {
                finalData.image = image;
            }
            await updateDoc(doc(db, "restaurants", id), finalData as any);
            toast({ title: "تم تحديث المتجر بنجاح" });
        } catch (error) { 
            console.error("Error updating restaurant:", error);
            toast({ title: "فشل تحديث المتجر", description: "حدث خطأ ما، يرجى المحاولة مرة أخرى.", variant: "destructive" }); 
        }
    }, [toast, uploadImage]);

    const deleteRestaurant = useCallback(async (restaurantId: string) => {
        try {
            await deleteDoc(doc(db, "restaurants", restaurantId));
            toast({ title: "تم حذف المتجر بنجاح" });
        } catch (error) { 
            console.error("Error deleting restaurant:", error);
            toast({ title: "فشل حذف المتجر", description: "حدث خطأ ما، يرجى المحاولة مرة أخرى.", variant: "destructive" }); 
        }
    }, [toast]);

    return { restaurants, isLoading, addRestaurant, updateRestaurant, deleteRestaurant };
};
