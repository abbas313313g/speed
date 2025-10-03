
"use client";

import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import type { Product } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

const uploadImage = async (base64: string, path: string): Promise<string> => {
    if (!base64 || !base64.startsWith('data:')) {
        return base64; // It's already a URL or invalid
    }
    const storageRef = ref(storage, path);
    const snapshot = await uploadString(storageRef, base64, 'data_url');
    return getDownloadURL(snapshot.ref);
};

export const useProducts = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const fetchProducts = async () => {
            setIsLoading(true);
            try {
                const querySnapshot = await getDocs(collection(db, "products"));
                const fetchedProducts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
                setProducts(fetchedProducts);
            } catch (error) {
                console.error("Error fetching products:", error);
                toast({ title: "فشل تحميل المنتجات", variant: "destructive" });
            } finally {
                setIsLoading(false);
            }
        };
        fetchProducts();
    }, [toast]);

    const addProduct = useCallback(async (productData: Omit<Product, 'id'> & { image: string }) => {
        try {
            const imageUrl = await uploadImage(productData.image, `products/${uuidv4()}`);
            const docRef = await addDoc(collection(db, "products"), { ...productData, image: imageUrl });
            setProducts(prev => [{id: docRef.id, ...productData, image: imageUrl} as Product, ...prev]);
            toast({ title: "تمت إضافة المنتج بنجاح" });
        } catch (error) { 
            console.error(error);
            toast({ title: "فشل إضافة المنتج", variant: "destructive" }); 
        }
    }, [toast]);

    const updateProduct = useCallback(async (updatedProduct: Partial<Product> & { id: string }) => {
        try {
            const { id, ...productData } = updatedProduct;
            let finalData: Partial<Product> = {...productData};
            if (productData.image && productData.image.startsWith('data:')) {
                finalData.image = await uploadImage(productData.image, `products/${id}`);
            }
            await updateDoc(doc(db, "products", id), finalData);
            setProducts(prev => prev.map(p => p.id === id ? {...p, ...finalData} as Product : p));
            toast({ title: "تم تحديث المنتج بنجاح" });
        } catch (error) { 
            console.error(error);
            toast({ title: "فشل تحديث المنتج", variant: "destructive" }); 
        }
    }, [toast]);

    const deleteProduct = useCallback(async (productId: string) => {
        try {
            await deleteDoc(doc(db, "products", productId));
            setProducts(prev => prev.filter(p => p.id !== productId));
            toast({ title: "تم حذف المنتج بنجاح" });
        } catch (error) { toast({ title: "فشل حذف المنتج", variant: "destructive" }); }
    }, [toast]);

    return { products, isLoading, addProduct, updateProduct, deleteProduct };
};
