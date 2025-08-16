
"use client";

import React, { createContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import type { User, CartItem, Product, Order, OrderStatus, Category, Restaurant, Banner, Address } from '@/lib/types';
import { 
    categories as initialCategoriesData, 
} from '@/lib/mock-data';
import { formatCurrency } from '@/lib/utils';
import { ShoppingBasket } from 'lucide-react';
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
import { 
    getAuth, 
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    type User as AuthUser
} from 'firebase/auth';
import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";
import { db, auth, storage } from '@/lib/firebase';

const TELEGRAM_BOT_TOKEN = "7601214758:AAFtkJRGqffuDLKPb8wuHm7r0pt_pDE7BSE";
const TELEGRAM_CHAT_ID = "6626221973";


// --- App Context ---
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
  isAuthLoading: boolean;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signupWithEmail: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  completeUserProfile: (userData: Pick<User, 'deliveryZone' | 'addresses'> & {name?:string}) => Promise<void>;
  addAddress: (address: Omit<Address, 'id'>) => void;
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  placeOrder: (address: Address) => void;
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
  applyCoupon: (coupon: string) => void;
  totalCartPrice: number;
  deliveryFee: number;
  discount: number;
}

export const AppContext = createContext<AppContextType | null>(null);

export const AppContextProvider = ({ children }: { children: ReactNode }) => {
    const router = useRouter();
    const { toast } = useToast();
    
    const [user, setUser] = useState<User | null>(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);
    const [dataLoading, setDataLoading] = useState(true);

    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [banners, setBanners] = useState<Banner[]>([]);
    
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [allOrders, setAllOrders] = useState<Order[]>([]);
    
    const [cart, setCart] = useState<CartItem[]>([]);
    const [discount, setDiscount] = useState(0);

    const isLoading = isAuthLoading || dataLoading;

    // --- Data Listeners Setup ---
    useEffect(() => {
        setDataLoading(true);
        const unsubs: Unsubscribe[] = [];
        
        // Public data listeners
        unsubs.push(onSnapshot(collection(db, "products"), snap => setProducts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)))));
        unsubs.push(onSnapshot(collection(db, "categories"), snap => setCategories(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)))));
        unsubs.push(onSnapshot(collection(db, "restaurants"), snap => setRestaurants(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Restaurant)))));
        unsubs.push(onSnapshot(collection(db, "banners"), snap => setBanners(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Banner)))));

        setDataLoading(false);

        // Cleanup function for public listeners
        return () => {
            unsubs.forEach(unsub => unsub());
        };
    }, []);

    // --- Auth & User-Specific Data Listener ---
    useEffect(() => {
        const authUnsubscribe = onAuthStateChanged(auth, (authUser) => {
            if (authUser) {
                // User is logged in, now listen to their document and specific data
                const userDocUnsubscribe = onSnapshot(doc(db, 'users', authUser.uid), (userDocSnap) => {
                    if (userDocSnap.exists()) {
                        const userData = { id: userDocSnap.id, ...userDocSnap.data() } as User;
                        setUser(userData);

                        // Now that we have user data, setup user-specific listeners
                        const specificDataUnsubs: Unsubscribe[] = [];
                        if (userData.isAdmin) {
                            // Admin data listeners
                            specificDataUnsubs.push(onSnapshot(collection(db, "orders"), snap => setAllOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)))));
                            specificDataUnsubs.push(onSnapshot(collection(db, "users"), snap => setAllUsers(snap.docs.map(d => ({ id: d.id, ...d.data() } as User)))));
                        } else {
                            // Regular user data listener for their own orders
                            const q = query(collection(db, "orders"), where("userId", "==", userData.id));
                            specificDataUnsubs.push(onSnapshot(q, snap => setAllOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)))));
                        }
                        
                        // This cleanup will run if the user doc changes (e.g., isAdmin status changes)
                        // or when the component unmounts.
                        return () => specificDataUnsubs.forEach(unsub => unsub());
                    } else {
                         // This case can happen briefly during account creation
                        setUser(null);
                    }
                    setIsAuthLoading(false);
                });

                // Return cleanup for the user doc listener
                return () => userDocUnsubscribe();

            } else {
                // User is logged out
                setUser(null);
                setAllOrders([]);
                setAllUsers([]);
                setIsAuthLoading(false);
            }
        });

        // Return the main auth listener cleanup function
        return () => authUnsubscribe();
    }, []);

    const orders = useMemo(() => {
        if (!user) return [];
        return allOrders.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [user, allOrders]);

    // --- Cart Persistence (Local Storage) ---
     useEffect(() => {
        if (user) {
            const cartData = localStorage.getItem(`cart_${user.id}`);
            if (cartData) setCart(JSON.parse(cartData));
            const discountData = localStorage.getItem(`discount_${user.id}`);
            if (discountData) setDiscount(JSON.parse(discountData));
        } else {
            setCart([]);
            setDiscount(0);
        }
    }, [user?.id]);

    useEffect(() => {
        if (user) {
            localStorage.setItem(`cart_${user.id}`, JSON.stringify(cart));
            localStorage.setItem(`discount_${user.id}`, JSON.stringify(discount));
        }
    }, [cart, discount, user?.id]);

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

    // --- AUTH ACTIONS ---
    const loginWithEmail = async (email: string, password: string) => {
        await signInWithEmailAndPassword(auth, email, password);
        toast({ title: `مرحباً بعودتك` });
    };

    const signupWithEmail = async (email: string, password: string, name: string) => {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const { user: authUser } = userCredential;

        const usersQuery = query(collection(db, 'users'));
        const usersSnapshot = await getDocs(usersQuery);
        const isFirstUser = usersSnapshot.size === 0;

        const newUserData: Omit<User, 'id'> = {
            name: name,
            email: authUser.email || "",
            phone: authUser.phoneNumber || "",
            isProfileComplete: false,
            isAdmin: isFirstUser,
            usedCoupons: [],
            addresses: [],
            deliveryZone: { name: '', fee: 0 },
        };
        
        await setDoc(doc(db, "users", authUser.uid), newUserData);
        // The onAuthStateChanged listener will handle setting the user state
        toast({ title: `أهلاً بك، ${name}` });
    };

    const logout = async () => {
        if(user) {
            localStorage.removeItem(`cart_${user.id}`);
            localStorage.removeItem(`discount_${user.id}`);
        }
        await signOut(auth);
        // onAuthStateChanged will handle setting user to null and clearing data
        router.push('/login');
    };
    
    const completeUserProfile = async (userData: Pick<User, 'deliveryZone' | 'addresses'> & {name?: string}) => {
        if (!user) return;
        const userDocRef = doc(db, "users", user.id);
        const updatedData = { ...userData, isProfileComplete: true };
        await updateDoc(userDocRef, updatedData);
        // The user doc listener will update the state automatically
    }
    
    const addAddress = async (address: Omit<Address, 'id'>) => {
        if (!user) return;
        const newAddress: Address = { ...address, id: `address-${Date.now()}` };
        const updatedAddresses = [...(user.addresses || []), newAddress];
        const userDocRef = doc(db, "users", user.id);
        await updateDoc(userDocRef, { addresses: updatedAddresses });
        // The user doc listener will update the state automatically
        toast({ title: "تم إضافة العنوان بنجاح" });
    }

    // --- CART ACTIONS ---
    const clearCartAndAdd = (product: Product, quantity: number = 1) => {
        const newItem = { product, quantity };
        setCart([newItem]);
        setDiscount(0);
        toast({ title: "تم بدء طلب جديد", description: "تم مسح السلة القديمة وإضافة المنتج الجديد." });
    }

    const addToCart = (product: Product, quantity: number = 1) => {
        if (cart.length > 0 && cart[0].product.restaurantId !== product.restaurantId) {
            toast({
                title: "لا يمكن الطلب من متاجر مختلفة",
                description: "هل تريد مسح السلة وبدء طلب جديد من هذا المتجر؟",
                action: (<button className="p-2 bg-red-500 text-white rounded" onClick={() => clearCartAndAdd(product, quantity)}>نعم، ابدأ طلب جديد</button>),
            });
            return;
        }

        setCart(prevCart => {
            const existingItem = prevCart.find(item => item.product.id === product.id);
            if (existingItem) {
                return prevCart.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + quantity } : item);
            }
            return [...prevCart, { product, quantity }];
        });

        toast({ title: "تمت الإضافة إلى السلة", description: `تمت إضافة ${product.name} إلى سلة التسوق.` });
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
        setCart(prevCart => prevCart.map(item => item.product.id === productId ? { ...item, quantity } : item));
    };

    const clearCart = () => { setCart([]); setDiscount(0); };
    
    // --- COMPUTED VALUES ---
    const totalCartPrice = useMemo(() => cart.reduce((total, item) => total + item.product.price * item.quantity, 0), [cart]);
    const deliveryFee = useMemo(() => (cart.length > 0 ? (user?.deliveryZone?.fee ?? 3000) : 0), [cart, user]);
    
    // --- ORDER ACTIONS ---
    const sendOrderToTelegram = async (order: Order) => {
        if (!user) return;
        const itemsText = order.items.map(item => `${item.product.name} (x${item.quantity})`).join('\\n');
        const locationLink = `https://www.google.com/maps?q=${order.address?.latitude},${order.address?.longitude}`;

        const message = `
        <b>طلب جديد!</b> 📦
        ---
        <b>رقم الطلب:</b> ${order.id}
        <b>الزبون:</b> ${user.name}
        <b>رقم الهاتف:</b> ${user.phone}
        ---
        <b>العنوان:</b> ${order.address?.name}
        <a href="${locationLink}">📍 عرض على الخريطة</a>
        ---
        <b>الطلبات:</b>
        ${itemsText}
        ---
        <b>المجموع الفرعي:</b> ${formatCurrency(totalCartPrice)}
        <b>الخصم:</b> ${formatCurrency(discount)}
        <b>رسوم التوصيل:</b> ${formatCurrency(deliveryFee)}
        <b>المجموع الكلي:</b> ${formatCurrency(order.total)}
        `;

        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        try {
            await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: 'HTML' })
            });
        } catch (error) { console.error("Failed to send message to Telegram:", error); }
    }

    const placeOrder = async (address: Address) => {
        if (!user || cart.length === 0) return;

        const newOrderData: Omit<Order, 'id'> = {
            userId: user.id,
            items: cart,
            total: totalCartPrice - discount + deliveryFee,
            date: new Date().toISOString(),
            status: 'confirmed',
            estimatedDelivery: '30-40 دقيقة',
            user: { id: user.id, name: user.name, phone: user.phone },
            address: address,
            revenue: totalCartPrice - discount,
        };
        
        const docRef = await addDoc(collection(db, "orders"), newOrderData);
        await sendOrderToTelegram({ ...newOrderData, id: docRef.id });
        clearCart();
    };

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

    const applyCoupon = async (coupon: string) => {
        if (!user) return;
        const couponCode = coupon.toUpperCase();

        const userDocRef = doc(db, "users", user.id);
        const userDocSnap = await getDoc(userDocRef);
        const userData = userDocSnap.data() as User;

        if (userData.usedCoupons?.includes(couponCode)) {
            toast({ title: "الكود مستخدم بالفعل", variant: "destructive" });
            return;
        }

        if (couponCode === 'SALE10') {
            const discountAmount = totalCartPrice * 0.10;
            setDiscount(discountAmount);
            await updateDoc(userDocRef, { usedCoupons: [...(userData.usedCoupons || []), couponCode] });
            toast({ title: "تم تطبيق الخصم!", description: `لقد حصلت على خصم بقيمة ${formatCurrency(discountAmount)}.` });
        } else {
            setDiscount(0);
            toast({ title: "كود الخصم غير صالح", variant: "destructive" });
        }
    };
  
    const value: AppContextType = {
        user,
        allUsers,
        products,
        cart,
        orders,
        allOrders,
        categories: dynamicCategories,
        restaurants,
        banners,
        isAuthLoading: isLoading,
        loginWithEmail,
        signupWithEmail,
        logout,
        completeUserProfile,
        addAddress,
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

    