
import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, addDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Coupon } from '@/lib/types';
import { useToast } from './use-toast';

let allCoupons: Coupon[] = [];
let hasFetched = false;
const listeners = new Set<(data: Coupon[]) => void>();

const fetchAllCoupons = async () => {
    if (hasFetched) return allCoupons;
    try {
        const couponsSnap = await getDocs(collection(db, "coupons"));
        allCoupons = couponsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Coupon));
        hasFetched = true;
        listeners.forEach(listener => listener(allCoupons));
        return allCoupons;
    } catch (error) {
        console.error("Error fetching coupons:", error);
        return [];
    }
};

export const useCoupons = () => {
    const [coupons, setCouponsState] = useState<Coupon[]>(allCoupons);
    const [isLoading, setIsLoading] = useState(!hasFetched);
    const { toast } = useToast();

    useEffect(() => {
        const listener = (data: Coupon[]) => setCouponsState(data);
        listeners.add(listener);

        if (!hasFetched) {
            setIsLoading(true);
            fetchAllCoupons().finally(() => setIsLoading(false));
        }

        return () => {
            listeners.delete(listener);
        };
    }, []);

    const setCoupons = useCallback((newCoupons: Coupon[] | ((prev: Coupon[]) => Coupon[])) => {
        if (typeof newCoupons === 'function') {
            allCoupons = newCoupons(allCoupons);
        } else {
            allCoupons = newCoupons;
        }
        listeners.forEach(listener => listener(allCoupons));
    }, []);

    const addCoupon = async (couponData: Omit<Coupon, 'id' | 'usedCount' | 'usedBy'>) => {
        setIsLoading(true);
        try {
            const finalData = { ...couponData, usedCount: 0, usedBy: [] };
            const docRef = await addDoc(collection(db, "coupons"), finalData);
            setCoupons(prev => [...prev, { id: docRef.id, ...finalData }]);
            toast({ title: "تمت إضافة الكود بنجاح" });
        } catch (error) {
            console.error("Failed to add coupon:", error);
            toast({ title: "فشل إضافة الكود", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const deleteCoupon = async (couponId: string) => {
        setIsLoading(true);
        try {
            await deleteDoc(doc(db, "coupons", couponId));
            setCoupons(prev => prev.filter(c => c.id !== couponId));
            toast({ title: "تم حذف الكود بنجاح" });
        } catch (error) {
            console.error("Failed to delete coupon:", error);
            toast({ title: "فشل حذف الكود", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    return { coupons, setCoupons, isLoading, addCoupon, deleteCoupon };
};
