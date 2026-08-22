
"use client";

import { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, onSnapshot, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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
                setIsLoading(false);
            }
        );
        return () => unsub();
    }, []);

    const addBanner = useCallback(async (bannerData: Omit<Banner, 'id'> & { image: string }) => {
        try {
            await addDoc(collection(db, "banners"), bannerData);
            toast({ title: "تمت إضافة البنر بنجاح" });
        } catch (error) { 
            console.error("Error adding banner:", error);
            toast({ title: "فشل إضافة البنر", variant: "destructive" }); 
        }
    }, [toast]);

    const updateBanner = useCallback(async (banner: Banner) => {
        try {
            const { id, ...bannerData } = banner;
            await updateDoc(doc(db, "banners", id), bannerData);
            toast({ title: "تم تحديث البنر بنجاح" });
        } catch (error) { 
            console.error("Error updating banner:", error);
            toast({ title: "فشل تحديث البنر", variant: "destructive" }); 
        }
    }, [toast]);

    const deleteBanner = useCallback(async (bannerId: string) => {
        try {
            await deleteDoc(doc(db, "banners", bannerId));
            toast({ title: "تم حذف البنر بنجاح" });
        } catch (error) { 
            console.error("Error deleting banner:", error);
            toast({ title: "فشل الحذف", variant: "destructive" }); 
        }
    }, [toast]);

    return { banners, isLoading, addBanner, updateBanner, deleteBanner };
};
