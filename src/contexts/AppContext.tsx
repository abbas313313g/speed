
"use client";

import React, { createContext, useState, useEffect, ReactNode, useMemo } from 'react';
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
    onSnapshot,
    updateDoc,
    deleteDoc,
    query,
    collection,
    getDocs,
    writeBatch,
    where
} from 'firebase/firestore';
import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";
import { db, storage } from '@/lib/firebase';

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
  isLoading: boolean;
  login: (phone: string, name?: string) => Promise<void>;
  checkUserExists: (phone: string) => Promise<boolean>;
  logout: () => void;
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

const SESSION_STORAGE_KEY = 'speedshop_session';


export const AppContextProvider = ({ children }: { children: ReactNode }) => {
    const router = useRouter();
    const { toast } = useToast();
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSessionChecked, setIsSessionChecked] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [banners, setBanners] = useState<Banner[]>([]);
    const [allOrders, setAllOrders] = useState<Order[]>([]);
    
    const [cart, setCart] = useState<CartItem[]>([]);
    const [discount, setDiscount] = useState(0);

    const dataListeners = React.useRef<(() => void)[]>([]);

    const orders = useMemo(() => {
        if (!user) return [];
        // When admin, show all orders. When user, show only their orders.
        const ordersToShow = user.isAdmin ? allOrders : allOrders.filter(o => o.userId === user.id);
        return ordersToShow.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [user, allOrders]);
    
    // --- General Data Fetching (Public) ---
    useEffect(() => {
        const unsubProducts = onSnapshot(collection(db, "products"), (snapshot) => {
            setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
        });
        const unsubCategories = onSnapshot(collection(db, "categories"), (snapshot) => {
            setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
        });
        const unsubRestaurants = onSnapshot(collection(db, "restaurants"), (snapshot) => {
            setRestaurants(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Restaurant)));
        });
        const unsubBanners = onSnapshot(collection(db, "banners"), (snapshot) => {
            setBanners(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Banner)));
        });

        return () => {
            unsubProducts();
            unsubCategories();
            unsubRestaurants();
            unsubBanners();
        };
    }, []);

    // --- User Session Check ---
    useEffect(() => {
        const checkSession = async () => {
            setIsLoading(true);
            const sessionData = localStorage.getItem(SESSION_STORAGE_KEY);
            if (sessionData) {
                const sessionUser = JSON.parse(sessionData) as User;
                const userDocRef = doc(db, 'users', sessionUser.id);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    const freshUserData = { id: userDocSnap.id, ...userDocSnap.data() } as User;
                    setUser(freshUserData);
                } else {
                    localStorage.removeItem(SESSION_STORAGE_KEY);
                    setUser(null);
                }
            }
            setIsLoading(false);
            setIsSessionChecked(true);
        };

        checkSession();
    }, []);

    // --- User-Specific Data Listeners (after session check is complete) ---
    useEffect(() => {
        // Don't run this effect until the initial session check is complete.
        if (!isSessionChecked) {
            return;
        }

        // Cleanup function to run when user changes or component unmounts.
        const cleanupListeners = () => {
            dataListeners.current.forEach(unsub => unsub());
            dataListeners.current = [];
        };

        // Clear previous listeners before setting up new ones.
        cleanupListeners();

        if (user) {
            const newListeners: (() => void)[] = [];
            if (user.isAdmin) {
                // Admin: listens to all orders and all users
                const unsubOrders = onSnapshot(query(collection(db, "orders")), (snapshot) => {
                    setAllOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
                });
                const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
                    setAllUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));
                });
                newListeners.push(unsubOrders, unsubUsers);
            } else {
                // Regular user: listens only to their own orders
                const q = query(collection(db, "orders"), where("userId", "==", user.id));
                const unsubUserOrders = onSnapshot(q, (snapshot) => {
                    setAllOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
                });
                newListeners.push(unsubUserOrders);
            }
            dataListeners.current = newListeners;
        } else {
            // No user, clear any potentially lingering data
            setAllOrders([]);
            setAllUsers([]);
        }

        return cleanupListeners;
    }, [user, isSessionChecked]);


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


    const checkUserExists = async (phone: string): Promise<boolean> => {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("phone", "==", phone));
        const querySnapshot = await getDocs(q);
        return !querySnapshot.empty;
    };

    const login = async (phone: string, name?: string) => {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("phone", "==", phone));
        const querySnapshot = await getDocs(q);

        let currentUser: User;

        if (!querySnapshot.empty) {
            // User exists, log them in
            const userDoc = querySnapshot.docs[0];
            currentUser = { id: userDoc.id, ...userDoc.data() } as User;
        } else {
            // New user, create them
            if (!name) throw new Error("Name is required for a new user.");

            const usersQuery = query(collection(db, 'users'));
            const usersSnapshot = await getDocs(usersQuery);
            const isFirstUser = usersSnapshot.empty;

            const newUserData: Omit<User, 'id'> = {
                phone: phone,
                name: name,
                email: "", 
                isProfileComplete: false,
                isAdmin: isFirstUser, // First user becomes admin
                usedCoupons: [],
                addresses: [],
                deliveryZone: { name: '', fee: 0 },
            };
            const newUserDocRef = await addDoc(collection(db, "users"), newUserData);
            currentUser = { id: newUserDocRef.id, ...newUserData };
        }
        
        setUser(currentUser);
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(currentUser));
        toast({ title: `مرحباً بك، ${currentUser.name.split(' ')[0]}` });
    };

    const logout = async () => {
        if(user) {
            localStorage.removeItem(`cart_${user.id}`);
            localStorage.removeItem(`discount_${user.id}`);
        }
        localStorage.removeItem(SESSION_STORAGE_KEY);
        setUser(null);
        router.push('/login');
    };
    
    const completeUserProfile = async (userData: Pick<User, 'deliveryZone' | 'addresses'> & {name?: string}) => {
        if (!user) return;
        const userDocRef = doc(db, "users", user.id);
        const updatedData = {
            ...userData,
            isProfileComplete: true,
        };
        await updateDoc(userDocRef, updatedData);
        const updatedUser = { ...user, ...updatedData };
        setUser(updatedUser);
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updatedUser));
    }
    
    const addAddress = async (address: Omit<Address, 'id'>) => {
        if (!user) return;
        const newAddress: Address = { ...address, id: `address-${Date.now()}` };
        const updatedAddresses = [...(user.addresses || []), newAddress];
        const userDocRef = doc(db, "users", user.id);
        await updateDoc(userDocRef, { addresses: updatedAddresses });
        const updatedUser = { ...user, addresses: updatedAddresses };
        setUser(updatedUser);
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updatedUser));
        toast({ title: "تم إضافة العنوان بنجاح" });
    }

    // --- Cart ---
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
                    <button className="p-2 bg-red-500 text-white rounded" onClick={() => clearCartAndAdd(product, quantity)}>
                        نعم، ابدأ طلب جديد
                    </button>
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
        setCart(prevCart => prevCart.map(item =>
            item.product.id === productId ? { ...item, quantity } : item
        ));
    };

    const clearCart = () => {
        setCart([]);
        setDiscount(0);
    };
    
    const totalCartPrice = useMemo(() => cart.reduce((total, item) => total + item.product.price * item.quantity, 0), [cart]);
    const deliveryFee = useMemo(() => (cart.length > 0 ? (user?.deliveryZone?.fee ?? 3000) : 0), [cart, user]);
    
    // --- Orders ---
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
                body: JSON.stringify({
                    chat_id: TELEGRAM_CHAT_ID,
                    text: message,
                    parse_mode: 'HTML'
                })
            });
        } catch (error) {
            console.error("Failed to send message to Telegram:", error);
        }
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
    
    const uploadImage = async (dataUrl: string, path: string): Promise<string> => {
        const storageRef = ref(storage, path);
        const snapshot = await uploadString(storageRef, dataUrl, 'data_url');
        return await getDownloadURL(snapshot.ref);
    }
    
    // --- Admin Functions ---
    const addProduct = async (productData: Omit<Product, 'id' | 'bestSeller'>) => {
        const imageUrl = productData.image.startsWith('data:') 
            ? await uploadImage(productData.image, `products/prod-${Date.now()}`)
            : productData.image;

        const newProductData: Omit<Product, 'id'> = {
            ...productData,
            image: imageUrl,
            bestSeller: Math.random() < 0.2
        };
        await addDoc(collection(db, "products"), newProductData);
        toast({ title: "تمت إضافة المنتج بنجاح" });
    }

    const updateProduct = async (updatedProduct: Product) => {
        const { id, ...productData } = updatedProduct;
        const productDocRef = doc(db, "products", id);
        
        const imageUrl = productData.image.startsWith('data:') 
            ? await uploadImage(productData.image, `products/${id}`)
            : productData.image;
        
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
        const userDoc = await getDoc(userDocRef);
        const userData = userDoc.data() as User;

        if (userData.usedCoupons?.includes(couponCode)) {
            toast({ title: "الكود مستخدم بالفعل", variant: "destructive" });
            return;
        }

        if (couponCode === 'SALE10') {
            const discountAmount = totalCartPrice * 0.10;
            setDiscount(discountAmount);
            
            await updateDoc(userDocRef, {
                usedCoupons: [...(userData.usedCoupons || []), couponCode]
            });

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
        isLoading,
        login,
        checkUserExists,
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

    