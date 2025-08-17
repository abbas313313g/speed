
"use client";

import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import type { User, CartItem, Product, Order, OrderStatus, Category, Restaurant, Banner, Address, DeliveryZone } from '@/lib/types';
import { categories as initialCategoriesData } from '@/lib/mock-data';
import { formatCurrency } from '@/lib/utils';
import { ShoppingBasket } from 'lucide-react';
import { auth, db, storage } from '@/lib/firebase';
import { 
    onAuthStateChanged, 
    User as FirebaseAuthUser
} from 'firebase/auth';
import { 
    doc, 
    getDoc, 
    setDoc, 
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    collection,
    getDocs,
    where,
    onSnapshot,
    Unsubscribe
} from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from "firebase/storage";

// --- App Context ---
// NOTE: User authentication has been removed for simplification.
// The context now focuses on providing data for browsing and admin management.
interface AppContextType {
  user: User | null;
  firebaseUser: FirebaseAuthUser | null;
  allUsers: User[];
  products: Product[];
  cart: CartItem[];
  orders: Order[];
  allOrders: Order[];
  categories: Category[];
  restaurants: Restaurant[];
  banners: Banner[];
  isAuthLoading: boolean;
  isLoading: boolean;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
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
  totalCartPrice: number;
  deliveryFee: number;
  discount: number;
}

export const AppContext = createContext<AppContextType | null>(null);


export const AppContextProvider = ({ children }: { children: ReactNode }) => {
    const { toast } = useToast();
    
    // Auth state is kept minimal, as full user auth is disabled.
    const [firebaseUser, setFirebaseUser] = useState<FirebaseAuthUser | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);
    const [isLoading, setIsLoading] = useState(false);

    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [banners, setBanners] = useState<Banner[]>([]);
    
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [allOrders, setAllOrders] = useState<Order[]>([]);
    
    // Cart is disabled as auth is removed.
    const [cart, setCart] = useState<CartItem[]>([]);
    const [discount, setDiscount] = useState(0);

    // --- Data Listeners ---
    useEffect(() => {
        setIsAuthLoading(true);
        // Only fetch public and admin data. No user-specific data is fetched.
        const unsubs = [
            onSnapshot(collection(db, "products"), snap => setProducts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)))),
            onSnapshot(collection(db, "categories"), snap => setCategories(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)))),
            onSnapshot(collection(db, "restaurants"), snap => setRestaurants(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Restaurant)))),
            onSnapshot(collection(db, "banners"), snap => setBanners(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Banner)))),
            onSnapshot(query(collection(db, "orders")), snap => setAllOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)))),
            onSnapshot(query(collection(db, "users")), snap => setAllUsers(snap.docs.map(d => ({ id: d.id, ...d.data() } as User)))),
        ];
        
        // No more onAuthStateChanged, auth is simplified.
        setIsAuthLoading(false);

        return () => {
            unsubs.forEach(unsub => unsub());
        };
    }, []);


    const orders = allOrders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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

    // Cart and order placement functionality is disabled.
    const totalCartPrice = 0;
    const deliveryFee = 0;
    
    const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
        const orderDocRef = doc(db, "orders", orderId);
        await updateDoc(orderDocRef, { status });
    };
    
    // --- ADMIN ACTIONS ---
    const uploadImage = async (dataUrl: string, path: string): Promise<string> => {
        const storageRef = ref(storage, path);
        const snapshot = await uploadString(storageRef, dataUrl, 'data_url');
        return await getDownloadURL(snapshot.ref);
    }
    
    const addProduct = async (productData: Omit<Product, 'id' | 'bestSeller'>) => {
        const imageUrl = productData.image.startsWith('data:') 
            ? await uploadImage(productData.image, `products/prod-${Date.now()}`)
            : productData.image;

        const newProductData: Omit<Product, 'id'> = { ...productData, image: imageUrl, bestSeller: Math.random() < 0.2 };
        await addDoc(collection(db, "products"), newProductData);
        toast({ title: "تمت إضافة المنتج بنجاح" });
    }

    const updateProduct = async (updatedProduct: Product) => {
        const { id, ...productData } = updatedProduct;
        const productDocRef = doc(db, "products", id);
        const imageUrl = productData.image.startsWith('data:') ? await uploadImage(productData.image, `products/${id}`) : productData.image;
        await updateDoc(productDocRef, { ...productData, image: imageUrl });
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
        let imageUrl = restaurantData.image;
        if (imageUrl && imageUrl.startsWith('data:')) {
            imageUrl = await uploadImage(imageUrl, `restaurants/res-${Date.now()}`);
        }
        await addDoc(collection(db, "restaurants"), { ...restaurantData, image: imageUrl });
        toast({ title: "تمت إضافة المتجر بنجاح" });
    }

    const updateRestaurant = async (updatedRestaurant: Restaurant) => {
        const { id, ...restaurantData } = updatedRestaurant;
        let imageUrl = restaurantData.image;
        if (imageUrl && imageUrl.startsWith('data:')) {
            imageUrl = await uploadImage(imageUrl, `restaurants/${id}`);
        }
        const restaurantDocRef = doc(db, "restaurants", id);
        await updateDoc(restaurantDocRef, { ...restaurantData, image: imageUrl });
        toast({ title: "تم تحديث المتجر بنجاح" });
    }

    const deleteRestaurant = async (restaurantId: string) => {
        await deleteDoc(doc(db, "restaurants", restaurantId));
        toast({ title: "تم حذف المتجر بنجاح", variant: "destructive" });
    }
  
    const addBanner = async (bannerData: Omit<Banner, 'id'>) => {
        const imageUrl = bannerData.image.startsWith('data:') 
            ? await uploadImage(bannerData.image, `banners/banner-${Date.now()}`)
            : bannerData.image;
        await addDoc(collection(db, "banners"), { ...bannerData, image: imageUrl });
        toast({ title: "تمت إضافة البنر بنجاح" });
    }

    const value: AppContextType = {
        user,
        firebaseUser,
        allUsers,
        products,
        cart,
        orders,
        allOrders,
        categories: dynamicCategories,
        restaurants,
        banners,
        isAuthLoading,
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
        totalCartPrice,
        deliveryFee,
        discount,
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};
