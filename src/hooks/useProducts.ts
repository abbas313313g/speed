
"use client";

import { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, onSnapshot, doc, query, where, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Product } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook لإدارة المنتجات بذكاء وسرعة.
 * يدعم: جلب منتج واحد، جلب منتجات متجر، أو تحميل تدريجي (Pagination) للقائمة العامة.
 */
export const useProducts = (branchId?: string, restaurantId?: string, loadLimit: number = 10, productId?: string, searchTerm: string = '') => {
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasMore, setHasMore] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        setIsLoading(true);
        let unsub = () => {};

        try {
            // الحالة 1: جلب منتج واحد محدد برابط مباشر (لحظي)
            if (productId) {
                unsub = onSnapshot(doc(db, 'products', productId), (docSnap) => {
                    if (docSnap.exists()) {
                        setProducts([{ id: docSnap.id, ...docSnap.data() } as Product]);
                    } else {
                        setProducts([]);
                    }
                    setIsLoading(false);
                }, (err) => {
                    setIsLoading(false);
                });
                return () => unsub();
            }

            // الحالة 2: البحث الشامل (يتم البحث في كل قاعدة البيانات)
            if (searchTerm.trim() !== '') {
                const ref = collection(db, 'products');
                // نستخدم استعلام بسيط وفلترة محلية لضمان شمولية البحث في كل المتاجر
                const q = query(
                    ref, 
                    where('status', '==', 'approved'),
                    limit(50) // حد أقصى لنتائج البحث لضمان السرعة
                );
                
                getDocs(q).then(snap => {
                    const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
                    // فلترة دقيقة في المتصفح لدعم البحث الجزئي
                    const filtered = data.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
                    setProducts(filtered);
                    setHasMore(false);
                    setIsLoading(false);
                });
                return;
            }

            // الحالة 3: التحميل التدريجي (Infinite Scroll)
            const ref = collection(db, 'products');
            let q = query(
                ref, 
                where('status', '==', 'approved'),
                limit(loadLimit)
            );

            if (restaurantId) {
                q = query(ref, where('restaurantId', '==', restaurantId), where('status', '==', 'approved'), limit(100));
            } else if (branchId && branchId !== 'all') {
                q = query(ref, where('branchId', '==', branchId), where('status', '==', 'approved'), limit(loadLimit));
            }

            unsub = onSnapshot(q, (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
                setProducts(data);
                setHasMore(data.length >= loadLimit);
                setIsLoading(false);
            }, (error) => {
                setIsLoading(false);
            });

        } catch (e) {
            setIsLoading(false);
        }

        return () => unsub();
    }, [branchId, restaurantId, loadLimit, productId, searchTerm]);

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

    return { products, isLoading, hasMore, addProduct, updateProduct, deleteProduct, approveProduct };
};
