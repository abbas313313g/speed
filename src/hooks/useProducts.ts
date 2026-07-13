
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
        const productsRef = collection(db, 'products');
        let q = productsRef;
        
        // العزل الصارم: إذا كان هناك كود فرع محدد وليس 'all'، نجلب بياناته فقط
        if (branchId && branchId !== 'all') {
            q = query(productsRef, where('branchId', '==', branchId)) as any;
        }

        const unsub = onSnapshot(q,
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
    }, [branchId]);

    const uploadImage = useCallback(async (base64: string, path: string): Promise<string> => {
        if (!base64 || !base64.startsWith('data:')) return base64;
        const storageRef = ref(storage, path);
        const snapshot = await uploadString(storageRef, base64, 'data_url');
        return getDownloadURL(snapshot.ref);
    }, []);

    const addProduct = useCallback(async (productData: Omit<Product, 'id'> & { image: string }, isFromStore = false) => {
        try {
            const imageUrl = await uploadImage(productData.image, `products/${uuidv4()}`);
            const finalData = { 
                ...productData, 
                image: imageUrl, 
                status: isFromStore ? 'pending' : 'approved',
                // نستخدم الكود الممرر للهوك أو كود الفرع في البيانات
                branchId: branchId && branchId !== 'all' ? branchId : (productData.branchId || 'main')
            };
            await addDoc(collection(db, "products"), finalData);
            toast({ title: isFromStore ? "تم الإرسال للأدمن للموافقة" : "تمت إضافة المنتج بنجاح" });
        } catch (error) { 
            toast({ title: "فشل إضافة المنتج", variant: "destructive" }); 
        }
    }, [toast, uploadImage, branchId]);

    const updateProduct = useCallback(async (updatedProduct: Partial<Product> & { id: string }, isFromStore = false) => {
        try {
            const { id, ...productData } = updatedProduct;
            let finalData: Partial<Product> = { ...productData };
            
            if (productData.image && productData.image.startsWith('data:')) {
                finalData.image = await uploadImage(productData.image, `products/${id}`);
            }
            
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
