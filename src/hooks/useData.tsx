
"use client";

import { useState, useMemo, useCallback } from 'react';
import type { Category, Restaurant, Product, DeliveryZone, Coupon, Banner } from '@/lib/types';
import { categories as initialCategories } from '@/lib/mock-data';
import { ShoppingBasket } from 'lucide-react';
import { db } from '@/lib/firebase';
import { addDoc, collection, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useToast } from './use-toast';
import { v4 as uuidv4 } from 'uuid';
import { storage } from '@/lib/firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

const uploadImage = async (base64: string, path: string): Promise<string> => {
    if (base64 && (base64.startsWith('data:image') || base64.startsWith('data:application'))) {
        const storageRef = ref(storage, path);
        const snapshot = await uploadString(storageRef, base64, 'data_url');
        return getDownloadURL(snapshot.ref);
    }
    return base64;
};


// This hook now acts as the single source of truth for NON-USER-SPECIFIC data.
// It loads data from the static mock-data.ts file to prevent Firestore reads.
export const useData = () => {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    
    // Static data from mock-data.ts
    const [products, setProducts] = useState<Product[]>([]);
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [categories, setCategories] = useState<Omit<Category, 'icon'>[]>([]);
    const [banners, setBanners] = useState<Banner[]>([]);
    const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
    const [coupons, setCoupons] = useState<Coupon[]>([]);

    const iconMap = useMemo(() => initialCategories.reduce((acc, cat) => {
        acc[cat.iconName] = cat.icon;
        return acc;
    }, {} as {[key: string]: React.ComponentType<{ className?: string }>}), []);

    const dynamicCategories = useMemo(() => {
        return categories.map(cat => ({
            ...cat,
            icon: iconMap[cat.iconName] || ShoppingBasket
        }));
    }, [categories, iconMap]);

    // WRAPPERS for local state updates
    const updateProductsState = useCallback((updater: (prev: Product[]) => Product[]) => {
        setProducts(updater);
    }, []);
     const updateCouponsState = useCallback((updater: (prev: Coupon[]) => Coupon[]) => {
        setCoupons(updater);
    }, []);


    // Still using Firestore for writes, but reads are from local state.
    const addProduct = async (productData: Omit<Product, 'id'> & { image: string }) => {
        setIsLoading(true);
        try {
            const imageUrl = await uploadImage(productData.image, `products/${uuidv4()}`);
            const docRef = await addDoc(collection(db, "products"), { ...productData, image: imageUrl });
            const newProduct = { id: docRef.id, ...productData, image: imageUrl };
            setProducts(prev => [...prev, newProduct]);
            toast({ title: "تمت إضافة المنتج بنجاح" });
        } catch (error) { toast({ title: "فشل إضافة المنتج", variant: "destructive" }); } finally { setIsLoading(false); }
    };
    const updateProduct = async (updatedProduct: Partial<Product> & { id: string }) => {
        setIsLoading(true);
        try {
            const { id, image, ...productData } = updatedProduct;
            const finalData: Partial<Product> = { ...productData };
            if (image) finalData.image = await uploadImage(image, `products/${id}`);
            const productDocRef = doc(db, "products", id);
            await updateDoc(productDocRef, finalData);
            setProducts(prev => prev.map(p => p.id === id ? { ...p, ...finalData } as Product : p));
            toast({ title: "تم تحديث المنتج بنجاح" });
        } catch (error) { toast({ title: "فشل تحديث المنتج", variant: "destructive" }); } finally { setIsLoading(false); }
    };
    const deleteProduct = async (productId: string) => {
        setIsLoading(true);
        try {
            await deleteDoc(doc(db, "products", productId));
            setProducts(prev => prev.filter(p => p.id !== productId));
            toast({ title: "تم حذف المنتج بنجاح", variant: "destructive" });
        } catch (error) { toast({ title: "فشل حذف المنتج", variant: "destructive" }); } finally { setIsLoading(false); }
    };

    const addCategory = async (categoryData: Omit<Category, 'id'|'icon'>) => {
        setIsLoading(true);
        try {
            const docRef = await addDoc(collection(db, "categories"), categoryData);
            setCategories(prev => [...prev, { id: docRef.id, ...categoryData }]);
            toast({ title: "تمت إضافة القسم بنجاح" });
        } catch (error) { toast({ title: "فشل إضافة القسم", variant: "destructive" }); } finally { setIsLoading(false); }
    };
    const updateCategory = async (updatedCategory: Omit<Category, 'icon'|'id'> & { id: string }) => {
        setIsLoading(true);
        try {
            const { id, ...categoryData } = updatedCategory;
            const categoryDocRef = doc(db, "categories", id);
            await updateDoc(categoryDocRef, categoryData);
            setCategories(prev => prev.map(c => c.id === id ? { ...c, ...categoryData } : c));
            toast({ title: "تم تحديث القسم بنجاح" });
        } catch (error) { toast({ title: "فشل تحديث القسم", variant: "destructive" }); } finally { setIsLoading(false); }
    };
    const deleteCategory = async (categoryId: string) => {
        setIsLoading(true);
        try {
            await deleteDoc(doc(db, "categories", categoryId));
            setCategories(prev => prev.filter(c => c.id !== categoryId));
            toast({ title: "تم حذف القسم بنجاح" });
        } catch (error) { toast({ title: "فشل حذف القسم", variant: "destructive" }); } finally { setIsLoading(false); }
    };
    
    const addRestaurant = async (restaurantData: Omit<Restaurant, 'id'> & { image: string }) => {
        setIsLoading(true);
        try {
            const imageUrl = await uploadImage(restaurantData.image, `restaurants/${uuidv4()}`);
            const docRef = await addDoc(collection(db, "restaurants"), { ...restaurantData, image: imageUrl });
            const newRestaurant = { id: docRef.id, ...restaurantData, image: imageUrl };
            setRestaurants(prev => [...prev, newRestaurant]);
            toast({ title: "تمت إضافة المتجر بنجاح" });
        } catch (error) { toast({ title: "فشل إضافة المتجر", variant: "destructive" }); } finally { setIsLoading(false); }
    };
    const updateRestaurant = async (updatedRestaurant: Partial<Restaurant> & { id: string }) => {
        setIsLoading(true);
        try {
            const { id, image, ...restaurantData } = updatedRestaurant;
            const finalData: Partial<Restaurant> = { ...restaurantData };
            if (image) finalData.image = await uploadImage(image, `restaurants/${id}`);
            const restaurantDocRef = doc(db, "restaurants", id);
            await updateDoc(restaurantDocRef, finalData);
            setRestaurants(prev => prev.map(r => r.id === id ? { ...r, ...finalData } as Restaurant : r));
            toast({ title: "تم تحديث المتجر بنجاح" });
        } catch (error) { toast({ title: "فشل تحديث المتجر", variant: "destructive" }); } finally { setIsLoading(false); }
    };
    const deleteRestaurant = async (restaurantId: string) => {
        setIsLoading(true);
        try {
            await deleteDoc(doc(db, "restaurants", restaurantId));
            setRestaurants(prev => prev.filter(r => r.id !== restaurantId));
            toast({ title: "تم حذف المتجر بنجاح" });
        } catch (error) { toast({ title: "فشل حذف المتجر", variant: "destructive" }); } finally { setIsLoading(false); }
    };

    const addBanner = async (bannerData: Omit<Banner, 'id'> & { image: string }) => {
        setIsLoading(true);
        try {
            const imageUrl = await uploadImage(bannerData.image, `banners/${uuidv4()}`);
            const docRef = await addDoc(collection(db, "banners"), { ...bannerData, image: imageUrl });
            const newBanner = { id: docRef.id, ...bannerData, image: imageUrl };
            setBanners(prev => [...prev, newBanner]);
            toast({ title: "تمت إضافة البنر بنجاح" });
        } catch (error) { toast({ title: "فشل إضافة البنر", variant: "destructive" }); } finally { setIsLoading(false); }
    };
    const updateBanner = async (banner: Banner) => {
        setIsLoading(true);
        try {
            const { id, image, ...bannerData } = banner;
            const finalData = { ...bannerData, image: await uploadImage(image, `banners/${id}`) };
            const bannerRef = doc(db, "banners", id);
            await updateDoc(bannerRef, finalData);
            setBanners(prev => prev.map(b => b.id === id ? { ...b, ...finalData } as Banner : b));
            toast({ title: "تم تحديث البنر بنجاح" });
        } catch (error) { toast({ title: "فشل تحديث البنر", variant: "destructive" }); } finally { setIsLoading(false); }
    };
    const deleteBanner = async (bannerId: string) => {
        setIsLoading(true);
        try {
            await deleteDoc(doc(db, "banners", bannerId));
            setBanners(prev => prev.filter(b => b.id !== bannerId));
            toast({ title: "تم حذف البنر بنجاح" });
        } catch (error) { toast({ title: "فشل حذف البنر", variant: "destructive" }); } finally { setIsLoading(false); }
    };

    const addDeliveryZone = async (zone: Omit<DeliveryZone, 'id'>) => {
        setIsLoading(true);
        try {
            const docRef = await addDoc(collection(db, "deliveryZones"), zone);
            setDeliveryZones(prev => [...prev, { id: docRef.id, ...zone }]);
            toast({ title: "تمت إضافة المنطقة بنجاح" });
        } catch (error) { toast({ title: "فشل إضافة المنطقة", variant: "destructive" }); } finally { setIsLoading(false); }
    };
    const updateDeliveryZone = async (zone: DeliveryZone) => {
        setIsLoading(true);
        try {
            const zoneRef = doc(db, "deliveryZones", zone.id);
            await updateDoc(zoneRef, { name: zone.name, fee: zone.fee });
            setDeliveryZones(prev => prev.map(z => z.id === zone.id ? zone : z));
            toast({ title: "تم تحديث المنطقة بنجاح" });
        } catch (error) { toast({ title: "فشل تحديث المنطقة", variant: "destructive" }); } finally { setIsLoading(false); }
    };
    const deleteDeliveryZone = async (zoneId: string) => {
        setIsLoading(true);
        try {
            await deleteDoc(doc(db, "deliveryZones", zoneId));
            setDeliveryZones(prev => prev.filter(z => z.id !== zoneId));
            toast({ title: "تم حذف المنطقة بنجاح" });
        } catch (error) { toast({ title: "فشل حذف المنطقة", variant: "destructive" }); } finally { setIsLoading(false); }
    };

    const addCoupon = async (couponData: Omit<Coupon, 'id' | 'usedCount' | 'usedBy'>) => {
        setIsLoading(true);
        try {
            const finalData = { ...couponData, usedCount: 0, usedBy: [] };
            const docRef = await addDoc(collection(db, "coupons"), finalData);
            setCoupons(prev => [...prev, { id: docRef.id, ...finalData }]);
            toast({ title: "تمت إضافة الكود بنجاح" });
        } catch (error) { toast({ title: "فشل إضافة الكود", variant: "destructive" }); } finally { setIsLoading(false); }
    };
    const deleteCoupon = async (couponId: string) => {
        setIsLoading(true);
        try {
            await deleteDoc(doc(db, "coupons", couponId));
            setCoupons(prev => prev.filter(c => c.id !== couponId));
            toast({ title: "تم حذف الكود بنجاح" });
        } catch (error) { toast({ title: "فشل حذف الكود", variant: "destructive" }); } finally { setIsLoading(false); }
    };


    return { 
        products, 
        restaurants, 
        categories: dynamicCategories, 
        banners, 
        deliveryZones, 
        coupons,
        isLoading,
        setProducts: updateProductsState,
        setCoupons: updateCouponsState,
        addProduct, updateProduct, deleteProduct,
        addCategory, updateCategory, deleteCategory,
        addRestaurant, updateRestaurant, deleteRestaurant,
        addBanner, updateBanner, deleteBanner,
        addDeliveryZone, updateDeliveryZone, deleteDeliveryZone,
        addCoupon, deleteCoupon
    };
};

    