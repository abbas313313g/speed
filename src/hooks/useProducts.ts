
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, onSnapshot, doc, query, where, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Product, Restaurant } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook لإدارة المنتجات بذكاء وسرعة.
 * يدعم الترتيب الذكي (المتوفر أولاً) والتحميل المقنن.
 */
export const useProducts = (
    branchId?: string, 
    restaurantId?: string, 
    loadLimit: number = 10, 
    productId?: string, 
    searchTerm: string = '',
    isAdmin: boolean = false
) => {
    const [rawProducts, setProducts] = useState<Product[]>([]);
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasMore, setHasMore] = useState(true);
    const { toast } = useToast();

    // جلب معلومات المتاجر للترتيب بناءً على حالة الفتح
    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'restaurants'), (snap) => {
            setRestaurants(snap.docs.map(d => ({id: d.id, ...d.data()})) as Restaurant[]);
        });
        return () => unsub();
    }, []);

    const products = useMemo(() => {
        // ترتيب المنتجات: المتوفر والمتجر المفتوح أولاً، النافذ والمغلق آخراً
        return [...rawProducts].sort((a, b) => {
            const restA = restaurants.find(r => r.id === a.restaurantId);
            const restB = restaurants.find(r => r.id === b.restaurantId);
            
            const isAClosed = restA?.isManualClosed || false;
            const isBClosed = restB?.isManualClosed || false;
            
            const isAOut = (a.stock ?? 0) <= 0 && !a.isUnlimitedStock;
            const isBOut = (b.stock ?? 0) <= 0 && !b.isUnlimitedStock;

            const scoreA = (isAClosed ? 2 : 0) + (isAOut ? 1 : 0);
            const scoreB = (isBClosed ? 2 : 0) + (isBOut ? 1 : 0);

            return scoreA - scoreB;
        });
    }, [rawProducts, restaurants]);

    useEffect(() => {
        setIsLoading(true);
        // تصفير المنتجات فوراً عند تغيير المعايير لمنع ظهور بيانات قديمة (Stale Data)
        setProducts([]);
        
        let unsub = () => {};

        try {
            if (productId) {
                unsub = onSnapshot(doc(db, 'products', productId), (docSnap) => {
                    if (docSnap.exists()) {
                        setProducts([{ id: docSnap.id, ...docSnap.data() } as Product]);
                    } else {
                        setProducts([]);
                    }
                    setIsLoading(false);
                });
                return () => unsub();
            }

            if (searchTerm.trim() !== '') {
                const ref = collection(db, 'products');
                const q = isAdmin 
                    ? query(ref, limit(200))
                    : query(ref, where('status', '==', 'approved'), limit(200));
                
                getDocs(q).then(snap => {
                    const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
                    const filtered = data.filter(p => 
                        p.name.toLowerCase().includes(searchTerm.toLowerCase())
                    );
                    setProducts(filtered);
                    setHasMore(false);
                    setIsLoading(false);
                }).catch(() => setIsLoading(false));
                return;
            }

            const ref = collection(db, 'products');
            let q;

            // إذا كان المطلوب متجر معين، نستخدم كود جلب مباشر وسريع جداً
            if (restaurantId && restaurantId !== 'none') {
                const storeLimit = isAdmin ? 1000 : 500;
                q = isAdmin 
                    ? query(ref, where('restaurantId', '==', restaurantId), limit(storeLimit))
                    : query(ref, where('restaurantId', '==', restaurantId), where('status', '==', 'approved'), limit(storeLimit));
            } else if (branchId && branchId !== 'all') {
                q = isAdmin 
                    ? query(ref, where('branchId', '==', branchId), limit(loadLimit))
                    : query(ref, where('branchId', '==', branchId), where('status', '==', 'approved'), limit(loadLimit));
            } else {
                q = isAdmin 
                    ? query(ref, limit(loadLimit))
                    : query(ref, where('status', '==', 'approved'), limit(loadLimit));
            }

            unsub = onSnapshot(q, (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
                setProducts(data);
                setHasMore(data.length >= loadLimit);
                setIsLoading(false);
            }, (error) => {
                setIsLoading(false);
            });

        } catch (e) {
            setIsLoading(false);
        }

        return () => unsub();
    }, [branchId, restaurantId, loadLimit, productId, searchTerm, isAdmin]);

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
