
"use client";

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from "@/hooks/use-toast";
import type { User, Product, Order, OrderStatus, Category, Restaurant, Banner } from '@/lib/types';
import { categories as initialCategoriesData } from '@/lib/mock-data';
import { ShoppingBasket } from 'lucide-react';
import { db, storage } from '@/lib/firebase';
import { 
    doc, 
    addDoc,
    updateDoc,
    deleteDoc,
    collection,
    onSnapshot,
} from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from "firebase/storage";

// --- App Context ---
interface AppContextType {
  products: Product[];
  allOrders: Order[];
  categories: Category[];
  restaurants: Restaurant[];
  banners: Banner[];
  allUsers: User[];
  isLoading: boolean;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  addProduct: (product: Omit<Product, 'id' | 'bestSeller'>) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  addCategory: (category: Omit<Category, 'id' | 'icon'>) => Promise<void>;
  updateCategory: (category: Omit<Category, 'icon' | 'id'> & {id: string}) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;
  addRestaurant: (restaurant: Omit<Restaurant, 'id'>) => Promise<void>;
  updateRestaurant: (restaurant: Restaurant) => Promise<void>;
  deleteRestaurant: (restaurantId: string) => Promise<void>;
  addBanner: (banner: Omit<Banner, 'id'>) => Promise<void>;
  addToCart: (product: Product, quantity: number) => void;
}

export const AppContext = createContext<AppContextType | null>(null);

export const AppContextProvider = ({ children }: { children: ReactNode }) => {
    const { toast } = useToast();
    
    const [isLoading, setIsLoading] = useState(true);
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [banners, setBanners] = useState<Banner[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [allOrders, setAllOrders] = useState<Order[]>([]);
    
    // --- Data Listeners ---
    useEffect(() => {
        setIsLoading(true);
        const unsubs = [
            onSnapshot(collection(db, "products"), snap => setProducts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)))),
            onSnapshot(collection(db, "categories"), snap => setCategories(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)))),
            onSnapshot(collection(db, "restaurants"), snap => setRestaurants(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Restaurant)))),
            onSnapshot(collection(db, "banners"), snap => setBanners(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Banner)))),
            onSnapshot(collection(db, "orders"), snap => setAllOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)))),
            onSnapshot(collection(db, "users"), snap => setAllUsers(snap.docs.map(d => ({ id: d.id, ...d.data() } as User)))),
        ];
        
        setIsLoading(false);

        return () => {
            unsubs.forEach(unsub => unsub());
        };
    }, []);

    const dynamicCategories = React.useMemo(() => {
        const iconMap = initialCategoriesData.reduce((acc, cat) => {
            acc[cat.iconName] = cat.icon;
            return acc;
        }, {} as {[key: string]: React.ComponentType<{ className?: string }>});

        return categories.map(cat => ({
            ...cat,
            icon: iconMap[cat.iconName] || ShoppingBasket
        }));
    }, [categories]);
    
    const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
        const orderDocRef = doc(db, "orders", orderId);
        await updateDoc(orderDocRef, { status });
    };

    const addToCart = () => {
        toast({
            title: "الميزة غير متاحة حالياً",
            description: "تم تبسيط التطبيق. الطلب غير ممكن في الوقت الحالي.",
            variant: "destructive",
        });
    };
    
    // --- ADMIN ACTIONS ---
    // This function is kept in case it's needed later, but it is not used by default.
    const uploadImage = async (dataUrl: string, path: string): Promise<string> => {
        const storageRef = ref(storage, path);
        const snapshot = await uploadString(storageRef, dataUrl, 'data_url');
        return await getDownloadURL(snapshot.ref);
    }
    
    const addProduct = async (productData: Omit<Product, 'id' | 'bestSeller'>) => {
        const newProductData: Omit<Product, 'id'> = { ...productData, image: 'https://placehold.co/600x400.png', bestSeller: Math.random() < 0.2 };
        await addDoc(collection(db, "products"), newProductData);
        toast({ title: "تمت إضافة المنتج بنجاح" });
    }

    const updateProduct = async (updatedProduct: Product) => {
        const { id, ...productData } = updatedProduct;
        const productDocRef = doc(db, "products", id);
        // Do not attempt to re-upload image on update to keep it simple
        const finalProductData = { ...productData };
        if (finalProductData.image.startsWith('data:')) {
            finalProductData.image = 'https://placehold.co/600x400.png';
        }
        await updateDoc(productDocRef, finalProductData);
        toast({ title: "تم تحديث المنتج بنجاح" });
    }

    const deleteProduct = async (productId: string) => {
        await deleteDoc(doc(db, "products", productId));
        toast({ title: "تم حذف المنتج بنجاح", variant: "destructive" });
    }

    const addCategory = async (categoryData: Omit<Category, 'id' | 'icon'>) => {
        await addDoc(collection(db, "categories"), categoryData);
        toast({ title: "تمت إضافة القسم بنجاح" });
    }

    const updateCategory = async (updatedCategory: Omit<Category, 'icon' | 'id'> & {id: string}) => {
        const { id, ...categoryData } = updatedCategory;
        const categoryDocRef = doc(db, "categories", id);
        await updateDoc(categoryDocRef, categoryData);
        toast({ title: "تم تحديث القسم بنجاح" });
    }

    const deleteCategory = async (categoryId: string) => {
        await deleteDoc(doc(db, "categories", categoryId));
        toast({ title: "تم حذف القسم بنجاح", variant: "destructive" });
    }

    const addRestaurant = async (restaurantData: Omit<Restaurant, 'id'>) => {
        await addDoc(collection(db, "restaurants"), { ...restaurantData, image: 'https://placehold.co/400x300.png' });
        toast({ title: "تمت إضافة المتجر بنجاح" });
    }

    const updateRestaurant = async (updatedRestaurant: Restaurant) => {
        const { id, ...restaurantData } = updatedRestaurant;
        const restaurantDocRef = doc(db, "restaurants", id);
        const finalRestaurantData = { ...restaurantData };
        if (finalRestaurantData.image.startsWith('data:')) {
            finalRestaurantData.image = 'https://placehold.co/400x300.png';
        }
        await updateDoc(restaurantDocRef, finalRestaurantData);
        toast({ title: "تم تحديث المتجر بنجاح" });
    }

    const deleteRestaurant = async (restaurantId: string) => {
        await deleteDoc(doc(db, "restaurants", restaurantId));
        toast({ title: "تم حذف المتجر بنجاح", variant: "destructive" });
    }
  
    const addBanner = async (bannerData: Omit<Banner, 'id'>) => {
        await addDoc(collection(db, "banners"), { ...bannerData, image: 'https://placehold.co/600x300.png' });
        toast({ title: "تمت إضافة البنر بنجاح" });
    }

    const value: AppContextType = {
        products,
        allOrders,
        categories: dynamicCategories,
        restaurants,
        banners,
        allUsers,
        isLoading,
        updateOrderStatus,
        addProduct,
        updateProduct,
        deleteProduct,
        addCategory,
        updateCategory,
        deleteCategory,
        addRestaurant,
        updateRestaurant,
        deleteRestaurant,
        addBanner,
        addToCart,
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};
