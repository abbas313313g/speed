
"use client";

import { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, onSnapshot, doc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { db, storage } from '@/lib/firebase';
import type { Product } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export const useProducts = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'products'),
            (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
                setProducts(data);
                setIsLoading(false);
            },
            (error) => {
                console.error("Error fetching products:", error);
                setIsLoading(false);
            }
        );
        return () => unsub();
    }, []);

    const uploadImage = useCallback(async (base64: string, path: string): Promise<string> => {
        if (!base64 || !base64.startsWith('data:')) return base64;
        const storageRef = ref(storage, path);
        const snapshot = await uploadString(storageRef, base64, 'data_url');
        return getDownloadURL(snapshot.ref);
    }, []);

    const addProduct = useCallback(async (productData: Omit<Product, 'id'> & { image: string }, isFromStore = false) => {
        try {
            const imageUrl = await uploadImage(productData.image, `products/${uuidv4()}`);
            // إذا كان المضيف متجراً، نضع الحالة "معلق"
            const finalData = { 
                ...productData, 
                image: imageUrl, 
                status: isFromStore ? 'pending' : 'approved' 
            };
            await addDoc(collection(db, "products"), finalData);
            toast({ title: isFromStore ? "تم الإرسال للأدمن للموافقة" : "تمت إضافة المنتج بنجاح" });
        } catch (error) { 
            toast({ title: "فشل إضافة المنتج", variant: "destructive" }); 
        }
    }, [toast, uploadImage]);

    const updateProduct = useCallback(async (updatedProduct: Partial<Product> & { id: string }, isFromStore = false) => {
        try {
            const { id, ...productData } = updatedProduct;
            let finalData: Partial<Product> = { ...productData };
            
            if (productData.image && productData.image.startsWith('data:')) {
                finalData.image = await uploadImage(productData.image, `products/${id}`);
            }
            
            // إذا عدل المتجر المنتج، يعود للحالة "معلق"
            if (isFromStore) {
                finalData.status = 'pending';
            }

            await updateDoc(doc(db, "products", id), finalData);
            toast({ title: isFromStore ? "تم إرسال التعديلات للموافقة" : "تم تحديث المنتج بنجاح" });
        } catch (error) { 
            toast({ title: "فشل تحديث المنتج", variant: "destructive" }); 
        }
    }, [toast, uploadImage]);

    const approveProduct = useCallback(async (productId: string) => {
        try {
            await updateDoc(doc(db, "products", productId), { status: 'approved' });
            toast({ title: "تمت الموافقة على المنتج" });
        } catch (error) {
            toast({ title: "فشل الإجراء", variant: "destructive" });
        }
    }, [toast]);

    const deleteProduct = useCallback(async (productId: string) => {
        try {
            await deleteDoc(doc(db, "products", productId));
            toast({ title: "تم حذف المنتج" });
        } catch (error) { 
            toast({ title: "فشل الحذف", variant: "destructive" }); 
        }
    }, [toast]);

    return { products, isLoading, addProduct, updateProduct, deleteProduct, approveProduct };
};
