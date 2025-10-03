
import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import type { Banner } from '@/lib/types';
import { useToast } from './use-toast';

let allBanners: Banner[] = [];
let hasFetched = false;
const listeners = new Set<(data: Banner[]) => void>();

const fetchAllBanners = async () => {
    if (hasFetched) return allBanners;
    try {
        const bannersSnap = await getDocs(collection(db, "banners"));
        allBanners = bannersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Banner));
        hasFetched = true;
        listeners.forEach(listener => listener(allBanners));
        return allBanners;
    } catch (error) {
        console.error("Error fetching banners:", error);
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

export const useBanners = () => {
    const [banners, setBannersState] = useState<Banner[]>(allBanners);
    const [isLoading, setIsLoading] = useState(!hasFetched);
    const { toast } = useToast();

    useEffect(() => {
        const listener = (data: Banner[]) => setBannersState(data);
        listeners.add(listener);

        if (!hasFetched) {
            setIsLoading(true);
            fetchAllBanners().finally(() => setIsLoading(false));
        }

        return () => {
            listeners.delete(listener);
        };
    }, []);
    
    const setBanners = useCallback((newBanners: Banner[] | ((prev: Banner[]) => Banner[])) => {
        if (typeof newBanners === 'function') {
            allBanners = newBanners(allBanners);
        } else {
            allBanners = newBanners;
        }
        listeners.forEach(listener => listener(allBanners));
    }, []);
    
    const addBanner = async (bannerData: Omit<Banner, 'id'> & { image: string }) => {
        setIsLoading(true);
        try {
            const imageUrl = await uploadImage(bannerData.image, `banners/${uuidv4()}`);
            const docRef = await addDoc(collection(db, "banners"), { ...bannerData, image: imageUrl });
            const newBanner = { id: docRef.id, ...bannerData, image: imageUrl };
            setBanners(prev => [...prev, newBanner]);
            toast({ title: "تمت إضافة البنر بنجاح" });
        } catch (error) {
            console.error("Failed to add banner:", error);
            toast({ title: "فشل إضافة البنر", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const updateBanner = async (banner: Banner) => {
        setIsLoading(true);
        try {
            const { id, image, ...bannerData } = banner;
            const finalData = { ...bannerData, image: await uploadImage(image, `banners/${id}`) };
            const bannerRef = doc(db, "banners", id);
            await updateDoc(bannerRef, finalData);
            setBanners(prev => prev.map(b => b.id === id ? { ...b, ...finalData } as Banner : b));
            toast({ title: "تم تحديث البنر بنجاح" });
        } catch (error) {
            console.error("Failed to update banner:", error);
            toast({ title: "فشل تحديث البنر", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const deleteBanner = async (bannerId: string) => {
        setIsLoading(true);
        try {
            const bannerRef = doc(db, "banners", bannerId);
            await deleteDoc(bannerRef);
            setBanners(prev => prev.filter(b => b.id !== bannerId));
            toast({ title: "تم حذف البنر بنجاح" });
        } catch (error) {
            console.error("Failed to delete banner:", error);
            toast({ title: "فشل حذف البنر", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    return { banners, isLoading, addBanner, updateBanner, deleteBanner };
};
