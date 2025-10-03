
"use client";

import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Coupon } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export const useCoupons = () => {
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const fetchCoupons = async () => {
            setIsLoading(true);
            try {
                const querySnapshot = await getDocs(collection(db, "coupons"));
                const fetchedCoupons = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Coupon));
                setCoupons(fetchedCoupons);
            } catch (error) {
                console.error("Error fetching coupons:", error);
                toast({ title: "فشل تحميل أكواد الخصم", variant: "destructive" });
            } finally {
                setIsLoading(false);
            }
        };
        fetchCoupons();
    }, [toast]);

    const addCoupon = useCallback(async (couponData: Omit<Coupon, 'id' | 'usedCount' | 'usedBy'>) => {
        try {
            const finalData = { ...couponData, usedCount: 0, usedBy: [] };
            const docRef = await addDoc(collection(db, "coupons"), finalData);
            setCoupons(prev => [{id: docRef.id, ...finalData}, ...prev] as Coupon[]);
            toast({ title: "تمت إضافة الكود بنجاح" });
        } catch (error) { toast({ title: "فشل إضافة الكود", variant: "destructive" }); }
    }, [toast]);

    const deleteCoupon = useCallback(async (couponId: string) => {
        try {
            await deleteDoc(doc(db, "coupons", couponId));
            setCoupons(prev => prev.filter(c => c.id !== couponId));
            toast({ title: "تم حذف الكود بنجاح" });
        } catch (error) { toast({ title: "فشل حذف الكود", variant: "destructive" }); }
    }, [toast]);


    return { coupons, isLoading, addCoupon, deleteCoupon };
};
