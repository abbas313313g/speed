
"use client";

import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import type { Banner } from '@/lib/types';
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

export const useBanners = () => {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const fetchBanners = async () => {
            setIsLoading(true);
            try {
                const querySnapshot = await getDocs(collection(db, "banners"));
                const fetchedBanners = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Banner));
                setBanners(fetchedBanners);
            } catch (error) {
                console.error("Error fetching banners:", error);
                toast({ title: "فشل تحميل البنرات", variant: "destructive" });
            } finally {
                setIsLoading(false);
            }
        };
        fetchBanners();
    }, [toast]);

    const addBanner = useCallback(async (bannerData: Omit<Banner, 'id'> & { image: string }) => {
        try {
            const imageUrl = await uploadImage(bannerData.image, `banners/${uuidv4()}`);
            const docRef = await addDoc(collection(db, "banners"), { ...bannerData, image: imageUrl });
            setBanners(prev => [{id: docRef.id, ...bannerData, image: imageUrl} as Banner, ...prev]);
            toast({ title: "تمت إضافة البنر بنجاح" });
        } catch (error) { toast({ title: "فشل إضافة البنر", variant: "destructive" }); }
    }, [toast]);

    const updateBanner = useCallback(async (banner: Banner) => {
        try {
            const { id, image, ...bannerData } = banner;
            let finalImageUrl = image;
            if (image && image.startsWith('data:')) {
                finalImageUrl = await uploadImage(image, `banners/${id}`);
            }
            await updateDoc(doc(db, "banners", id), { ...bannerData, image: finalImageUrl });
            setBanners(prev => prev.map(b => b.id === id ? {...b, ...bannerData, image: finalImageUrl} : b));
            toast({ title: "تم تحديث البنر بنجاح" });
        } catch (error) { toast({ title: "فشل تحديث البنر", variant: "destructive" }); }
    }, [toast]);

    const deleteBanner = useCallback(async (bannerId: string) => {
        try {
            await deleteDoc(doc(db, "banners", bannerId));
            setBanners(prev => prev.filter(b => b.id !== bannerId));
            toast({ title: "تم حذف البنر بنجاح" });
        } catch (error) { toast({ title: "فشل حذف البنر", variant: "destructive" }); }
    }, [toast]);


    return { banners, isLoading, addBanner, updateBanner, deleteBanner };
};
