
"use client";

import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import type { Restaurant } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

const uploadImage = async (base64: string, path: string): Promise<string> => {
    if (!base64 || !base64.startsWith('data:')) {
        return base64; // It's already a URL or invalid
    }
    const storageRef = ref(storage, path);
    const snapshot = await uploadString(storageRef, base64, 'data_url');
    return getDownloadURL(snapshot.ref);
};

export const useRestaurants = () => {
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const fetchRestaurants = async () => {
            setIsLoading(true);
            try {
                const querySnapshot = await getDocs(collection(db, "restaurants"));
                const fetchedRestaurants = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Restaurant));
                setRestaurants(fetchedRestaurants);
            } catch (error) {
                console.error("Error fetching restaurants:", error);
                toast({ title: "فشل تحميل المتاجر", variant: "destructive" });
            } finally {
                setIsLoading(false);
            }
        };
        fetchRestaurants();
    }, [toast]);

    const addRestaurant = useCallback(async (restaurantData: Omit<Restaurant, 'id'> & { image: string }) => {
        try {
            const imageUrl = await uploadImage(restaurantData.image, `restaurants/${uuidv4()}`);
            const docRef = await addDoc(collection(db, "restaurants"), { ...restaurantData, image: imageUrl });
            setRestaurants(prev => [{id: docRef.id, ...restaurantData, image: imageUrl} as Restaurant, ...prev]);
            toast({ title: "تمت إضافة المتجر بنجاح" });
        } catch (error) { toast({ title: "فشل إضافة المتجر", variant: "destructive" }); }
    }, [toast]);

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
            setRestaurants(prev => prev.map(r => r.id === id ? {...r, ...finalData} as Restaurant : r));
            toast({ title: "تم تحديث المتجر بنجاح" });
        } catch (error) { console.error(error); toast({ title: "فشل تحديث المتجر", variant: "destructive" }); }
    }, [toast]);

    const deleteRestaurant = useCallback(async (restaurantId: string) => {
        try {
            await deleteDoc(doc(db, "restaurants", restaurantId));
            setRestaurants(prev => prev.filter(r => r.id !== restaurantId));
            toast({ title: "تم حذف المتجر بنجاح" });
        } catch (error) { toast({ title: "فشل حذف المتجر", variant: "destructive" }); }
    }, [toast]);

    return { restaurants, isLoading, addRestaurant, updateRestaurant, deleteRestaurant };
};
