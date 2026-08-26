
"use client";

import { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, onSnapshot, doc, query, where, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Product } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export const useProducts = (branchId?: string, restaurantId?: string, loadLimit: number = 20) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        try {
            const ref = collection(db, 'products');
            // تقنين القراءات: جلب البيانات بناءً على السياق المطلوب فقط (متجر معين أو فرع معين)
            let q = query(ref, limit(loadLimit));
            
            if (restaurantId) {
                // إذا كان المطلوب منتجات متجر محدد (تحميل معزول)
                q = query(ref, where('restaurantId', '==', restaurantId), limit(100));
            } else if (branchId && branchId !== 'all') {
                // إذا كان المطلوب منتجات فرع محدد
                q = query(ref, where('branchId', '==', branchId), limit(loadLimit));
            }

            const unsub = onSnapshot(q, (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
                setProducts(data);
                setIsLoading(false);
            }, (error) => { 
                console.error("Fetch Error:", error);
                setIsLoading(false); 
            });
            return () => unsub();
        } catch (e) {
            setIsLoading(false);
        }
    }, [branchId, restaurantId, loadLimit]);

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
            toast({ title: "تم التحديث" });
        } catch (error: any) { toast({ title: "فشل التحديث", variant: "destructive" }); }
    }, [toast]);

    const approveProduct = useCallback(async (id: string) => {
        try {
            await updateDoc(doc(db, "products", id), { status: 'approved' });
            toast({ title: "تم قبول المنتج ونشره" });
        } catch (e) { toast({ title: "خطأ", variant: "destructive" }); }
    }, [toast]);

    const deleteProduct = useCallback(async (id: string) => {
        try {
            await deleteDoc(doc(db, "products", id));
            toast({ title: "تم الحذف" });
        } catch (e) { toast({ title: "فشل الحذف", variant: "destructive" }); }
    }, [toast]);

    return { products, isLoading, addProduct, updateProduct, deleteProduct, approveProduct };
};
