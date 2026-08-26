
"use client";

import { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, onSnapshot, doc, query, where, limit, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Product } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook لإدارة المنتجات بذكاء وسرعة.
 * يدعم: جلب قائمة عامة، جلب منتجات متجر، أو جلب منتج واحد محدد (معزول).
 */
export const useProducts = (branchId?: string, restaurantId?: string, loadLimit: number = 20, productId?: string) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        setIsLoading(true);
        try {
            // الحالة 1: طلب منتج واحد محدد (لضمان التحميل اللحظي في صفحة التفاصيل)
            if (productId) {
                const unsub = onSnapshot(doc(db, 'products', productId), (docSnap) => {
                    if (docSnap.exists()) {
                        setProducts([{ id: docSnap.id, ...docSnap.data() } as Product]);
                    } else {
                        setProducts([]);
                    }
                    setIsLoading(false);
                }, (err) => {
                    console.error("Single Product Fetch Error:", err);
                    setIsLoading(false);
                });
                return () => unsub();
            }

            // الحالة 2: طلب قائمة منتجات (للمتجر أو الفرع أو الأكثر مبيعاً)
            const ref = collection(db, 'products');
            let q = query(ref, limit(loadLimit));
            
            if (restaurantId) {
                // تحميل معزول لمنتجات متجر محدد
                q = query(ref, where('restaurantId', '==', restaurantId), limit(100));
            } else if (branchId && branchId !== 'all') {
                // تحميل معزول لمنتجات فرع محدد
                q = query(ref, where('branchId', '==', branchId), limit(loadLimit));
            }

            const unsub = onSnapshot(q, (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
                setProducts(data);
                setIsLoading(false);
            }, (error) => { 
                console.error("List Fetch Error:", error);
                setIsLoading(false); 
            });
            return () => unsub();
        } catch (e) {
            console.error("Hook Error:", e);
            setIsLoading(false);
        }
    }, [branchId, restaurantId, loadLimit, productId]);

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
            toast({ title: "فشل الإرسال، حاول تقليل حجم الصورة", variant: "destructive" }); 
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
            toast({ title: "تم قبول المنتج ونشره للزبائن" });
        } catch (e) { toast({ title: "حدث خطأ غير متوقع", variant: "destructive" }); }
    }, [toast]);

    const deleteProduct = useCallback(async (id: string) => {
        try {
            await deleteDoc(doc(db, "products", id));
            toast({ title: "تم الحذف نهائياً" });
        } catch (e) { toast({ title: "فشل الحذف", variant: "destructive" }); }
    }, [toast]);

    return { products, isLoading, addProduct, updateProduct, deleteProduct, approveProduct };
};
