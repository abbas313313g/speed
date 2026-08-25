
"use client";

import { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, onSnapshot, doc, query, where, limit, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Product } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export const useProducts = (branchId?: string, loadLimit: number = 50) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        try {
            const productsRef = collection(db, 'products');
            // تحسين: استخدام حدود (limit) لمنع تحميل آلاف الصور دفعة واحدة في الأدمن
            let q = query(productsRef, orderBy('name', 'asc'), limit(loadLimit));
            
            if (branchId && branchId !== 'all') {
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
    }, [branchId, loadLimit]);

    const addProduct = useCallback(async (productData: Omit<Product, 'id'> & { image: string }, isFromStore = false) => {
        try {
            const cleanData = Object.fromEntries(
                Object.entries(productData).filter(([_, v]) => v !== undefined)
            );

            const finalData = { 
                ...cleanData, 
                status: isFromStore ? 'pending' : 'approved',
                branchId: branchId && branchId !== 'all' ? branchId : (productData.branchId || 'main'),
                wholesalePrice: Number(productData.wholesalePrice) || 0,
                stock: Number(productData.stock) || 0,
                price: Number(productData.price) || 0
            };

            await addDoc(collection(db, "products"), finalData);
            toast({ title: isFromStore ? "تم الإرسال للأدمن للموافقة" : "تمت إضافة المنتج بنجاح" });
        } catch (error: any) { 
            console.error("Add product error:", error);
            toast({ title: "فشل إضافة المنتج", description: "تأكد من حجم الصورة، حاول استخدام صورة أصغر.", variant: "destructive" }); 
            throw error;
        }
    }, [toast, branchId]);

    const updateProduct = useCallback(async (updatedProduct: Partial<Product> & { id: string }, shouldMarkPending = false) => {
        try {
            const { id, ...productData } = updatedProduct;
            
            const finalData: any = Object.fromEntries(
                Object.entries(productData).filter(([_, v]) => v !== undefined)
            );

            if (productData.price !== undefined && productData.price !== "") finalData.price = Number(productData.price);
            if (productData.stock !== undefined && productData.stock !== "") finalData.stock = Number(productData.stock);
            if (productData.wholesalePrice !== undefined && productData.wholesalePrice !== "") finalData.wholesalePrice = Number(productData.wholesalePrice);
            
            if (shouldMarkPending) {
                finalData.status = 'pending';
            }

            await updateDoc(doc(db, "products", id), finalData);
            toast({ title: shouldMarkPending ? "تم إرسال التعديلات للموافقة" : "تم تحديث البيانات بنجاح" });
        } catch (error: any) { 
            console.error("Update product error:", error);
            toast({ title: "فشل تحديث المنتج", description: "تأكد من حجم الصورة.", variant: "destructive" }); 
            throw error;
        }
    }, [toast]);

    const approveProduct = useCallback(async (productId: string) => {
        try {
            await updateDoc(doc(db, "products", productId), { status: 'approved' });
            toast({ title: "تمت الموافقة على المنتج" });
        } catch (error: any) {
            toast({ title: "فشل الإجراء", variant: "destructive" });
        }
    }, [toast]);

    const deleteProduct = useCallback(async (productId: string) => {
        try {
            await deleteDoc(doc(db, "products", productId));
            toast({ title: "تم حذف المنتج" });
        } catch (error: any) { 
            toast({ title: "فشل الحذف", variant: "destructive" }); 
        }
    }, [toast]);

    return { products, isLoading, addProduct, updateProduct, deleteProduct, approveProduct };
};
