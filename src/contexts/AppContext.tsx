
"use client";

import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { collection, getDocs, doc, runTransaction, arrayUnion, addDoc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/hooks/use-toast';
import { sendTelegramMessage } from '@/lib/telegram';
import { getWorkerLevel } from '@/lib/workerLevels';
import { formatCurrency } from '@/lib/utils';
import { ToastAction } from '@/components/ui/toast';
import type { 
    Product, 
    Category, 
    Restaurant, 
    Banner, 
    DeliveryZone, 
    Order, 
    SupportTicket, 
    Coupon, 
    TelegramConfig, 
    User, 
    Address, 
    CartItem, 
    OrderStatus, 
    Message,
    DeliveryWorker,
    ProductSize
} from '@/lib/types';
import { categories as initialCategories } from '@/lib/mock-data';
import { ShoppingBasket } from 'lucide-react';


interface AppContextType {
    // Data
    products: Product[];
    categories: Category[];
    restaurants: Restaurant[];
    banners: Banner[];
    deliveryZones: DeliveryZone[];
    allOrders: Order[];
    supportTickets: SupportTicket[];
    coupons: Coupon[];
    telegramConfigs: TelegramConfig[];
    deliveryWorkers: DeliveryWorker[];
    allUsers: User[];
    
    // Loading State
    isLoading: boolean;

    // Functions
    addProduct: (productData: Omit<Product, 'id'> & { image: string }) => Promise<void>;
    updateProduct: (updatedProduct: Partial<Product> & { id: string }) => Promise<void>;
    deleteProduct: (productId: string) => Promise<void>;

    addCategory: (categoryData: Omit<Category, 'id' | 'icon'>) => Promise<void>;
    updateCategory: (updatedCategory: Omit<Category, 'icon' | 'id'> & { id: string }) => Promise<void>;
    deleteCategory: (categoryId: string) => Promise<void>;

    addRestaurant: (restaurantData: Omit<Restaurant, 'id'> & { image: string }) => Promise<void>;
    updateRestaurant: (updatedRestaurant: Partial<Restaurant> & { id: string }) => Promise<void>;
    deleteRestaurant: (restaurantId: string) => Promise<void>;

    addBanner: (bannerData: Omit<Banner, 'id'> & { image: string }) => Promise<void>;
    updateBanner: (banner: Banner) => Promise<void>;
    deleteBanner: (bannerId: string) => Promise<void>;

    addDeliveryZone: (zone: Omit<DeliveryZone, 'id'>) => Promise<void>;
    updateDeliveryZone: (zone: DeliveryZone) => Promise<void>;
    deleteDeliveryZone: (zoneId: string) => Promise<void>;

    addCoupon: (couponData: Omit<Coupon, 'id' | 'usedCount' | 'usedBy'>) => Promise<void>;
    deleteCoupon: (couponId: string) => Promise<void>;
    
    addTelegramConfig: (configData: Omit<TelegramConfig, 'id'>) => Promise<void>;
    deleteTelegramConfig: (configId: string) => Promise<void>;

    updateOrderStatus: (orderId: string, status: OrderStatus, workerId?: string) => Promise<void>;
    deleteOrder: (orderId: string) => Promise<void>;
    placeOrder: (cart: CartItem[], address: Address, deliveryFee: number, couponCode?: string) => Promise<string>;

    addDeliveryWorker: (workerData: Pick<DeliveryWorker, 'id' | 'name'>) => Promise<void>;
    updateWorkerStatus: (workerId: string, isOnline: boolean) => Promise<void>;

    createSupportTicket: (firstMessage: Message) => Promise<void>;
    addMessageToTicket: (ticketId: string, message: Message) => Promise<void>;
    resolveSupportTicket: (ticketId: string) => Promise<void>;

    // Cart
    cart: CartItem[];
    addToCart: (product: Product, quantity: number, selectedSize?: ProductSize) => boolean;
    removeFromCart: (productId: string, sizeName?: string) => void;
    updateCartQuantity: (productId: string, quantity: number, sizeName?: string) => void;
    clearCart: () => void;
    cartTotal: number;
    
    // User Specific
    userId: string | null;
    addresses: Address[];
    addAddress: (address: Omit<Address, 'id'>) => void;
    deleteAddress: (addressId: string) => void;

    mySupportTicket: SupportTicket | null;
    startNewTicketClient: () => void;
}


export const AppContext = createContext<AppContextType | null>(null);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
    const { toast } = useToast();
    
    // All Data States
    const [products, setProducts] = useState<Product[]>([]);
    const [categoriesData, setCategoriesData] = useState<Omit<Category, 'icon'>[]>([]);
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [banners, setBanners] = useState<Banner[]>([]);
    const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
    const [allOrders, setAllOrders] = useState<Order[]>([]);
    const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [telegramConfigs, setTelegramConfigs] = useState<TelegramConfig[]>([]);
    const [deliveryWorkers, setDeliveryWorkers] = useState<DeliveryWorker[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    
    const [cart, setCart] = useState<CartItem[]>([]);
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [userId, setUserId] = useState<string|null>(null);
    const [myCurrentSupportTicket, setMySupportTicket] = useState<SupportTicket|null>(null);
    
    const [isLoading, setIsLoading] = useState(true);

    const uploadImage = async (base64: string, path: string): Promise<string> => {
        if (!base64 || !base64.startsWith('data:')) {
            return base64; // It's already a URL or invalid
        }
        const storageRef = ref(storage, path);
        const snapshot = await uploadString(storageRef, base64, 'data_url');
        return getDownloadURL(snapshot.ref);
    };

    // --- DATA FETCHING ---
    useEffect(() => {
        const fetchAllData = async () => {
            setIsLoading(true);
            try {
                const [
                    productsSnap, 
                    categoriesSnap, 
                    restaurantsSnap, 
                    bannersSnap, 
                    zonesSnap, 
                    ordersSnap, 
                    ticketsSnap, 
                    couponsSnap, 
                    telegramSnap, 
                    workersSnap
                ] = await Promise.all([
                    getDocs(collection(db, "products")),
                    getDocs(collection(db, "categories")),
                    getDocs(collection(db, "restaurants")),
                    getDocs(collection(db, "banners")),
                    getDocs(collection(db, "deliveryZones")),
                    getDocs(collection(db, "orders")),
                    getDocs(collection(db, "supportTickets")),
                    getDocs(collection(db, "coupons")),
                    getDocs(collection(db, "telegramConfigs")),
                    getDocs(collection(db, "deliveryWorkers")),
                ]);

                setProducts(productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
                setCategoriesData(categoriesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Omit<Category, 'icon'>)));
                setRestaurants(restaurantsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Restaurant)));
                setBanners(bannersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Banner)));
                setDeliveryZones(zonesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as DeliveryZone)));
                setAllOrders(ordersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                setSupportTickets(ticketsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupportTicket)));
                setCoupons(couponsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Coupon)));
                setTelegramConfigs(telegramSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TelegramConfig)));
                setDeliveryWorkers(workersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as DeliveryWorker)));

            } catch (error) {
                console.error("Error fetching initial data:", error);
                toast({ title: "فشل تحميل البيانات الأساسية", description: "حدث خطأ أثناء تحميل البيانات من قاعدة البيانات.", variant: "destructive" });
            } finally {
                setIsLoading(false);
            }
        };

        fetchAllData();
        
        let id = localStorage.getItem('speedShopUserId');
        if (!id) {
            id = uuidv4();
            localStorage.setItem('speedShopUserId', id);
        }
        setUserId(id);

        const savedCart = localStorage.getItem('speedShopCart');
        if(savedCart) setCart(JSON.parse(savedCart));

        const savedAddresses = localStorage.getItem('speedShopAddresses');
        if(savedAddresses) setAddresses(JSON.parse(savedAddresses));

    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // This should ONLY run once.

    // --- COMPUTED DATA ---
    const categories = useMemo(() => {
        const iconMap = initialCategories.reduce((acc, cat) => {
            acc[cat.iconName] = cat.icon;
            return acc;
        }, {} as {[key: string]: React.ComponentType<{ className?: string }>});
        return categoriesData.map(cat => ({
            ...cat,
            icon: iconMap[cat.iconName] || ShoppingBasket
        }));
    }, [categoriesData]);

    // --- CART ---
    useEffect(() => {
        if (!isLoading) {
            localStorage.setItem('speedShopCart', JSON.stringify(cart));
        }
    }, [cart, isLoading]);

    const addToCart = useCallback((product: Product, quantity: number, selectedSize?: ProductSize): boolean => {
        const restaurantId = product.restaurantId;
        const cartIsFromDifferentRestaurant = cart.length > 0 && cart[0].product.restaurantId !== restaurantId;

        if (cartIsFromDifferentRestaurant) {
            toast({
                title: "بدء سلة جديدة؟",
                description: "لديك منتجات من متجر آخر. هل تريد حذفها وبدء سلة جديدة من هذا المتجر؟",
                action: <ToastAction altText="نعم، ابدأ" onClick={() => {
                    const newCartItem = { product, quantity, selectedSize };
                    setCart([newCartItem]);
                }}>نعم، ابدأ</ToastAction>,
            });
            return false;
        }

        setCart(prevCart => {
            const existingItemIndex = prevCart.findIndex(item => item.product.id === product.id && item.selectedSize?.name === selectedSize?.name);
            if (existingItemIndex > -1) {
                const updatedCart = [...prevCart];
                updatedCart[existingItemIndex].quantity += quantity;
                return updatedCart;
            } else {
                return [...prevCart, { product, quantity, selectedSize }];
            }
        });
        
        return true;
    }, [cart, toast]);

    const removeFromCart = useCallback((productId: string, sizeName?: string) => {
        setCart(prevCart => prevCart.filter(item => !(item.product.id === productId && item.selectedSize?.name === sizeName)));
    }, []);

    const updateCartQuantity = useCallback((productId: string, quantity: number, sizeName?: string) => {
        if (quantity < 1) {
            removeFromCart(productId, sizeName);
            return;
        }
        setCart(prevCart => prevCart.map(item => 
            (item.product.id === productId && item.selectedSize?.name === sizeName) 
            ? { ...item, quantity } 
            : item
        ));
    }, [removeFromCart]);
    
    const clearCart = useCallback(() => setCart([]), []);

    const cartTotal = useMemo(() => cart.reduce((total, item) => {
        const price = item.selectedSize?.price ?? item.product.discountPrice ?? item.product.price;
        return total + price * item.quantity;
    }, 0), [cart]);

    // --- ADDRESSES ---
    useEffect(() => {
        if (!isLoading) {
            localStorage.setItem('speedShopAddresses', JSON.stringify(addresses));
        }
    }, [addresses, isLoading]);

    const addAddress = useCallback((address: Omit<Address, 'id'>) => {
        const newAddress = { ...address, id: `addr_${uuidv4()}` };
        setAddresses(prev => [...prev, newAddress]);
    }, []);

    const deleteAddress = useCallback((addressId: string) => {
        setAddresses(prev => prev.filter(addr => addr.id !== addressId));
    }, []);
    
    // --- SUPPORT TICKETS ---
    const mySupportTicket = useMemo(() => {
        if (myCurrentSupportTicket) return myCurrentSupportTicket;
        if (!userId) return null;
        const userTickets = supportTickets.filter(t => t.userId === userId);
        if (userTickets.length === 0) return null;
        const unresolved = userTickets.find(t => !t.isResolved);
        if (unresolved) return unresolved;
        return userTickets.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    }, [userId, supportTickets, myCurrentSupportTicket]);
    
    const startNewTicketClient = useCallback(() => setMySupportTicket(null), []);

    const addMessageToTicket = useCallback(async (ticketId: string, message: Message) => {
        await updateDoc(doc(db, "supportTickets", ticketId), { history: arrayUnion(message) });
        setSupportTickets(prev => prev.map(t => t.id === ticketId ? {...t, history: [...t.history, message]} : t));
    }, []);
    
    const createSupportTicket = useCallback(async (firstMessage: Message) => {
        if (!userId) return;
        const activeTicket = mySupportTicket;
        if (activeTicket && !activeTicket.isResolved) {
             await addMessageToTicket(activeTicket.id, firstMessage);
             return;
        }
        const userName = addresses[0]?.name || `مستخدم ${userId.substring(0, 4)}`;
        const newTicket: Omit<SupportTicket, 'id'> = { userId, userName, createdAt: new Date().toISOString(), isResolved: false, history: [firstMessage] };
        const docRef = await addDoc(collection(db, "supportTickets"), newTicket);
        const finalTicket = {id: docRef.id, ...newTicket};
        setSupportTickets(prev => [...prev, finalTicket]);
        setMySupportTicket(finalTicket);
        telegramConfigs.filter(c => c.type === 'owner').forEach(c => sendTelegramMessage(c.chatId, `*تذكرة دعم جديدة* 📩\n*من:* ${userName}\n*الرسالة:* ${firstMessage.content}`));
    }, [userId, mySupportTicket, addresses, telegramConfigs, addMessageToTicket]);

    const resolveSupportTicket = useCallback(async (ticketId: string) => {
        await updateDoc(doc(db, "supportTickets", ticketId), { isResolved: true });
        setSupportTickets(prev => prev.map(t => t.id === ticketId ? {...t, isResolved: true} : t));
    }, []);


    // --- DATA MUTATION FUNCTIONS ---
    const addProduct = useCallback(async (productData: Omit<Product, 'id'> & { image: string }) => {
        try {
            const imageUrl = await uploadImage(productData.image, `products/${uuidv4()}`);
            const docRef = await addDoc(collection(db, "products"), { ...productData, image: imageUrl });
            setProducts(prev => [{id: docRef.id, ...productData, image: imageUrl} as Product, ...prev]);
            toast({ title: "تمت إضافة المنتج بنجاح" });
        } catch (error) { console.error(error); toast({ title: "فشل إضافة المنتج", variant: "destructive" }); }
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
        } catch (error) { console.error(error); toast({ title: "فشل تحديث المنتج", variant: "destructive" }); }
    }, [toast]);

    const deleteProduct = useCallback(async (productId: string) => {
        try {
            await deleteDoc(doc(db, "products", productId));
            setProducts(prev => prev.filter(p => p.id !== productId));
            toast({ title: "تم حذف المنتج بنجاح" });
        } catch (error) { toast({ title: "فشل حذف المنتج", variant: "destructive" }); }
    }, [toast]);
    
    // --- Categories ---
    const addCategory = useCallback(async (categoryData: Omit<Category, 'id'|'icon'>) => {
        try {
            const docRef = await addDoc(collection(db, "categories"), categoryData);
            setCategoriesData(prev => [{id: docRef.id, ...categoryData}, ...prev]);
            toast({ title: "تمت إضافة القسم بنجاح" });
        } catch (error) { toast({ title: "فشل إضافة القسم", variant: "destructive" }); }
    }, [toast]);
    const updateCategory = useCallback(async (updatedCategory: Omit<Category, 'icon'|'id'> & { id: string }) => {
        try {
            const { id, ...categoryData } = updatedCategory;
            await updateDoc(doc(db, "categories", id), categoryData);
            setCategoriesData(prev => prev.map(c => c.id === id ? {...c, ...categoryData} : c));
            toast({ title: "تم تحديث القسم بنجاح" });
        } catch (error) { toast({ title: "فشل تحديث القسم", variant: "destructive" }); }
    }, [toast]);
    const deleteCategory = useCallback(async (categoryId: string) => {
        try {
            await deleteDoc(doc(db, "categories", categoryId));
            setCategoriesData(prev => prev.filter(c => c.id !== categoryId));
            toast({ title: "تم حذف القسم بنجاح" });
        } catch (error) { toast({ title: "فشل حذف القسم", variant: "destructive" }); }
    }, [toast]);

    // --- Restaurants ---
    const addRestaurant = useCallback(async (restaurantData: Omit<Restaurant, 'id'> & { image: string }) => {
        try {
            const imageUrl = await uploadImage(restaurantData.image, `restaurants/${uuidv4()}`);
            const docRef = await addDoc(collection(db, "restaurants"), { ...restaurantData, image: imageUrl });
            setRestaurants(prev => [{id: docRef.id, ...restaurantData, image: imageUrl} as Restaurant, ...prev]);
            toast({ title: "تمت إضافة المتجر بنجاح" });
        } catch (error) { toast({ title: "فشل إضافة المتجر", variant: "destructive" }); }
    }, [toast]);
    const updateRestaurant = useCallback(async (updatedRestaurant: Partial<Restaurant> & { id: string }) => {
        try {
            const { id, image, ...restaurantData } = updatedRestaurant;
            const finalData: Partial<Omit<Restaurant, 'id'>> = { ...restaurantData };
             if (image && image.startsWith('data:')) {
                finalData.image = await uploadImage(image, `restaurants/${id}`);
            } else {
                finalData.image = image;
            }
            await updateDoc(doc(db, "restaurants", id), finalData as any);
            setRestaurants(prev => prev.map(r => r.id === id ? {...r, ...finalData} as Restaurant : r));
            toast({ title: "تم تحديث المتجر بنجاح" });
        } catch (error) { console.error(error); toast({ title: "فشل تحديث المتجر", variant: "destructive" }); }
    }, [toast]);
    const deleteRestaurant = useCallback(async (restaurantId: string) => {
        try {
            await deleteDoc(doc(db, "restaurants", restaurantId));
            setRestaurants(prev => prev.filter(r => r.id !== restaurantId));
            toast({ title: "تم حذف المتجر بنجاح" });
        } catch (error) { toast({ title: "فشل حذف المتجر", variant: "destructive" }); }
    }, [toast]);
    
    // --- Banners ---
    const addBanner = useCallback(async (bannerData: Omit<Banner, 'id'> & { image: string }) => {
        try {
            const imageUrl = await uploadImage(bannerData.image, `banners/${uuidv4()}`);
            const docRef = await addDoc(collection(db, "banners"), { ...bannerData, image: imageUrl });
            setBanners(prev => [{id: docRef.id, ...bannerData, image: imageUrl} as Banner, ...prev]);
            toast({ title: "تمت إضافة البنر بنجاح" });
        } catch (error) { toast({ title: "فشل إضافة البنر", variant: "destructive" }); }
    }, [toast]);
    const updateBanner = useCallback(async (banner: Banner) => {
        try {
            const { id, image, ...bannerData } = banner;
            let finalImageUrl = image;
            if (image && image.startsWith('data:')) {
                finalImageUrl = await uploadImage(image, `banners/${id}`);
            }
            await updateDoc(doc(db, "banners", id), { ...bannerData, image: finalImageUrl });
            setBanners(prev => prev.map(b => b.id === id ? {...b, ...bannerData, image: finalImageUrl} : b));
            toast({ title: "تم تحديث البنر بنجاح" });
        } catch (error) { toast({ title: "فشل تحديث البنر", variant: "destructive" }); }
    }, [toast]);
    const deleteBanner = useCallback(async (bannerId: string) => {
        try {
            await deleteDoc(doc(db, "banners", bannerId));
            setBanners(prev => prev.filter(b => b.id !== bannerId));
            toast({ title: "تم حذف البنر بنجاح" });
        } catch (error) { toast({ title: "فشل حذف البنر", variant: "destructive" }); }
    }, [toast]);

    // --- Delivery Zones ---
    const addDeliveryZone = useCallback(async (zone: Omit<DeliveryZone, 'id'>) => {
        try {
            const docRef = await addDoc(collection(db, "deliveryZones"), zone);
            setDeliveryZones(prev => [{id: docRef.id, ...zone}, ...prev]);
            toast({ title: "تمت إضافة المنطقة بنجاح" });
        } catch (error) { toast({ title: "فشل إضافة المنطقة", variant: "destructive" }); }
    }, [toast]);
    const updateDeliveryZone = useCallback(async (zone: DeliveryZone) => {
        try {
            const { id, ...zoneData } = zone;
            await updateDoc(doc(db, "deliveryZones", id), zoneData);
            setDeliveryZones(prev => prev.map(z => z.id === id ? zone : z));
            toast({ title: "تم تحديث المنطقة بنجاح" });
        } catch (error) { toast({ title: "فشل تحديث المنطقة", variant: "destructive" }); }
    }, [toast]);
    const deleteDeliveryZone = useCallback(async (zoneId: string) => {
        try {
            await deleteDoc(doc(db, "deliveryZones", zoneId));
            setDeliveryZones(prev => prev.filter(z => z.id !== zoneId));
            toast({ title: "تم حذف المنطقة بنجاح" });
        } catch (error) { toast({ title: "فشل حذف المنطقة", variant: "destructive" }); }
    }, [toast]);

    // --- Coupons ---
    const addCoupon = useCallback(async (couponData: Omit<Coupon, 'id' | 'usedCount' | 'usedBy'>) => {
        try {
            const finalData = { ...couponData, usedCount: 0, usedBy: [] };
            const docRef = await addDoc(collection(db, "coupons"), finalData);
            setCoupons(prev => [{id: docRef.id, ...finalData} as Coupon, ...prev]);
            toast({ title: "تمت إضافة الكود بنجاح" });
        } catch (error) { toast({ title: "فشل إضافة الكود", variant: "destructive" }); }
    }, [toast]);
    const deleteCoupon = useCallback(async (couponId: string) => {
        try {
            await deleteDoc(doc(db, "coupons", couponId));
            setCoupons(prev => prev.filter(c => c.id !== couponId));
            toast({ title: "تم حذف الكود بنجاح" });
        } catch (error) { toast({ title: "فشل حذف الكود", variant: "destructive" }); }
    }, [toast]);
    
    // --- Telegram Configs ---
    const addTelegramConfig = useCallback(async (configData: Omit<TelegramConfig, 'id'>) => {
        try {
            const docRef = await addDoc(collection(db, "telegramConfigs"), configData);
            setTelegramConfigs(prev => [...prev, {id: docRef.id, ...configData} as TelegramConfig]);
            toast({ title: "تمت إضافة المعرف بنجاح" });
        } catch (error) { toast({ title: "فشل إضافة المعرف", variant: "destructive" }); }
    }, [toast]);
    const deleteTelegramConfig = useCallback(async (configId: string) => {
        try {
            await deleteDoc(doc(db, "telegramConfigs", configId));
            setTelegramConfigs(prev => prev.filter(c => c.id !== configId));
            toast({ title: "تم حذف المعرف بنجاح" });
        } catch (error) { toast({ title: "فشل حذف المعرف", variant: "destructive" }); }
    }, [toast]);

    // --- Delivery Workers ---
    const addDeliveryWorker = useCallback(async (workerData: Pick<DeliveryWorker, 'id' | 'name'>) => {
        try {
            const newWorker: DeliveryWorker = { ...workerData, isOnline: true, unfreezeProgress: 0, lastDeliveredAt: new Date().toISOString() };
            await setDoc(doc(db, 'deliveryWorkers', workerData.id), newWorker);
            setDeliveryWorkers(prev => [...prev, newWorker]);
        } catch (error) { console.error("Error adding delivery worker:", error); toast({ title: "فشل إضافة عامل توصيل", variant: "destructive" }); throw error; }
    }, [toast]);
    const updateWorkerStatus = useCallback(async (workerId: string, isOnline: boolean) => {
        try {
            await updateDoc(doc(db, 'deliveryWorkers', workerId), { isOnline });
            setDeliveryWorkers(prev => prev.map(w => w.id === workerId ? {...w, isOnline} : w));
        } catch (error) { console.error("Error updating worker status:", error); toast({ title: "فشل تحديث حالة العامل", variant: "destructive" }); }
    }, [toast]);
    
    // --- ORDERS ---
    const assignOrderToNextWorker = useCallback(async (orderId: string, excludedWorkerIds: string[] = []) => {
        try {
            await runTransaction(db, async (transaction) => {
                const orderRef = doc(db, "orders", orderId);
                const orderDoc = await transaction.get(orderRef);
                if (!orderDoc.exists()) throw new Error("Order does not exist.");
                const orderData = orderDoc.data() as Order;

                // Fetch workers inside transaction to get the latest state
                const currentWorkersSnapshot = await getDocs(collection(db, "deliveryWorkers"));
                const allCurrentWorkers = currentWorkersSnapshot.docs.map(d => ({id: d.id, ...d.data()}) as DeliveryWorker);
                
                const allOrdersSnapshot = await getDocs(collection(db, "orders"));
                const allCurrentOrders = allOrdersSnapshot.docs.map(d => ({id: d.id, ...d.data()}) as Order);

                const completedOrdersByWorker: {[workerId: string]: number} = {};
                allCurrentOrders.forEach(o => {
                    if (o.status === 'delivered' && o.deliveryWorkerId) {
                        completedOrdersByWorker[o.deliveryWorkerId] = (completedOrdersByWorker[o.deliveryWorkerId] || 0) + 1;
                    }
                });
                const busyWorkerIds = new Set(allCurrentOrders.filter(o => ['confirmed', 'preparing', 'on_the_way'].includes(o.status)).map(o => o.deliveryWorkerId).filter((id): id is string => !!id));
                
                const availableWorkers = allCurrentWorkers.filter(w => w.isOnline && !busyWorkerIds.has(w.id) && !excludedWorkerIds.includes(w.id));

                if (availableWorkers.length === 0) {
                    transaction.update(orderRef, { status: 'unassigned' as OrderStatus, assignedToWorkerId: null, assignmentTimestamp: null, rejectedBy: excludedWorkerIds });
                    return;
                }

                availableWorkers.sort((a,b) => (completedOrdersByWorker[a.id] || 0) - (completedOrdersByWorker[b.id] || 0));
                const nextWorker = availableWorkers[0];
                transaction.update(orderRef, { status: 'pending_assignment' as OrderStatus, assignedToWorkerId: nextWorker.id, assignmentTimestamp: new Date().toISOString(), rejectedBy: excludedWorkerIds });
                
                const workerConfig = telegramConfigs.find(c => c.type === 'worker' && c.workerId === nextWorker.id);
                if (workerConfig) {
                    sendTelegramMessage(workerConfig.chatId, `*لديك طلب جديد في الانتظار* 🛵\n*رقم الطلب:* \`${orderId.substring(0, 6)}\`\n*المنطقة:* ${orderData.address.deliveryZone}\n*ربحك من التوصيل:* ${formatCurrency(orderData.deliveryFee)}`);
                }
            });

            const updatedOrderSnap = await getDoc(doc(db, "orders", orderId));
            if(updatedOrderSnap.exists()){
                const updatedOrder = { id: updatedOrderSnap.id, ...updatedOrderSnap.data() } as Order;
                setAllOrders(prev => prev.map(o => o.id === orderId ? updatedOrder : o));
            }
        } catch (error) {
            console.error("Failed to assign order to next worker:", error);
            toast({title: "فشل تعيين الطلب", description: "حدث خطأ أثناء محاولة تعيين الطلب لعامل آخر.", variant: "destructive"});
        }
    }, [telegramConfigs, toast]);
    
    const placeOrder = useCallback(async (currentCart: CartItem[], address: Address, deliveryFee: number, couponCode?: string) => {
        if (!userId) throw new Error("User ID not found.");
        if (currentCart.length === 0) throw new Error("السلة فارغة.");
        
        const newOrderRef = doc(collection(db, "orders"));
        await runTransaction(db, async (transaction) => {
            const productRefsAndItems = currentCart.map(item => ({ ref: doc(db, "products", item.product.id), item: item }));
            
            let couponSnap: any = null;
            let couponData: Coupon | null = null;
            if (couponCode?.trim()) {
                const couponQuery = query(collection(db, "coupons"), where("code", "==", couponCode.trim().toUpperCase()));
                const couponQuerySnap = await getDocs(couponQuery);
                if (!couponQuerySnap.empty) {
                    couponSnap = couponQuerySnap.docs[0];
                    couponData = { id: couponSnap.id, ...couponSnap.data() } as Coupon;
                } else { throw new Error(`كود الخصم "${couponCode}" غير صالح.`); }
            }

            if (couponData && couponSnap) {
                if (couponData.usedCount >= couponData.maxUses) throw new Error("تم استخدام هذا الكود بالكامل.");
                if (couponData.usedBy?.includes(userId)) throw new Error("لقد استخدمت هذا الكود من قبل.");
            }

            let calculatedProfit = 0;

            for (const { ref, item } of productRefsAndItems) {
                const productDoc = await transaction.get(ref);
                if (!productDoc.exists()) throw new Error(`منتج "${item.product.name}" لم يعد متوفرًا.`);
                const serverProduct = productDoc.data() as Product;
                
                const itemPrice = item.selectedSize?.price ?? serverProduct.discountPrice ?? serverProduct.price;
                const wholesalePrice = serverProduct.wholesalePrice ?? 0;
                if(itemPrice < wholesalePrice) throw new Error(`سعر بيع المنتج ${serverProduct.name} أقل من سعر الجملة.`);
                calculatedProfit += (itemPrice - wholesalePrice) * item.quantity;

                if (item.selectedSize) {
                    const size = serverProduct.sizes?.find(s => s.name === item.selectedSize!.name);
                    if (!size || size.stock < item.quantity) throw new Error(`الكمية المطلوبة من "${item.product.name} (${item.selectedSize.name})" غير متوفرة.`);
                    const newSizes = serverProduct.sizes?.map(s => s.name === item.selectedSize!.name ? { ...s, stock: s.stock - item.quantity } : s) ?? [];
                    transaction.update(ref, { sizes: newSizes });
                } else {
                    if ((serverProduct.stock ?? 0) < item.quantity) throw new Error(`الكمية المطلوبة من "${item.product.name}" غير متوفرة.`);
                    transaction.update(ref, { stock: (serverProduct.stock || 0) - item.quantity });
                }
            }
            
            let discountAmount = 0;
            let appliedCouponInfo: Order['appliedCoupon'] = null;
            if (couponData && couponSnap) {
                discountAmount = couponData.discountValue;
                appliedCouponInfo = { code: couponData.code, discountAmount: discountAmount };
                transaction.update(couponSnap.ref, { usedCount: couponData.usedCount + 1, usedBy: arrayUnion(userId) });
            }

            const subtotal = currentCart.reduce((total, item) => {
                const price = item.selectedSize?.price ?? item.product.discountPrice ?? item.product.price;
                return total + price * item.quantity;
            }, 0);
            const finalTotal = Math.max(0, subtotal - discountAmount) + deliveryFee;
            
            const newOrderData: Omit<Order, 'id'> = { userId, items: currentCart, total: finalTotal, date: new Date().toISOString(), status: 'unassigned', estimatedDelivery: new Date(Date.now() + 45 * 60 * 1000).toISOString(), address, profit: calculatedProfit, deliveryFee, deliveryWorkerId: null, deliveryWorker: null, assignedToWorkerId: null, assignmentTimestamp: null, rejectedBy: [], appliedCoupon: appliedCouponInfo, };
            transaction.set(newOrderRef, newOrderData);
        });
        
        clearCart();
        const newOrderSnap = await getDoc(newOrderRef);
        const newOrder = { id: newOrderSnap.id, ...newOrderSnap.data() } as Order;
        
        setAllOrders(prev => [newOrder, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        telegramConfigs.filter(c => c.type === 'owner').forEach(c => {
            sendTelegramMessage(c.chatId, `*طلب جديد!* 🎉\n*رقم الطلب:* \`${newOrder.id.substring(0, 6)}\`\n*الزبون:* ${newOrder.address.name}\n*المنطقة:* ${newOrder.address.deliveryZone}\n*المبلغ:* ${formatCurrency(newOrder.total)}`);
        });
        await assignOrderToNextWorker(newOrder.id, []);
        return newOrderRef.id;

    }, [userId, clearCart, telegramConfigs, assignOrderToNextWorker]);

    const updateOrderStatus = useCallback(async (orderId: string, status: OrderStatus, workerId?: string) => {
        try {
            await runTransaction(db, async (transaction) => {
                const orderRef = doc(db, "orders", orderId);
                const orderDoc = await transaction.get(orderRef);

                if (!orderDoc.exists()) throw new Error("لم يتم العثور على الطلب.");
                const currentOrder = orderDoc.data() as Order;
                const updateData: any = { status };

                if (status === 'confirmed' && workerId) {
                    if (currentOrder.status !== 'pending_assignment' || currentOrder.assignedToWorkerId !== workerId) throw new Error("لم يعد هذا الطلب متاحًا لك.");
                    const workerDocRef = doc(db, "deliveryWorkers", workerId);
                    const workerDoc = await transaction.get(workerDocRef);
                    if (!workerDoc.exists()) throw new Error("لم يتم العثور على عامل التوصيل.");
                    
                    const workerData = workerDoc.data() as DeliveryWorker;
                    updateData.deliveryWorkerId = workerId;
                    updateData.deliveryWorker = { id: workerId, name: workerData.name };
                }
                
                if (status === 'unassigned' && workerId) {
                    updateData.rejectedBy = arrayUnion(workerId);
                }
                
                if (status !== 'pending_assignment') {
                    updateData.assignedToWorkerId = null;
                    updateData.assignmentTimestamp = null;
                    if (status !== 'unassigned') updateData.rejectedBy = [];
                }

                transaction.update(orderRef, updateData);

                if (status === 'delivered' && workerId) {
                    const workerDocRef = doc(db, "deliveryWorkers", workerId);
                    const workerDoc = await transaction.get(workerDocRef);
                    if (workerDoc.exists()) {
                        const worker = workerDoc.data() as DeliveryWorker;
                        const now = new Date();
                        
                        const myDeliveredOrders = allOrders.filter(o => o.deliveryWorkerId === workerId && o.status === 'delivered').length + 1;

                        const { isFrozen } = getWorkerLevel(worker, myDeliveredOrders, now);
                        let workerUpdate: Partial<DeliveryWorker> = {};
                        if (isFrozen) {
                            const unfreezeProgress = (worker.unfreezeProgress || 0) + 1;
                            workerUpdate = (unfreezeProgress >= 10) ? { lastDeliveredAt: now.toISOString(), unfreezeProgress: 0 } : { unfreezeProgress };
                        } else {
                            workerUpdate = { lastDeliveredAt: now.toISOString(), unfreezeProgress: 0 };
                        }
                        transaction.update(workerDocRef, workerUpdate);
                    }
                }
            });

            const updatedOrderSnap = await getDoc(doc(db, "orders", orderId));
            if (!updatedOrderSnap.exists()) return;
            const updatedOrder = { id: updatedOrderSnap.id, ...updatedOrderSnap.data() } as Order;

            setAllOrders(prev => prev.map(o => o.id === orderId ? updatedOrder : o));
            
            if (status === 'delivered' && workerId) {
                const updatedWorkerSnap = await getDoc(doc(db, "deliveryWorkers", workerId));
                if (updatedWorkerSnap.exists()) {
                    const updatedWorker = { id: updatedWorkerSnap.id, ...updatedWorkerSnap.data() } as DeliveryWorker;
                    setDeliveryWorkers(prev => prev.map(w => w.id === workerId ? updatedWorker : w));
                }
            }
            
            if (status === 'unassigned' && workerId) {
                await assignOrderToNextWorker(orderId, updatedOrder.rejectedBy);
            }
        } catch (error: any) {
            console.error("Failed to update order status:", error);
            toast({title: "فشل تحديث الطلب", description: error.message, variant: "destructive"});
            throw error;
        }

    }, [toast, allOrders, assignOrderToNextWorker]);

    const deleteOrder = useCallback(async (orderId: string) => {
        try {
            await deleteDoc(doc(db, "orders", orderId));
            setAllOrders(prev => prev.filter(o => o.id !== orderId));
            toast({ title: "تم حذف الطلب بنجاح" });
        } catch (error) { toast({ title: "فشل حذف الطلب", variant: "destructive" }); }
    }, [toast]);
    
    const value = {
        products, categories, restaurants, banners, deliveryZones, allOrders, supportTickets, coupons, telegramConfigs, deliveryWorkers, allUsers,
        isLoading,
        addProduct, updateProduct, deleteProduct,
        addCategory, updateCategory, deleteCategory,
        addRestaurant, updateRestaurant, deleteRestaurant,
        addBanner, updateBanner, deleteBanner,
        addDeliveryZone, updateDeliveryZone, deleteDeliveryZone,
        addCoupon, deleteCoupon,
        addTelegramConfig, deleteTelegramConfig,
        updateOrderStatus, deleteOrder, placeOrder,
        addDeliveryWorker, updateWorkerStatus,
        createSupportTicket, addMessageToTicket, resolveSupportTicket,
        cart, addToCart, removeFromCart, updateCartQuantity, clearCart, cartTotal,
        userId, addresses, addAddress, deleteAddress,
        mySupportTicket, startNewTicketClient,
    };
    
    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
