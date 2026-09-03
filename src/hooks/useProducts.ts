
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, onSnapshot, doc, query, where, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Product, Restaurant } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

function isStoreActuallyOpen(r: Restaurant): boolean {
    if (r.isManualClosed) return false;
    
    const openTimeStr = r.openTime;
    const closeTimeStr = r.closeTime;
    if (!openTimeStr || !closeTimeStr) return true; 

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const [openHours, openMinutes] = openTimeStr.split(':').map(Number);
    const openTime = openHours * 60 + openMinutes;
    const [closeHours, closeMinutes] = closeTimeStr.split(':').map(Number);
    let closeTime = closeHours * 60 + closeMinutes;
    
    if (closeTime < openTime) return currentTime >= openTime || currentTime < closeTime;
    return currentTime >= openTime && currentTime < closeTime;
}

export const useProducts = (
    branchId?: string, 
    restaurantId?: string, 
    loadLimit: number = 20, 
    productId?: string, 
    searchTerm: string = '',
    isAdmin: boolean = false
) => {
    const [rawProducts, setProducts] = useState<Product[]>([]);
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasMore, setHasMore] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'restaurants'), (snap) => {
            setRestaurants(snap.docs.map(d => ({id: d.id, ...d.data()})) as Restaurant[]);
        });
        return () => unsub();
    }, []);

    const products = useMemo(() => {
        return [...rawProducts].sort((a, b) => {
            const restA = restaurants.find(r => r.id === a.restaurantId);
            const restB = restaurants.find(r => r.id === b.restaurantId);
            
            const isAOpen = restA ? isStoreActuallyOpen(restA) : true;
            const isBOpen = restB ? isStoreActuallyOpen(restB) : true;
            
            const isAOut = (a.stock ?? 0) <= 0 && !a.isUnlimitedStock;
            const isBOut = (b.stock ?? 0) <= 0 && !b.isUnlimitedStock;

            const scoreA = (!isAOpen ? 2 : 0) + (isAOut ? 1 : 0);
            const scoreB = (!isBOpen ? 2 : 0) + (isBOut ? 1 : 0);

            return scoreA - scoreB;
        });
    }, [rawProducts, restaurants]);

    useEffect(() => {
        setIsLoading(true);
        let unsub = () => {};

        try {
            if (productId) {
                unsub = onSnapshot(doc(db, 'products', productId), (docSnap) => {
                    if (docSnap.exists()) {
                        setProducts([{ id: docSnap.id, ...docSnap.data() } as Product]);
                    }
                    setIsLoading(false);
                });
                return () => unsub();
            }

            const ref = collection(db, 'products');
            // جلب أوسع لضمان عدم التصفير في الأفرع وتجنب تعقيدات الـ Indexes
            const q = query(ref, limit(isAdmin ? 1000 : 500));

            unsub = onSnapshot(q, (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
                
                // فلترة في الذاكرة لضمان السرعة والدقة في الأفرع
                let filteredData = data;
                if (restaurantId && restaurantId !== 'none') {
                    filteredData = data.filter(p => p.restaurantId === restaurantId);
                } else if (branchId && branchId !== 'all' && branchId !== 'main') {
                    filteredData = data.filter(p => p.branchId === branchId);
                }

                if (!isAdmin) {
                    filteredData = filteredData.filter(p => p.status === 'approved');
                }

                setProducts(filteredData);
                setHasMore(data.length >= (isAdmin ? 1000 : 500));
                setIsLoading(false);
            }, (error) => {
                console.error("Products Snapshot Error:", error);
                setIsLoading(false);
            });

        } catch (e) {
            setIsLoading(false);
        }

        return () => unsub();
    }, [branchId, restaurantId, isAdmin, productId]);

    const addProduct = useCallback(async (productData: Omit<Product, 'id'> & { image: string }, isFromStore = false) => {
        try {
            const finalData = { 
                ...productData, 
                status: isFromStore ? 'pending' : 'approved',
                createdAt: new Date().toISOString()
            };
            await addDoc(collection(db, "products"), finalData);
            toast({ title: isFromStore ? "تم إرسال الوجبة للمراجعة" : "تم النشر بنجاح ✅" });
        } catch (error: any) { 
            toast({ title: "فشل الإرسال", variant: "destructive" }); 
        }
    }, [toast]);

    const updateProduct = useCallback(async (updatedProduct: Partial<Product> & { id: string }) => {
        try {
            const { id, ...data } = updatedProduct;
            await updateDoc(doc(db, "products", id), data);
            toast({ title: "تم التحديث بنجاح" });
        } catch (error: any) { toast({ title: "فشل التحديث", variant: "destructive" }); }
    }, [toast]);

    const approveProduct = useCallback(async (id: string) => {
        try {
            await updateDoc(doc(db, "products", id), { status: 'approved' });
            toast({ title: "تم قبول الوجبة" });
        } catch (e) { toast({ title: "حدث خطأ", variant: "destructive" }); }
    }, [toast]);

    const deleteProduct = useCallback(async (id: string) => {
        try {
            await deleteDoc(doc(db, "products", id));
            toast({ title: "تم الحذف نهائياً" });
        } catch (e) { toast({ title: "فشل الحذف", variant: "destructive" }); }
    }, [toast]);

    return { products, isLoading, hasMore, addProduct, updateProduct, deleteProduct, approveProduct };
};
