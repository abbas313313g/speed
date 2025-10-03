
"use client";

import { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, onSnapshot, doc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { db, storage } from '@/lib/firebase';
import type { Restaurant } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export const useRestaurants = () => {
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'restaurants'),
            (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Restaurant[];
                setRestaurants(data);
                setIsLoading(false);
            },
            (error) => {
                console.error("Error fetching restaurants:", error);
                toast({ title: "Failed to fetch restaurants", variant: "destructive" });
                setIsLoading(false);
            }
        );
        return () => unsub();
    }, [toast]);

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
        } catch (error) { toast({ title: "فشل إضافة المتجر", variant: "destructive" }); }
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
        } catch (error) { console.error(error); toast({ title: "فشل تحديث المتجر", variant: "destructive" }); }
    }, [toast, uploadImage]);

    const deleteRestaurant = useCallback(async (restaurantId: string) => {
        try {
            await deleteDoc(doc(db, "restaurants", restaurantId));
            toast({ title: "تم حذف المتجر بنجاح" });
        } catch (error) { toast({ title: "فشل حذف المتجر", variant: "destructive" }); }
    }, [toast]);

    return { restaurants, isLoading, addRestaurant, updateRestaurant, deleteRestaurant };
};

    