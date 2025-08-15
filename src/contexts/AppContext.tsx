
"use client";

import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import type { User, CartItem, Product, Order, OrderStatus, Category, Restaurant, Banner } from '@/lib/types';
import { 
    users as initialUsers, 
    products as initialProductsData, 
    categories as initialCategoriesData, 
    restaurants as initialRestaurantsData,
    deliveryZones
} from '@/lib/mock-data';
import { formatCurrency } from '@/lib/utils';
import { auth, db, storage } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollection, useDocumentData } from 'react-firebase-hooks/firestore';
import { 
    collection, query, where, doc, getDocs, writeBatch, addDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp
} from 'firebase/firestore';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { ref, uploadString, getDownloadURL } from "firebase/storage";

// Helper to check and seed data
const seedInitialData = async () => {
    const collectionsToSeed = {
        categories: initialCategoriesData,
        restaurants: initialRestaurantsData,
        products: initialProductsData,
    };

    const batch = writeBatch(db);
    let hasWrites = false;

    for (const [collName, data] of Object.entries(collectionsToSeed)) {
        const collectionRef = collection(db, collName);
        const snapshot = await getDocs(collectionRef);
        if (snapshot.empty) {
            console.log(`Seeding ${collName}...`);
            hasWrites = true;
            data.forEach(item => {
                const docRef = doc(collectionRef, item.id);
                // remove icon component before saving to firestore
                if ('icon' in item) {
                    const { icon, ...rest } = item;
                    batch.set(docRef, rest);
                } else {
                    batch.set(docRef, item);
                }
            });
        }
    }
    
    // Seed users collection and create them in Firebase Auth
    const usersCollectionRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersCollectionRef);
    if(usersSnapshot.empty){
        console.log('Seeding users and creating auth accounts...');
        hasWrites = true;
        for (const user of initialUsers) {
            try {
                // Use phone as email for auth
                const email = `${user.phone}@speedshop.app`;
                const userCredential = await createUserWithEmailAndPassword(auth, email, user.password!);
                const authUid = userCredential.user.uid;
                
                const userDocRef = doc(db, 'users', authUid);
                const { id, password, ...userData } = user;
                batch.set(userDocRef, { ...userData, email, uid: authUid });

            } catch (error: any) {
                // Ignore if user already exists in Auth
                if(error.code !== 'auth/email-already-in-use') {
                    console.error("Error seeding user:", user.name, error);
                }
            }
        }
    }


    if (hasWrites) {
        await batch.commit();
        console.log("Initial data seeding complete.");
    }
};

// Run seeding once on app load
seedInitialData().catch(console.error);

// Custom hook for managing state with localStorage
function useStickyState<T>(defaultValue: T, key: string): [T, React.Dispatch<React.SetStateAction<T>>] {
    const [value, setValue] = useState<T>(() => {
        if (typeof window === 'undefined') {
            return defaultValue;
        }
        try {
            const stickyValue = window.localStorage.getItem(key);
            return stickyValue !== null
                ? JSON.parse(stickyValue)
                : defaultValue;
        } catch (error) {
            console.warn(`Error reading localStorage key “${key}”:`, error);
            return defaultValue;
        }
    });

    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                window.localStorage.setItem(key, JSON.stringify(value));
            } catch (error) {
                console.warn(`Error setting localStorage key “${key}”:`, error);
            }
        }
    }, [key, value]);

    return [value, setValue];
}


interface AppContextType {
  user: User | null;
  allUsers: User[];
  products: Product[];
  cart: CartItem[];
  orders: Order[];
  allOrders: Order[];
  categories: Category[];
  restaurants: Restaurant[];
  banners: Banner[];
  isLoading: boolean;
  login: (phone: string, password?: string) => Promise<boolean>;
  logout: () => void;
  signup: (userData: Omit<User, 'id'>) => Promise<void>;
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  placeOrder: () => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  addProduct: (product: Omit<Product, 'id' | 'bestSeller' | 'image'> & { image?: string }) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (productId: string) => void;
  addCategory: (category: Omit<Category, 'id' | 'icon'>) => void;
  updateCategory: (category: Omit<Category, 'icon' | 'id'> & {id: string}) => void;
  deleteCategory: (categoryId: string) => void;
  addRestaurant: (restaurant: Omit<Restaurant, 'id'>) => Promise<void>;
  updateRestaurant: (restaurant: Restaurant) => Promise<void>;
  deleteRestaurant: (restaurantId: string) => void;
  addBanner: (banner: Omit<Banner, 'id'>) => Promise<void>;
  applyCoupon: (coupon: string) => void;
  totalCartPrice: number;
  deliveryFee: number;
  discount: number;
}

export const AppContext = createContext<AppContextType | null>(null);

const mapDocToId = <T extends {}>(doc: any): T => ({ ...doc.data(), id: doc.id } as T);

export const AppContextProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const { toast } = useToast();
  
  const [authUser, authLoading, authError] = useAuthState(auth);
  
  // Get user profile from Firestore
  const [user, userLoading, userError] = useDocumentData(authUser ? doc(db, 'users', authUser.uid) : null);
  
  // Fetch collections from Firestore
  const [productsSnapshot, productsLoading] = useCollection(collection(db, 'products'));
  const [categoriesSnapshot, categoriesLoading] = useCollection(collection(db, 'categories'));
  const [restaurantsSnapshot, restaurantsLoading] = useCollection(collection(db, 'restaurants'));
  const [bannersSnapshot, bannersLoading] = useCollection(collection(db, 'banners'));
  const [allUsersSnapshot, allUsersLoading] = useCollection(collection(db, 'users'));
  
  // Fetch orders for the current user
  const [ordersSnapshot, ordersLoading] = useCollection(
    authUser ? query(collection(db, 'orders'), where('userId', '==', authUser.uid)) : null
  );

  // Fetch all orders for admin
  const [allOrdersSnapshot, allOrdersLoading] = useCollection(
    user?.isAdmin ? collection(db, 'orders') : null
  );

  // Map snapshots to data arrays
  const products = productsSnapshot?.docs.map(mapDocToId<Product>) ?? [];
  const rawCategories = categoriesSnapshot?.docs.map(mapDocToId<Category>) ?? [];
  const restaurants = restaurantsSnapshot?.docs.map(mapDocToId<Restaurant>) ?? [];
  const banners = bannersSnapshot?.docs.map(mapDocToId<Banner>) ?? [];
  const allUsers = allUsersSnapshot?.docs.map(mapDocToId<User>) ?? [];
  const orders = ordersSnapshot?.docs.map(mapDocToId<Order>) ?? [];
  const allOrders = allOrdersSnapshot?.docs.map(mapDocToId<Order>) ?? [];
  
  const isLoading = authLoading || userLoading || productsLoading || categoriesLoading || restaurantsLoading || bannersLoading || ordersLoading || (user?.isAdmin && allOrdersLoading);

  // Local state for cart and discount
  const [cart, setCart] = useStickyState<CartItem[]>([], `speedShopCart_${authUser?.uid || ''}`);
  const [discount, setDiscount] = useState(0);

  const categories = React.useMemo(() => {
    const iconMap = initialCategoriesData.reduce((acc, cat) => {
        acc[cat.iconName] = cat.icon;
        return acc;
    }, {} as {[key: string]: React.ComponentType<{ className?: string }>});

    return rawCategories.map(cat => ({
        ...cat,
        icon: iconMap[cat.iconName] || ShoppingBasket
    }));
  }, [rawCategories]);


  const login = async (phone: string, password?: string): Promise<boolean> => {
    try {
      const email = `${phone}@speedshop.app`;
      await signInWithEmailAndPassword(auth, email, password!);
      return true;
    } catch (error) {
      console.error("Login failed:", error);
      return false;
    }
  };

  const logout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const signup = async (userData: Omit<User, 'id'>) => {
    const email = `${userData.phone}@speedshop.app`;
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, userData.password!);
        const { uid } = userCredential.user;
        const { password, ...restOfUserData } = userData;

        await addDoc(collection(db, "users"), {
            ...restOfUserData,
            uid: uid,
            email: email,
            createdAt: serverTimestamp()
        });

        toast({
            title: "تم إنشاء الحساب بنجاح!",
        });

    } catch (error: any) {
        console.error("Signup failed:", error);
        toast({
            title: "فشل إنشاء الحساب",
            description: error.message,
            variant: "destructive",
        });
        throw error;
    }
  };

  const uploadImage = async (dataUrl: string, path: string): Promise<string> => {
      const storageRef = ref(storage, path);
      await uploadString(storageRef, dataUrl, 'data_url');
      const downloadUrl = await getDownloadURL(storageRef);
      return downloadUrl;
  }
  
  const clearCartAndAdd = (product: Product, quantity: number = 1) => {
    const newItem = { product, quantity };
    setCart([newItem]);
    setDiscount(0);
    toast({
      title: "تم بدء طلب جديد",
      description: "تم مسح السلة القديمة وإضافة المنتج الجديد.",
    });
  }

  const addToCart = (product: Product, quantity: number = 1) => {
    if (cart.length > 0 && cart[0].product.restaurantId !== product.restaurantId) {
        toast({
            title: "لا يمكن الطلب من متاجر مختلفة",
            description: "هل تريد مسح السلة وبدء طلب جديد من هذا المتجر؟",
            action: (
              <Button variant="destructive" onClick={() => clearCartAndAdd(product, quantity)}>
                نعم، ابدأ طلب جديد
              </Button>
            ),
        });
        return;
    }

    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.product.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prevCart, { product, quantity }];
    });

    toast({
      title: "تمت الإضافة إلى السلة",
      description: `تمت إضافة ${product.name} إلى سلة التسوق.`,
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prevCart => {
        const newCart = prevCart.filter(item => item.product.id !== productId);
        if(newCart.length === 0) setDiscount(0);
        return newCart;
    });
  };
  
  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prevCart =>
      prevCart.map(item =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
  };

  const totalCartPrice = cart.reduce((total, item) => total + item.product.price * item.quantity, 0);
  const deliveryFee = cart.length > 0 ? (user?.deliveryZone?.fee ?? 3000) : 0;
  
  const placeOrder = async () => {
    if (!authUser || cart.length === 0 || !user) return;

    const newOrder = {
      userId: authUser.uid,
      items: cart, // Storing full product details, consider just storing IDs and quantity
      total: totalCartPrice - discount + deliveryFee,
      date: Timestamp.now(),
      status: 'confirmed',
      estimatedDelivery: '30-40 دقيقة',
      user: { id: authUser.uid, name: user.name, phone: user.phone },
      revenue: totalCartPrice - discount,
    };

    const docRef = await addDoc(collection(db, 'orders'), newOrder);
    clearCart();
    // No need for local state simulation of status change, this should be handled by a backend process
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    await updateDoc(doc(db, 'orders', orderId), { status });
  };
  
  const addProduct = async (productData: Omit<Product, 'id' | 'bestSeller' | 'image'> & { image?: string }) => {
    let imageUrl = 'https://placehold.co/600x400.png';
    if(productData.image && productData.image.startsWith('data:')){
        imageUrl = await uploadImage(productData.image, `products/${Date.now()}`);
    }

    await addDoc(collection(db, 'products'), {
        ...productData,
        image: imageUrl,
        bestSeller: Math.random() < 0.2
    });
    toast({ title: "تمت إضافة المنتج بنجاح" });
  }

  const updateProduct = async (updatedProduct: Product) => {
    let imageUrl = updatedProduct.image;
    if(updatedProduct.image && updatedProduct.image.startsWith('data:')){
        imageUrl = await uploadImage(updatedProduct.image, `products/${updatedProduct.id}`);
    }
    const { id, ...data } = { ...updatedProduct, image: imageUrl };
    await updateDoc(doc(db, 'products', id), data);
    toast({ title: "تم تحديث المنتج بنجاح" });
  }

  const deleteProduct = async (productId: string) => {
    await deleteDoc(doc(db, 'products', productId));
    toast({ title: "تم حذف المنتج بنجاح", variant: "destructive" });
  }

  const addCategory = async (categoryData: Omit<Category, 'id' | 'icon'>) => {
    await addDoc(collection(db, 'categories'), categoryData);
    toast({ title: "تمت إضافة القسم بنجاح" });
  }

  const updateCategory = async (updatedCategory: Omit<Category, 'icon' | 'id'> & {id: string}) => {
    const { id, ...data } = updatedCategory;
    await updateDoc(doc(db, 'categories', id), data);
    toast({ title: "تم تحديث القسم بنجاح" });
  }

  const deleteCategory = async (categoryId: string) => {
    await deleteDoc(doc(db, 'categories', categoryId));
    toast({ title: "تم حذف القسم بنجاح", variant: "destructive" });
  }
  
  const addRestaurant = async (restaurantData: Omit<Restaurant, 'id'>) => {
     let imageUrl = 'https://placehold.co/400x300.png';
     if(restaurantData.image && restaurantData.image.startsWith('data:')){
        imageUrl = await uploadImage(restaurantData.image, `restaurants/${Date.now()}`);
    }
    await addDoc(collection(db, 'restaurants'), { ...restaurantData, image: imageUrl });
    toast({ title: "تمت إضافة المتجر بنجاح" });
  }

  const updateRestaurant = async (updatedRestaurant: Restaurant) => {
    let imageUrl = updatedRestaurant.image;
    if(updatedRestaurant.image && updatedRestaurant.image.startsWith('data:')){
        imageUrl = await uploadImage(updatedRestaurant.image, `restaurants/${updatedRestaurant.id}`);
    }
    const { id, ...data } = { ...updatedRestaurant, image: imageUrl };
    await updateDoc(doc(db, 'restaurants', id), data);
    toast({ title: "تم تحديث المتجر بنجاح" });
  }

  const deleteRestaurant = async (restaurantId: string) => {
    await deleteDoc(doc(db, 'restaurants', restaurantId));
    toast({ title: "تم حذف المتجر بنجاح", variant: "destructive" });
  }
  
  const addBanner = async (bannerData: Omit<Banner, 'id'>) => {
     let imageUrl = 'https://placehold.co/600x300.png';
     if(bannerData.image && bannerData.image.startsWith('data:')){
        imageUrl = await uploadImage(bannerData.image, `banners/${Date.now()}`);
    }
    await addDoc(collection(db, 'banners'), { ...bannerData, image: imageUrl, link: bannerData.link || '#' });
    toast({ title: "تمت إضافة البنر بنجاح" });
  }

  const applyCoupon = (coupon: string) => {
    if (!user) return;
    const couponCode = coupon.toUpperCase();
    if (user.usedCoupons?.includes(couponCode)) {
        toast({ title: "الكود مستخدم بالفعل", variant: "destructive" });
        return;
    }
    if (couponCode === 'SALE10') {
        const discountAmount = totalCartPrice * 0.10;
        setDiscount(discountAmount);
        
        // This should be an update to the user document in Firestore
        if (authUser) {
            const userRef = doc(db, 'users', authUser.uid);
            updateDoc(userRef, {
                usedCoupons: [...(user.usedCoupons || []), couponCode]
            });
        }
        
        toast({ title: "تم تطبيق الخصم!", description: `لقد حصلت على خصم بقيمة ${formatCurrency(discountAmount)}.` });
    } else {
        setDiscount(0);
        toast({ title: "كود الخصم غير صالح", variant: "destructive" });
    }
  };
  
  const value: AppContextType = {
    user: user ? { ...user, id: authUser!.uid } as User : null,
    allUsers,
    products,
    cart,
    orders,
    allOrders,
    categories,
    restaurants,
    banners,
    isLoading,
    login,
    logout,
    signup,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    placeOrder,
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
    applyCoupon,
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
