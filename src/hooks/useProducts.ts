
import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import type { Product } from '@/lib/types';
import { useToast } from './use-toast';

let allProducts: Product[] = [];
let hasFetched = false;
const listeners = new Set<(data: Product[]) => void>();

const fetchAllProducts = async () => {
    if (hasFetched) return allProducts;
    try {
        const productsSnap = await getDocs(collection(db, "products"));
        allProducts = productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        hasFetched = true;
        listeners.forEach(listener => listener(allProducts));
        return allProducts;
    } catch (error) {
        console.error("Error fetching products:", error);
        return [];
    }
};

const uploadImage = async (base64: string, path: string): Promise<string> => {
    if (base64 && (base64.startsWith('data:image') || base64.startsWith('data:application'))) {
        const storageRef = ref(storage, path);
        const snapshot = await uploadString(storageRef, base64, 'data_url');
        return getDownloadURL(snapshot.ref);
    }
    return base64;
};

export const useProducts = () => {
    const [products, setProductsState] = useState<Product[]>(allProducts);
    const [isLoading, setIsLoading] = useState(!hasFetched);
    const { toast } = useToast();

    useEffect(() => {
        const listener = (data: Product[]) => setProductsState(data);
        listeners.add(listener);

        if (!hasFetched) {
            setIsLoading(true);
            fetchAllProducts().finally(() => setIsLoading(false));
        }

        return () => {
            listeners.delete(listener);
        };
    }, []);

    const setProducts = useCallback((newProducts: Product[] | ((prev: Product[]) => Product[])) => {
        if (typeof newProducts === 'function') {
            allProducts = newProducts(allProducts);
        } else {
            allProducts = newProducts;
        }
        listeners.forEach(listener => listener(allProducts));
    }, []);
    
    const addProduct = async (productData: Omit<Product, 'id'> & { image: string }) => {
        setIsLoading(true);
        try {
            const imageUrl = await uploadImage(productData.image, `products/${uuidv4()}`);
            const docRef = await addDoc(collection(db, "products"), { ...productData, image: imageUrl });
            const newProduct = { id: docRef.id, ...productData, image: imageUrl };
            setProducts(prev => [...prev, newProduct]);
            toast({ title: "تمت إضافة المنتج بنجاح" });
        } catch (error) {
            console.error("Failed to add product:", error);
            toast({ title: "فشل إضافة المنتج", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const updateProduct = async (updatedProduct: Partial<Product> & { id: string }) => {
        setIsLoading(true);
        try {
            const { id, image, ...productData } = updatedProduct;
            const finalData: Partial<Product> = { ...productData };
            if (image) {
                finalData.image = await uploadImage(image, `products/${id}`);
            }

            const productDocRef = doc(db, "products", id);
            await updateDoc(productDocRef, finalData);
            setProducts(prev => prev.map(p => p.id === id ? { ...p, ...finalData } as Product : p));
            toast({ title: "تم تحديث المنتج بنجاح" });
        } catch (error) {
            console.error("Failed to update product:", error);
            toast({ title: "فشل تحديث المنتج", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const deleteProduct = async (productId: string) => {
        setIsLoading(true);
        try {
            await deleteDoc(doc(db, "products", productId));
            setProducts(prev => prev.filter(p => p.id !== productId));
            toast({ title: "تم حذف المنتج بنجاح", variant: "destructive" });
        } catch (error) {
            console.error("Failed to delete product:", error);
            toast({ title: "فشل حذف المنتج", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    return { products, setProducts, isLoading, addProduct, updateProduct, deleteProduct };
};
