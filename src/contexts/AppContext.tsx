
"use client";

import React, { createContext, useEffect, useState, useCallback, useMemo } from 'react';
import type { Order, OrderStatus, SupportTicket, Message, TelegramConfig, DeliveryWorker, Coupon, Product, ProductSize, Category, Banner, DeliveryZone, CartItem, Restaurant, Address, User } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc, deleteDoc, addDoc, collection, runTransaction, getDoc, arrayUnion, getDocs, writeBatch, setDoc, query, where, DocumentReference, onSnapshot } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { calculateDeliveryFee, calculateDistance, formatCurrency } from '@/lib/utils';
import { getWorkerLevel } from '@/lib/workerLevels';
import { categories as initialCategories } from '@/lib/mock-data';
import { ShoppingBasket } from 'lucide-react';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { useCart } from '@/hooks/useCart.tsx';
import { useAddresses } from '@/hooks/useAddresses';


type AppContextType = {
    // Data
    products: Product[];
    restaurants: Restaurant[];
    categories: Category[];
    banners: Banner[];
    deliveryZones: DeliveryZone[];
    coupons: Coupon[];
    allOrders: Order[];
    supportTickets: SupportTicket[];
    telegramConfigs: TelegramConfig[];
    deliveryWorkers: DeliveryWorker[];
    allUsers: User[];
    isLoading: boolean;
    
    // Auth-like
    userId: string | null;

    // Addresses
    addresses: ReturnType<typeof useAddresses>['addresses'];
    addAddress: ReturnType<typeof useAddresses>['addAddress'];
    deleteAddress: ReturnType<typeof useAddresses>['deleteAddress'];
    
    // Cart
    cart: CartItem[];
    addToCart: ReturnType<typeof useCart>['addToCart'];
    removeFromCart: ReturnType<typeof useCart>['removeFromCart'];
    updateCartQuantity: ReturnType<typeof useCart>['updateCartQuantity'];
    clearCart: ReturnType<typeof useCart>['clearCart'];
    cartTotal: number;
    placeOrder: (address: any, couponCode?: string) => Promise<string | void>;

    // Firestore Write Operations
    addProduct: (productData: Omit<Product, 'id'> & { image: string }) => Promise<void>;
    updateProduct: (updatedProduct: Partial<Product> & { id: string }) => Promise<void>;
    deleteProduct: (productId: string) => Promise<void>;
    addCategory: (categoryData: Omit<Category, 'id'|'icon'>) => Promise<void>;
    updateCategory: (updatedCategory: Omit<Category, 'icon'|'id'> & { id: string }) => Promise<void>;
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
    updateOrderStatus: (orderId: string, status: OrderStatus, workerId?: string) => Promise<void>;
    deleteOrder: (orderId: string) => Promise<void>;
    createSupportTicket: (firstMessage: Message) => Promise<void>;
    addMessageToTicket: (ticketId: string, message: Message) => Promise<void>;
    resolveSupportTicket: (ticketId: string) => Promise<void>;
    addTelegramConfig: (config: Omit<TelegramConfig, 'id'>) => Promise<void>;
    deleteTelegramConfig: (configId: string) => Promise<void>;
    addDeliveryWorker: (workerData: Pick<DeliveryWorker, 'id' | 'name'>) => Promise<void>;
    updateWorkerStatus: (workerId: string, isOnline: boolean) => Promise<void>;
    
    // Client-side computed values
    mySupportTicket: SupportTicket | null;
    startNewTicketClient: () => void;
};


export const AppContext = createContext<AppContextType | null>(null);

const uploadImage = async (base64: string, path: string): Promise<string> => {
    if (!base64 || !base64.startsWith('data:')) {
        return base64; // It's already a URL or invalid
    }
    const storageRef = ref(storage, path);
    const snapshot = await uploadString(storageRef, base64, 'data_url');
    return getDownloadURL(snapshot.ref);
};

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [userId, setUserId] = useState<string|null>(null);
    
    // All data states
    const [products, setProducts] = useState<Product[]>([]);
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [categoriesData, setCategoriesData] = useState<Omit<Category, 'icon'>[]>([]);
    const [banners, setBanners] = useState<Banner[]>([]);
    const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [allOrders, setAllOrders] = useState<Order[]>([]);
    const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
    const [telegramConfigs, setTelegramConfigs] = useState<TelegramConfig[]>([]);
    const [deliveryWorkers, setDeliveryWorkers] = useState<DeliveryWorker[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);

    const { addresses, addAddress, deleteAddress, setAddresses } = useAddresses();
    const { cart, addToCart, removeFromCart, updateCartQuantity, clearCart, cartTotal, setCart } = useCart();
    
    // This useEffect will run only once on mount, fetching all data.
    useEffect(() => {
        const fetchAllData = async () => {
            setIsLoading(true);
            try {
                const collectionsToFetch = {
                    products: collection(db, "products"),
                    restaurants: collection(db, "restaurants"),
                    categories: collection(db, "categories"),
                    banners: collection(db, "banners"),
                    deliveryZones: collection(db, "deliveryZones"),
                    coupons: collection(db, "coupons"),
                    allOrders: collection(db, "orders"),
                    supportTickets: collection(db, "supportTickets"),
                    telegramConfigs: collection(db, "telegramConfigs"),
                    deliveryWorkers: collection(db, "deliveryWorkers"),
                };

                const results = await Promise.all(
                    Object.values(collectionsToFetch).map(col => getDocs(col))
                );

                const [
                    productsSnap, restaurantsSnap, categoriesSnap, bannersSnap, 
                    deliveryZonesSnap, couponsSnap, allOrdersSnap, supportTicketsSnap,
                    telegramConfigsSnap, deliveryWorkersSnap
                ] = results;

                setProducts(productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[]);
                setRestaurants(restaurantsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Restaurant[]);
                setCategoriesData(categoriesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Omit<Category, 'icon'>[]);
                setBanners(bannersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Banner[]);
                setDeliveryZones(deliveryZonesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as DeliveryZone[]);
                setCoupons(couponsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Coupon[]);
                setAllOrders(allOrdersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                setSupportTickets(supportTicketsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupportTicket)));
                setTelegramConfigs(telegramConfigsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TelegramConfig[]);
                setDeliveryWorkers(deliveryWorkersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as DeliveryWorker)));

            } catch (error) {
                console.error("Failed to fetch initial data:", error);
                toast({ title: "فشل تحميل البيانات", description: "لا يمكن الاتصال بقاعدة البيانات.", variant: "destructive" });
            } finally {
                setIsLoading(false);
            }
        };
        
        let id = localStorage.getItem('speedShopUserId');
        if (!id) {
            id = uuidv4();
            localStorage.setItem('speedShopUserId', id);
        }
        setUserId(id);
        
        fetchAllData();
    }, [toast]);
    
    const placeOrder = async (address: Address, couponCode?: string): Promise<string | void> => {
        if (!userId) throw new Error("User ID not found.");
        if (cart.length === 0) throw new Error("السلة فارغة.");
        
        const currentCart = [...cart];
        
        try {
            const newOrderRef = doc(collection(db, "orders"));
            await runTransaction(db, async (transaction) => {
                const productRefsAndItems = currentCart.map(item => ({ ref: doc(db, "products", item.product.id), item: item }));
                const productSnaps = await Promise.all(productRefsAndItems.map(p => transaction.get(p.ref)));

                const cartRestaurantId = productSnaps[0].data()?.restaurantId;
                if (!cartRestaurantId) throw new Error("لم يتم العثور على المتجر للطلب.");
                const cartRestaurantSnap = await transaction.get(doc(db, "restaurants", cartRestaurantId));
                if (!cartRestaurantSnap.exists()) throw new Error("لم يتم العثور على المتجر للطلب.");
                const cartRestaurant = cartRestaurantSnap.data() as Restaurant;

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

                for (let i = 0; i < productSnaps.length; i++) {
                    const productDoc = productSnaps[i];
                    const { item } = productRefsAndItems[i];
                    if (!productDoc.exists()) throw new Error(`منتج "${item.product.name}" لم يعد متوفرًا.`);
                    const serverProduct = productDoc.data() as Product;
                    
                    const itemPrice = item.selectedSize?.price ?? serverProduct.discountPrice ?? serverProduct.price;
                    const wholesalePrice = serverProduct.wholesalePrice ?? 0;
                    if(itemPrice < wholesalePrice) throw new Error(` سعر بيع المنتج ${serverProduct.name} أقل من سعر الجملة.`);

                    if (item.selectedSize) {
                        const size = serverProduct.sizes?.find(s => s.name === item.selectedSize!.name);
                        if (!size || size.stock < item.quantity) throw new Error(`الكمية المطلوبة من "${item.product.name} (${item.selectedSize.name})" غير متوفرة.`);
                    } else if ((serverProduct.stock ?? 0) < item.quantity) throw new Error(`الكمية المطلوبة من "${item.product.name}" غير متوفرة.`);
                }
                
                let discountAmount = 0;
                let appliedCouponInfo: Order['appliedCoupon'] = null;
                if (couponData && couponSnap) {
                    if (couponData.usedCount >= couponData.maxUses) throw new Error("تم استخدام هذا الكود بالكامل.");
                    if (couponData.usedBy?.includes(userId)) throw new Error("لقد استخدمت هذا الكود من قبل.");
                    discountAmount = couponData.discountValue;
                    appliedCouponInfo = { code: couponData.code, discountAmount: discountAmount };
                }

                const profit = productSnaps.reduce((acc, productSnap, index) => {
                    const serverProduct = productSnap.data() as Product;
                    if (!serverProduct) return acc; // Should not happen
                    const item = currentCart[index];
                    const itemPrice = item.selectedSize?.price ?? serverProduct.discountPrice ?? serverProduct.price;
                    const wholesalePrice = serverProduct.wholesalePrice || 0;
                    return acc + ((itemPrice - wholesalePrice) * item.quantity);
                }, 0);

                const distance = (address.latitude && address.longitude && cartRestaurant?.latitude && cartRestaurant?.longitude) ? calculateDistance(address.latitude, address.longitude, cartRestaurant.latitude, cartRestaurant.longitude) : 0;
                const deliveryFee = calculateDeliveryFee(distance);
                const subtotal = currentCart.reduce((total, item) => {
                    const price = item.selectedSize?.price ?? item.product.discountPrice ?? item.product.price;
                    return total + price * item.quantity;
                }, 0);
                const finalTotal = Math.max(0, subtotal - discountAmount) + deliveryFee;
                
                const newOrderData: Omit<Order, 'id'> = { userId, items: currentCart, total: finalTotal, date: new Date().toISOString(),
                    status: 'unassigned', estimatedDelivery: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
                    address, profit, deliveryFee, deliveryWorkerId: null, deliveryWorker: null, assignedToWorkerId: null,
                    assignmentTimestamp: null, rejectedBy: [], appliedCoupon: appliedCouponInfo,
                };
                transaction.set(newOrderRef, newOrderData);

                productSnaps.forEach((productSnap, index) => {
                    const productRef = productSnap.ref;
                    const serverProduct = productSnap.data() as Product;
                    const item = currentCart[index];
                    if (item.selectedSize) {
                        const newSizes = serverProduct.sizes?.map(s => s.name === item.selectedSize!.name ? { ...s, stock: s.stock - item.quantity } : s) ?? [];
                        transaction.update(productRef, { sizes: newSizes });
                    } else {
                        transaction.update(productRef, { stock: (serverProduct.stock || 0) - item.quantity });
                    }
                });
                
                if (couponSnap && couponData) {
                    transaction.update(couponSnap.ref, { usedCount: couponData.usedCount + 1, usedBy: arrayUnion(userId) });
                }
            });
            
            clearCart();
            // Optimistically update the UI
            const newOrderData = (await getDoc(newOrderRef)).data() as Omit<Order, 'id'>;
            setAllOrders(prev => [{ id: newOrderRef.id, ...newOrderData } as Order, ...prev]);

            toast({ title: "تم استلام طلبك بنجاح!" });
            return newOrderRef.id;

        } catch (error: any) {
            console.error("Order placement failed:", error);
            toast({ title: "فشل إرسال الطلب", description: error.message, variant: "destructive" });
            throw error;
        }
    };
    
    const iconMap = useMemo(() => initialCategories.reduce((acc, cat) => {
        acc[cat.iconName] = cat.icon;
        return acc;
    }, {} as {[key: string]: React.ComponentType<{ className?: string }>}), []);

    const categories = useMemo(() => {
        return categoriesData.map(cat => ({
            ...cat,
            icon: iconMap[cat.iconName] || ShoppingBasket
        }));
    }, [categoriesData, iconMap]);
    
    const [myCurrentSupportTicket, setMySupportTicket] = useState<SupportTicket|null>(null);

    const mySupportTicket = useMemo(() => {
        if (myCurrentSupportTicket) return myCurrentSupportTicket;
        if (!userId) return null;
        const userTickets = supportTickets.filter(t => t.userId === userId);
        if (userTickets.length === 0) return null;
        const unresolved = userTickets.find(t => !t.isResolved);
        if (unresolved) return unresolved;
        return userTickets.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    }, [userId, supportTickets, myCurrentSupportTicket]);
    
    const startNewTicketClient = () => setMySupportTicket(null);


    const addProduct = async (productData: Omit<Product, 'id'> & { image: string }) => {
        try {
            const imageUrl = await uploadImage(productData.image, `products/${uuidv4()}`);
            const docRef = await addDoc(collection(db, "products"), { ...productData, image: imageUrl });
            setProducts(prev => [{id: docRef.id, ...productData, image: imageUrl} as Product, ...prev]);
            toast({ title: "تمت إضافة المنتج بنجاح" });
        } catch (error) { toast({ title: "فشل إضافة المنتج", variant: "destructive" }); }
    };
    const updateProduct = async (updatedProduct: Partial<Product> & { id: string }) => {
        try {
            const { id, ...productData } = updatedProduct;
            let finalData: Partial<Product> = {...productData};
            if (productData.image && productData.image.startsWith('data:')) {
                finalData.image = await uploadImage(productData.image, `products/${id}`);
            }
            await updateDoc(doc(db, "products", id), finalData);
            setProducts(prev => prev.map(p => p.id === id ? {...p, ...finalData} as Product : p));
            toast({ title: "تم تحديث المنتج بنجاح" });
        } catch (error) { toast({ title: "فشل تحديث المنتج", variant: "destructive" }); }
    };
    const deleteProduct = async (productId: string) => {
        try {
            await deleteDoc(doc(db, "products", productId));
            setProducts(prev => prev.filter(p => p.id !== productId));
            toast({ title: "تم حذف المنتج بنجاح" });
        } catch (error) { toast({ title: "فشل حذف المنتج", variant: "destructive" }); }
    };

    const addCategory = async (categoryData: Omit<Category, 'id'|'icon'>) => {
        try {
            const docRef = await addDoc(collection(db, "categories"), categoryData);
            setCategoriesData(prev => [{id: docRef.id, ...categoryData}, ...prev]);
            toast({ title: "تمت إضافة القسم بنجاح" });
        } catch (error) { toast({ title: "فشل إضافة القسم", variant: "destructive" }); }
    };
    const updateCategory = async (updatedCategory: Omit<Category, 'icon'|'id'> & { id: string }) => {
        try {
            const { id, ...categoryData } = updatedCategory;
            await updateDoc(doc(db, "categories", id), categoryData);
            setCategoriesData(prev => prev.map(c => c.id === id ? {...c, ...categoryData} : c));
            toast({ title: "تم تحديث القسم بنجاح" });
        } catch (error) { toast({ title: "فشل تحديث القسم", variant: "destructive" }); }
    };
    const deleteCategory = async (categoryId: string) => {
        try {
            await deleteDoc(doc(db, "categories", categoryId));
            setCategoriesData(prev => prev.filter(c => c.id !== categoryId));
            toast({ title: "تم حذف القسم بنجاح" });
        } catch (error) { toast({ title: "فشل حذف القسم", variant: "destructive" }); }
    };
    
    const addRestaurant = async (restaurantData: Omit<Restaurant, 'id'> & { image: string }) => {
        try {
            const imageUrl = await uploadImage(restaurantData.image, `restaurants/${uuidv4()}`);
            const docRef = await addDoc(collection(db, "restaurants"), { ...restaurantData, image: imageUrl });
            setRestaurants(prev => [{id: docRef.id, ...restaurantData, image: imageUrl} as Restaurant, ...prev]);
            toast({ title: "تمت إضافة المتجر بنجاح" });
        } catch (error) { toast({ title: "فشل إضافة المتجر", variant: "destructive" }); }
    };
    const updateRestaurant = async (updatedRestaurant: Partial<Restaurant> & { id: string }) => {
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
    };
    const deleteRestaurant = async (restaurantId: string) => {
        try {
            await deleteDoc(doc(db, "restaurants", restaurantId));
            setRestaurants(prev => prev.filter(r => r.id !== restaurantId));
            toast({ title: "تم حذف المتجر بنجاح" });
        } catch (error) { toast({ title: "فشل حذف المتجر", variant: "destructive" }); }
    };

    const addBanner = async (bannerData: Omit<Banner, 'id'> & { image: string }) => {
        try {
            const imageUrl = await uploadImage(bannerData.image, `banners/${uuidv4()}`);
            const docRef = await addDoc(collection(db, "banners"), { ...bannerData, image: imageUrl });
            setBanners(prev => [{id: docRef.id, ...bannerData, image: imageUrl} as Banner, ...prev]);
            toast({ title: "تمت إضافة البنر بنجاح" });
        } catch (error) { toast({ title: "فشل إضافة البنر", variant: "destructive" }); }
    };
    const updateBanner = async (banner: Banner) => {
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
    };
    const deleteBanner = async (bannerId: string) => {
        try {
            await deleteDoc(doc(db, "banners", bannerId));
            setBanners(prev => prev.filter(b => b.id !== bannerId));
            toast({ title: "تم حذف البنر بنجاح" });
        } catch (error) { toast({ title: "فشل حذف البنر", variant: "destructive" }); }
    };

    const addDeliveryZone = async (zone: Omit<DeliveryZone, 'id'>) => {
        try {
            const docRef = await addDoc(collection(db, "deliveryZones"), zone);
            setDeliveryZones(prev => [{id: docRef.id, ...zone}, ...prev]);
            toast({ title: "تمت إضافة المنطقة بنجاح" });
        } catch (error) { toast({ title: "فشل إضافة المنطقة", variant: "destructive" }); }
    };
    const updateDeliveryZone = async (zone: DeliveryZone) => {
        try {
            const { id, ...zoneData } = zone;
            await updateDoc(doc(db, "deliveryZones", id), zoneData);
            setDeliveryZones(prev => prev.map(z => z.id === id ? zone : z));
            toast({ title: "تم تحديث المنطقة بنجاح" });
        } catch (error) { toast({ title: "فشل تحديث المنطقة", variant: "destructive" }); }
    };
    const deleteDeliveryZone = async (zoneId: string) => {
        try {
            await deleteDoc(doc(db, "deliveryZones", zoneId));
            setDeliveryZones(prev => prev.filter(z => z.id !== zoneId));
            toast({ title: "تم حذف المنطقة بنجاح" });
        } catch (error) { toast({ title: "فشل حذف المنطقة", variant: "destructive" }); }
    };

    const addCoupon = async (couponData: Omit<Coupon, 'id' | 'usedCount' | 'usedBy'>) => {
        try {
            const finalData = { ...couponData, usedCount: 0, usedBy: [] };
            const docRef = await addDoc(collection(db, "coupons"), finalData);
            setCoupons(prev => [{id: docRef.id, ...finalData}, ...prev] as Coupon[]);
            toast({ title: "تمت إضافة الكود بنجاح" });
        } catch (error) { toast({ title: "فشل إضافة الكود", variant: "destructive" }); }
    };
    const deleteCoupon = async (couponId: string) => {
        try {
            await deleteDoc(doc(db, "coupons", couponId));
            setCoupons(prev => prev.filter(c => c.id !== couponId));
            toast({ title: "تم حذف الكود بنجاح" });
        } catch (error) { toast({ title: "فشل حذف الكود", variant: "destructive" }); }
    };

    const addDeliveryWorker = async (workerData: Pick<DeliveryWorker, 'id' | 'name'>) => {
        const newWorker: DeliveryWorker = { ...workerData, id: workerData.id, isOnline: true, unfreezeProgress: 0, lastDeliveredAt: new Date().toISOString() };
        await setDoc(doc(db, 'deliveryWorkers', workerData.id), newWorker);
        setDeliveryWorkers(prev => [...prev, newWorker]);
    };
    const updateWorkerStatus = async (workerId: string, isOnline: boolean) => {
        const worker = deliveryWorkers.find(w => w.id === workerId);
        if (!worker || worker.isOnline === isOnline) return;
        await updateDoc(doc(db, 'deliveryWorkers', workerId), { isOnline });
        setDeliveryWorkers(prev => prev.map(w => w.id === workerId ? {...w, isOnline} : w));
    };

    const sendTelegramMessage = useCallback(async (chatId: string, message: string) => {
        const botToken = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;
        if (!botToken || !chatId) return;
        try {
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'Markdown' }) });
        } catch (error) { console.error(`Failed to send Telegram message to ${chatId}:`, error); }
    }, []);
    
    const addTelegramConfig = async (configData: Omit<TelegramConfig, 'id'>) => {
        const docRef = await addDoc(collection(db, "telegramConfigs"), configData);
        setTelegramConfigs(prev => [...prev, {id: docRef.id, ...configData} as TelegramConfig]);
    };
    const deleteTelegramConfig = async (configId: string) => {
        await deleteDoc(doc(db, "telegramConfigs", configId));
        setTelegramConfigs(prev => prev.filter(c => c.id !== configId));
    };

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
        setMySupportTicket({id: docRef.id, ...newTicket});
        telegramConfigs.filter(c => c.type === 'owner').forEach(c => sendTelegramMessage(c.chatId, `*تذكرة دعم جديدة* 📩\n*من:* ${userName}\n*الرسالة:* ${firstMessage.content}`));
    }, [userId, mySupportTicket, addresses, telegramConfigs, sendTelegramMessage]);

    const addMessageToTicket = async (ticketId: string, message: Message) => {
        await updateDoc(doc(db, "supportTickets", ticketId), { history: arrayUnion(message) });
        setSupportTickets(prev => prev.map(t => t.id === ticketId ? {...t, history: [...t.history, message]} : t));
    };
    const resolveSupportTicket = async (ticketId: string) => {
        await updateDoc(doc(db, "supportTickets", ticketId), { isResolved: true });
        setSupportTickets(prev => prev.map(t => t.id === ticketId ? {...t, isResolved: true} : t));
    };

    const deleteOrder = async (orderId: string) => {
        await deleteDoc(doc(db, "orders", orderId));
        setAllOrders(prev => prev.filter(o => o.id !== orderId));
    };

    const assignOrderToNextWorker = useCallback(async (orderId: string, excludedWorkerIds: string[] = []) => {
        try {
            await runTransaction(db, async (transaction) => {
                const orderRef = doc(db, "orders", orderId);
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
                
                // Side effect outside transaction
                const workerConfig = telegramConfigs.find(c => c.type === 'worker' && c.workerId === nextWorker.id);
                const orderData = allCurrentOrders.find(o => o.id === orderId); 
                if (workerConfig && orderData) {
                    sendTelegramMessage(workerConfig.chatId, `*لديك طلب جديد في الانتظار* 🛵\n*رقم الطلب:* \`${orderId.substring(0, 6)}\`\n*المنطقة:* ${orderData.address.deliveryZone}\n*ربحك من التوصيل:* ${formatCurrency(orderData.deliveryFee)}`);
                }
            });
            // After transaction, refresh local data
            const updatedOrders = (await getDocs(collection(db, "orders"))).docs.map(doc => ({id: doc.id, ...doc.data()}) as Order);
            setAllOrders(updatedOrders.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));

        } catch (error) {
            console.error("Failed to assign order to next worker:", error);
            toast({title: "فشل تعيين الطلب", description: "حدث خطأ أثناء محاولة تعيين الطلب لعامل آخر.", variant: "destructive"});
        }
    }, [telegramConfigs, sendTelegramMessage, toast]);

    const updateOrderStatus = useCallback(async (orderId: string, status: OrderStatus, workerId?: string) => {
        try {
            await runTransaction(db, async (transaction) => {
                const orderDocRef = doc(db, "orders", orderId);
                const orderDoc = await transaction.get(orderDocRef);
                if (!orderDoc.exists()) throw new Error("لم يتم العثور على الطلب.");
                const currentOrder = orderDoc.data() as Order;

                const updateData: Partial<Order> = { status };

                if (status === 'confirmed' && workerId) {
                    if (currentOrder.status !== 'pending_assignment' || currentOrder.assignedToWorkerId !== workerId) {
                         throw new Error("لم يعد هذا الطلب متاحًا لك.");
                    }
                    const workerDocRef = doc(db, "deliveryWorkers", workerId);
                    const workerDoc = await transaction.get(workerDocRef);
                    if (!workerDoc.exists()) throw new Error("لم يتم العثور على عامل التوصيل.");
                    
                    const workerData = workerDoc.data() as DeliveryWorker;
                    updateData.deliveryWorkerId = workerId;
                    updateData.deliveryWorker = { id: workerId, name: workerData.name };
                }

                if (status === 'unassigned' && workerId) {
                    const newRejectedBy = Array.from(new Set([...(currentOrder.rejectedBy || []), workerId]));
                    // The actual reassignment logic will be handled outside the transaction for simplicity
                    updateData.rejectedBy = newRejectedBy;
                }
                
                if (status !== 'pending_assignment') {
                    updateData.assignedToWorkerId = null;
                    updateData.assignmentTimestamp = null;
                    if (status !== 'unassigned') updateData.rejectedBy = [];
                }
                
                transaction.update(orderDocRef, updateData);

                if (status === 'delivered' && workerId) {
                    const workerDocRef = doc(db, "deliveryWorkers", workerId);
                    const workerDoc = await transaction.get(workerDocRef);
                    if (workerDoc.exists()) {
                        const worker = workerDoc.data() as DeliveryWorker;
                        const now = new Date();
                        const deliveredOrdersCount = allOrders.filter(o => o.deliveryWorkerId === workerId && o.status === 'delivered').length + 1;
                        const { isFrozen } = getWorkerLevel(worker, deliveredOrdersCount, now);
                        let workerUpdate: any = {};
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
            
            // If a worker rejected, re-assign
            if (status === 'unassigned' && workerId) {
                 await assignOrderToNextWorker(orderId, (allOrders.find(o => o.id === orderId)?.rejectedBy || []));
            } else {
                // Manually refresh all orders and workers data after a successful transaction
                const updatedOrders = (await getDocs(collection(db, "orders"))).docs.map(doc => ({id: doc.id, ...doc.data()}) as Order);
                setAllOrders(updatedOrders.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                if(status === 'delivered') {
                    const updatedWorkers = (await getDocs(collection(db, "deliveryWorkers"))).docs.map(doc => ({id: doc.id, ...doc.data()}) as DeliveryWorker);
                    setDeliveryWorkers(updatedWorkers);
                }
            }
        } catch (error: any) {
            console.error(`Failed to update order ${orderId} to ${status}:`, error);
            toast({ title: "فشل تحديث الطلب", description: error.message, variant: "destructive" });
            throw error; // Re-throw to be caught in the component
        }
    }, [allOrders, assignOrderToNextWorker, toast]);


    return (
        <AppContext.Provider value={{
            products, restaurants, categories, banners, deliveryZones, coupons, allOrders,
            supportTickets, telegramConfigs, deliveryWorkers, allUsers, isLoading, userId,
            addresses, addAddress, deleteAddress,
            cart, addToCart, removeFromCart, updateCartQuantity, clearCart, cartTotal,
            placeOrder,
            addProduct, updateProduct, deleteProduct,
            addCategory, updateCategory, deleteCategory,
            addRestaurant, updateRestaurant, deleteRestaurant,
            addBanner, updateBanner, deleteBanner,
            addDeliveryZone, updateDeliveryZone, deleteDeliveryZone,
            addCoupon, deleteCoupon,
            updateOrderStatus, deleteOrder,
            createSupportTicket, addMessageToTicket, resolveSupportTicket,
            addTelegramConfig, deleteTelegramConfig,
            addDeliveryWorker, updateWorkerStatus,
            mySupportTicket, startNewTicketClient
        }}>
            {children}
        </AppContext.Provider>
    );
};
