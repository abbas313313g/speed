
"use client";

import { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, onSnapshot, doc, query, where } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { db, storage } from '@/lib/firebase';
import type { Product } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export const useProducts = (branchId?: string) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        try {
            const productsRef = collection(db, 'products');
            let q = query(productsRef);
            
            if (branchId && branchId !== 'all') {
                q = query(productsRef, where('branchId', '==', branchId));
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
                    setProducts([]);
                }
            );
            return () => unsub();
        } catch (e) {
            setIsLoading(false);
        }
    }, [branchId]);

    const uploadImage = useCallback(async (base64: string, path: string): Promise<string> => {
        if (!base64 || !base64.startsWith('data:')) return base64;
        try {
            const storageRef = ref(storage, path);
            const snapshot = await uploadString(storageRef, base64, 'data_url');
            return await getDownloadURL(snapshot.ref);
        } catch (e) {
            console.warn("Storage upload failed, using base64:", e);
            return base64;
        }
    }, []);

    const addProduct = useCallback(async (productData: Omit<Product, 'id'> & { image: string }, isFromStore = false) => {
        try {
            const imageUrl = await uploadImage(productData.image, `products/${uuidv4()}`);
            
            // تنظيف البيانات من الـ undefined
            const cleanData = Object.fromEntries(
                Object.entries(productData).filter(([_, v]) => v !== undefined)
            );

            const finalData = { 
                ...cleanData, 
                image: imageUrl, 
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
            toast({ title: "فشل إضافة المنتج", description: error.message, variant: "destructive" }); 
            throw error;
        }
    }, [toast, uploadImage, branchId]);

    const updateProduct = useCallback(async (updatedProduct: Partial<Product> & { id: string }, isFromStore = false) => {
        try {
            const { id, ...productData } = updatedProduct;
            
            // تنظيف البيانات من الـ undefined
            const cleanData = Object.fromEntries(
                Object.entries(productData).filter(([_, v]) => v !== undefined)
            );

            let finalData: any = { 
                ...cleanData,
                price: productData.price !== undefined ? Number(productData.price) : undefined,
                stock: productData.stock !== undefined ? Number(productData.stock) : undefined,
                wholesalePrice: productData.wholesalePrice !== undefined ? Number(productData.wholesalePrice) : undefined
            };
            
            // إزالة الـ undefined التي نتجت عن التحويل
            finalData = Object.fromEntries(Object.entries(finalData).filter(([_, v]) => v !== undefined));

            if (productData.image && productData.image.startsWith('data:')) {
                finalData.image = await uploadImage(productData.image, `products/${id}`);
            }
            
            if (isFromStore) {
                finalData.status = 'pending';
            }

            await updateDoc(doc(db, "products", id), finalData);
            toast({ title: isFromStore ? "تم إرسال التعديلات للموافقة" : "تم تحديث المنتج بنجاح" });
        } catch (error: any) { 
            console.error("Update product error:", error);
            toast({ title: "فشل تحديث المنتج", description: error.message, variant: "destructive" }); 
            throw error;
        }
    }, [toast, uploadImage]);

    const approveProduct = useCallback(async (productId: string) => {
        try {
            await updateDoc(doc(db, "products", productId), { status: 'approved' });
            toast({ title: "تمت الموافقة على المنتج" });
        } catch (error: any) {
            toast({ title: "فشل الإجراء", description: error.message, variant: "destructive" });
        }
    }, [toast]);

    const deleteProduct = useCallback(async (productId: string) => {
        try {
            await deleteDoc(doc(db, "products", productId));
            toast({ title: "تم حذف المنتج" });
        } catch (error: any) { 
            toast({ title: "فشل الحذف", description: error.message, variant: "destructive" }); 
        }
    }, [toast]);

    return { products, isLoading, addProduct, updateProduct, deleteProduct, approveProduct };
};
