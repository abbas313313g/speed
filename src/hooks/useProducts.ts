
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
                toast({ title: "فشل جلب المنتجات", description: "حدث خطأ أثناء تحميل البيانات.", variant: "destructive" });
                setIsLoading(false);
            }
        );
        return () => unsub();
    }, [toast]);

    const uploadImage = useCallback(async (base64: string, path: string): Promise<string> => {
        if (!base64 || !base64.startsWith('data:')) {
            return base64;
        }
        const storageRef = ref(storage, path);
        const snapshot = await uploadString(storageRef, base64, 'data_url');
        return getDownloadURL(snapshot.ref);
    }, []);

    const addProduct = useCallback(async (productData: Omit<Product, 'id'> & { image: string }) => {
        try {
            const imageUrl = await uploadImage(productData.image, `products/${uuidv4()}`);
            await addDoc(collection(db, "products"), { ...productData, image: imageUrl });
            toast({ title: "تمت إضافة المنتج بنجاح" });
        } catch (error) { 
            console.error("Error adding product:", error);
            toast({ title: "فشل إضافة المنتج", description: "حدث خطأ ما، يرجى المحاولة مرة أخرى.", variant: "destructive" }); 
        }
    }, [toast, uploadImage]);

    const updateProduct = useCallback(async (updatedProduct: Partial<Product> & { id: string }) => {
        try {
            const { id, ...productData } = updatedProduct;
            let finalData: Partial<Product> = {...productData};
            if (productData.image && productData.image.startsWith('data:')) {
                finalData.image = await uploadImage(productData.image, `products/${id}`);
            }
            await updateDoc(doc(db, "products", id), finalData);
            toast({ title: "تم تحديث المنتج بنجاح" });
        } catch (error) { 
            console.error("Error updating product:", error);
            toast({ title: "فشل تحديث المنتج", description: "حدث خطأ ما، يرجى المحاولة مرة أخرى.", variant: "destructive" }); 
        }
    }, [toast, uploadImage]);

    const deleteProduct = useCallback(async (productId: string) => {
        try {
            await deleteDoc(doc(db, "products", productId));
            toast({ title: "تم حذف المنتج بنجاح" });
        } catch (error) { 
            console.error("Error deleting product:", error);
            toast({ title: "فشل حذف المنتج", description: "حدث خطأ ما، يرجى المحاولة مرة أخرى.", variant: "destructive" }); 
        }
    }, [toast]);

    return { products, isLoading, addProduct, updateProduct, deleteProduct };
};
