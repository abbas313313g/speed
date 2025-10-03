
import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import type { Restaurant } from '@/lib/types';
import { useToast } from './use-toast';

let allRestaurants: Restaurant[] = [];
let hasFetched = false;
const listeners = new Set<(data: Restaurant[]) => void>();

const fetchAllRestaurants = async () => {
    if (hasFetched) return allRestaurants;
    try {
        const restaurantsSnap = await getDocs(collection(db, "restaurants"));
        allRestaurants = restaurantsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Restaurant));
        hasFetched = true;
        listeners.forEach(listener => listener(allRestaurants));
        return allRestaurants;
    } catch (error) {
        console.error("Error fetching restaurants:", error);
        return [];
    }
};

const uploadImage = async (base64: string, path: string): Promise<string> => {
    if (base64 && (base64.startsWith('data:image') || base64.startsWith('data:application'))) {
        const storageRef = ref(storage, path);
        const snapshot = await uploadString(storageRef, base64, 'data_url');
        return getDownloadURL(snapshot.ref);
    }
    return base64;
};

export const useRestaurants = () => {
    const [restaurants, setRestaurantsState] = useState<Restaurant[]>(allRestaurants);
    const [isLoading, setIsLoading] = useState(!hasFetched);
    const { toast } = useToast();

    useEffect(() => {
        const listener = (data: Restaurant[]) => setRestaurantsState(data);
        listeners.add(listener);

        if (!hasFetched) {
            setIsLoading(true);
            fetchAllRestaurants().finally(() => setIsLoading(false));
        }

        return () => {
            listeners.delete(listener);
        };
    }, []);

    const setRestaurants = useCallback((newRestaurants: Restaurant[] | ((prev: Restaurant[]) => Restaurant[])) => {
        if (typeof newRestaurants === 'function') {
            allRestaurants = newRestaurants(allRestaurants);
        } else {
            allRestaurants = newRestaurants;
        }
        listeners.forEach(listener => listener(allRestaurants));
    }, []);
    
    const addRestaurant = async (restaurantData: Omit<Restaurant, 'id'> & { image: string }) => {
        setIsLoading(true);
        try {
            const imageUrl = await uploadImage(restaurantData.image, `restaurants/${uuidv4()}`);
            const docRef = await addDoc(collection(db, "restaurants"), { ...restaurantData, image: imageUrl });
            const newRestaurant = { id: docRef.id, ...restaurantData, image: imageUrl };
            setRestaurants(prev => [...prev, newRestaurant]);
            toast({ title: "تمت إضافة المتجر بنجاح" });
        } catch (error) {
            console.error("Failed to add restaurant:", error);
            toast({ title: "فشل إضافة المتجر", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const updateRestaurant = async (updatedRestaurant: Partial<Restaurant> & { id: string }) => {
        setIsLoading(true);
        try {
            const { id, image, ...restaurantData } = updatedRestaurant;
            const finalData: Partial<Restaurant> = { ...restaurantData };
            if (image) {
                finalData.image = await uploadImage(image, `restaurants/${id}`);
            }

            const restaurantDocRef = doc(db, "restaurants", id);
            await updateDoc(restaurantDocRef, finalData);
            setRestaurants(prev => prev.map(r => r.id === id ? { ...r, ...finalData } as Restaurant : r));
            toast({ title: "تم تحديث المتجر بنجاح" });
        } catch (error) {
            console.error("Failed to update restaurant:", error);
            toast({ title: "فشل تحديث المتجر", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const deleteRestaurant = async (restaurantId: string) => {
        setIsLoading(true);
        try {
            await deleteDoc(doc(db, "restaurants", restaurantId));
            setRestaurants(prev => prev.filter(r => r.id !== restaurantId));
            toast({ title: "تم حذف المتجر بنجاح" });
        } catch (error) {
            console.error("Failed to delete restaurant:", error);
            toast({ title: "فشل حذف المتجر", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    return { restaurants, isLoading, addRestaurant, updateRestaurant, deleteRestaurant };
};
