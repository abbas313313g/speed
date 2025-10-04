
"use client";

import { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, onSnapshot, doc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { db, storage } from '@/lib/firebase';
import type { Banner } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export const useBanners = () => {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'banners'),
            (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Banner[];
                setBanners(data);
                setIsLoading(false);
            },
            (error) => {
                console.error("Error fetching banners:", error);
                toast({ title: "Failed to fetch banners", variant: "destructive" });
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

    const addBanner = useCallback(async (bannerData: Omit<Banner, 'id'> & { image: string }) => {
        try {
            const imageUrl = await uploadImage(bannerData.image, `banners/${uuidv4()}`);
            await addDoc(collection(db, "banners"), { ...bannerData, image: imageUrl });
            toast({ title: "تمت إضافة البنر بنجاح" });
        } catch (error) { toast({ title: "فشل إضافة البنر", variant: "destructive" }); }
    }, [toast, uploadImage]);

    const updateBanner = useCallback(async (banner: Banner) => {
        try {
            const { id, image, ...bannerData } = banner;
            let finalImageUrl = image;
            if (image && image.startsWith('data:')) {
                finalImageUrl = await uploadImage(image, `banners/${id}`);
            }
            await updateDoc(doc(db, "banners", id), { ...bannerData, image: finalImageUrl });
            toast({ title: "تم تحديث البنر بنجاح" });
        } catch (error) { toast({ title: "فشل تحديث البنر", variant: "destructive" }); }
    }, [toast, uploadImage]);

    const deleteBanner = useCallback(async (bannerId: string) => {
        try {
            await deleteDoc(doc(db, "banners", bannerId));
            toast({ title: "تم حذف البنر بنجاح" });
        } catch (error) { toast({ title: "فشل حذف البنر", variant: "destructive" }); }
    }, [toast]);

    return { banners, isLoading, addBanner, updateBanner, deleteBanner };
};

    