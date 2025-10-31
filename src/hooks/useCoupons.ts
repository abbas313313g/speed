
"use client";

import { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, deleteDoc, onSnapshot, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Coupon } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export const useCoupons = () => {
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'coupons'),
            (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Coupon[];
                setCoupons(data);
                setIsLoading(false);
            },
            (error) => {
                console.error("Error fetching coupons:", error);
                toast({ title: "فشل جلب أكواد الخصم", description: "حدث خطأ أثناء تحميل البيانات.", variant: "destructive" });
                setIsLoading(false);
            }
        );
        return () => unsub();
    }, [toast]);

    const addCoupon = useCallback(async (couponData: Omit<Coupon, 'id' | 'usedCount' | 'usedBy'>) => {
        try {
            const finalData = { ...couponData, usedCount: 0, usedBy: [] };
            await addDoc(collection(db, "coupons"), finalData);
            toast({ title: "تمت إضافة الكود بنجاح" });
        } catch (error) { 
            console.error("Error adding coupon:", error);
            toast({ title: "فشل إضافة الكود", description: "حدث خطأ ما، يرجى المحاولة مرة أخرى.", variant: "destructive" }); 
        }
    }, [toast]);

    const deleteCoupon = useCallback(async (couponId: string) => {
        try {
            await deleteDoc(doc(db, "coupons", couponId));
            toast({ title: "تم حذف الكود بنجاح" });
        } catch (error) { 
            console.error("Error deleting coupon:", error);
            toast({ title: "فشل حذف الكود", description: "حدث خطأ ما، يرجى المحاولة مرة أخرى.", variant: "destructive" }); 
        }
    }, [toast]);

    return { coupons, isLoading, addCoupon, deleteCoupon };
};
