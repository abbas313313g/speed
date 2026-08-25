
"use client";

import { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, onSnapshot, doc, query, where, limit, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Product } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export const useProducts = (branchId?: string, restaurantId?: string, loadLimit: number = 100) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        try {
            const productsRef = collection(db, 'products');
            let q = query(productsRef, limit(loadLimit));
            
            // تحسين جلب المنتجات: إذا كان هناك مطعم محدد، نجلب منتجاته فقط وبسرعة
            if (restaurantId) {
                q = query(productsRef, where('restaurantId', '==', restaurantId), limit(loadLimit));
            } else if (branchId && branchId !== 'all') {
                q = query(productsRef, where('branchId', '==', branchId), limit(loadLimit));
            }

            const unsub = onSnapshot(q,
                (snapshot) => {
                    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
                    setProducts(data);
                    setIsLoading(false);
                },
                (error) => {
                    console.error("Firestore products error:", error);
                    setIsLoading(false);
                }
            );
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
                branchId: branchId || productData.branchId || 'main',
                wholesalePrice: Number(productData.wholesalePrice) || 0,
                stock: Number(productData.stock) || 0,
                price: Number(productData.price) || 0,
                createdAt: new Date().toISOString()
            };

            await addDoc(collection(db, "products"), finalData);
            toast({ title: isFromStore ? "تم إرسال الوجبة للمراجعة" : "تمت إضافة المنتج بنجاح" });
        } catch (error: any) { 
            toast({ title: "فشل إضافة المنتج", variant: "destructive" }); 
            throw error;
        }
    }, [toast, branchId]);

    const updateProduct = useCallback(async (updatedProduct: Partial<Product> & { id: string }, shouldMarkPending = false) => {
        try {
            const { id, ...productData } = updatedProduct;
            const finalData: any = { ...productData };

            if (productData.price !== undefined) finalData.price = Number(productData.price);
            if (productData.stock !== undefined) finalData.stock = Number(productData.stock);
            
            if (shouldMarkPending) finalData.status = 'pending';

            await updateDoc(doc(db, "products", id), finalData);
            toast({ title: "تم التحديث بنجاح" });
        } catch (error: any) { 
            toast({ title: "فشل التحديث", variant: "destructive" }); 
        }
    }, [toast]);

    const approveProduct = useCallback(async (productId: string) => {
        try {
            await updateDoc(doc(db, "products", productId), { status: 'approved' });
            toast({ title: "تم النشر بنجاح" });
        } catch (error: any) {
            toast({ title: "فشل الإجراء", variant: "destructive" });
        }
    }, [toast]);

    const deleteProduct = useCallback(async (productId: string) => {
        try {
            await deleteDoc(doc(db, "products", productId));
            toast({ title: "تم الحذف" });
        } catch (error: any) { 
            toast({ title: "فشل الحذف", variant: "destructive" }); 
        }
    }, [toast]);

    return { products, isLoading, addProduct, updateProduct, deleteProduct, approveProduct };
};
