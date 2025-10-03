
"use client";

import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { collection, doc, runTransaction, arrayUnion, addDoc, updateDoc, deleteDoc, setDoc, query, where, writeBatch, onSnapshot, getDoc, getDocs } from 'firebase/firestore';
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
    
    isLoading: boolean;

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
    
    updateOrderStatus: (orderId: string, status: OrderStatus, workerId?: string) => Promise<void>;
    deleteOrder: (orderId: string) => Promise<void>;

    addCoupon: (couponData: Omit<Coupon, 'id' | 'usedCount' | 'usedBy'>) => Promise<void>;
    deleteCoupon: (couponId: string) => Promise<void>;
    
    addTelegramConfig: (configData: Omit<TelegramConfig, 'id'>) => Promise<void>;
    deleteTelegramConfig: (configId: string) => Promise<void>;

    placeOrder: (currentCart: CartItem[], address: Address, deliveryFee: number, couponCode?: string) => Promise<string>;

    addDeliveryWorker: (workerData: Pick<DeliveryWorker, 'id' | 'name'>) => Promise<void>;
    updateWorkerStatus: (workerId: string, isOnline: boolean) => Promise<void>;

    createSupportTicket: (firstMessage: Message) => Promise<void>;
    addMessageToTicket: (ticketId: string, message: Message) => Promise<void>;
    resolveSupportTicket: (ticketId: string) => Promise<void>;

    cart: CartItem[];
    addToCart: (product: Product, quantity: number, selectedSize?: ProductSize) => boolean;
    removeFromCart: (productId: string, sizeName?: string) => void;
    updateCartQuantity: (productId: string, quantity: number, sizeName?: string) => void;
    clearCart: () => void;
    cartTotal: number;
    
    userId: string | null;
    addresses: Address[];
    addAddress: (address: Omit<Address, 'id'>) => void;
    deleteAddress: (addressId: string) => void;

    mySupportTicket: SupportTicket | null;
    startNewTicketClient: () => void;
    
    assignOrderToNextWorker: (orderId: string, excludedWorkerIds: string[]) => Promise<void>;
}


export const AppContext = createContext<AppContextType | null>(null);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
    const { toast } = useToast();
    
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
    
    const [cart, setCart] = useState<CartItem[]>([]);
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [userId, setUserId] = useState<string|null>(null);
    const [myCurrentSupportTicket, setMySupportTicket] = useState<SupportTicket|null>(null);
    
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let id = localStorage.getItem('speedShopUserId');
        if (!id) {
            id = uuidv4();
            localStorage.setItem('speedShopUserId', id);
        }
        setUserId(id);

        try {
            const savedCart = localStorage.getItem('speedShopCart');
            if(savedCart) setCart(JSON.parse(savedCart));
        } catch (e) { console.error("Failed to parse cart from localStorage", e); }
        
        try {
            const savedAddresses = localStorage.getItem('speedShopAddresses');
            if(savedAddresses) setAddresses(JSON.parse(savedAddresses));
        } catch (e) { console.error("Failed to parse addresses from localStorage", e); }

        const unsubscribers = [
            onSnapshot(collection(db, "products"), (snap) => setProducts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)))),
            onSnapshot(collection(db, "categories"), (snap) => setCategoriesData(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Omit<Category, 'icon'>)))),
            onSnapshot(collection(db, "restaurants"), (snap) => setRestaurants(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Restaurant)))),
            onSnapshot(collection(db, "banners"), (snap) => setBanners(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Banner)))),
            onSnapshot(collection(db, "deliveryZones"), (snap) => setDeliveryZones(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as DeliveryZone)))),
            onSnapshot(collection(db, "orders"), (snap) => {
                 const ordersData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
                 setAllOrders(ordersData.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            }),
            onSnapshot(collection(db, "supportTickets"), (snap) => setSupportTickets(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupportTicket)))),
            onSnapshot(collection(db, "coupons"), (snap) => setCoupons(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Coupon)))),
            onSnapshot(collection(db, "telegramConfigs"), (snap) => setTelegramConfigs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TelegramConfig)))),
            onSnapshot(collection(db, "deliveryWorkers"), (snap) => setDeliveryWorkers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as DeliveryWorker)))),
        ];

        setIsLoading(false);
        

        return () => unsubscribers.forEach(unsub => unsub());
    }, []);

    const uploadImage = useCallback(async (base64: string, path: string): Promise<string> => {
        if (!base64 || !base64.startsWith('data:')) {
            return base64;
        }
        const storageRef = ref(storage, path);
        const snapshot = await uploadString(storageRef, base64, 'data_url');
        return getDownloadURL(snapshot.ref);
    }, []);

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
        setMySupportTicket({id: docRef.id, ...newTicket});
        telegramConfigs.filter(c => c.type === 'owner').forEach(c => sendTelegramMessage(c.chatId, `*تذكرة دعم جديدة* 📩\n*من:* ${userName}\n*الرسالة:* ${firstMessage.content}`));
    }, [userId, mySupportTicket, addresses, telegramConfigs, addMessageToTicket]);

    const resolveSupportTicket = useCallback(async (ticketId: string) => {
        await updateDoc(doc(db, "supportTickets", ticketId), { isResolved: true });
    }, []);

    const addProduct = useCallback(async (productData: Omit<Product, 'id'> & { image: string }) => {
        try {
            const imageUrl = await uploadImage(productData.image, `products/${uuidv4()}`);
            await addDoc(collection(db, "products"), { ...productData, image: imageUrl });
            toast({ title: "تمت إضافة المنتج بنجاح" });
        } catch (error) { console.error(error); toast({ title: "فشل إضافة المنتج", variant: "destructive" }); }
    }, [toast, uploadImage]);

    const updateProduct = useCallback(async (updatedProduct: Partial<Product> & { id: string }) => {
        try {
            const { id, ...productData } = updatedProduct;
            let finalData: Partial<Product> = {...productData};
            if (productData.image && productData.image.startsWith('data:')) {
                finalData.image = await uploadImage(productData.image, `products/${id}`);
            }
            await updateDoc(doc(db, "products", id), finalData);
            toast({ title: "تم تحديث المنتج بنجاح" });
        } catch (error) { console.error(error); toast({ title: "فشل تحديث المنتج", variant: "destructive" }); }
    }, [toast, uploadImage]);

    const deleteProduct = useCallback(async (productId: string) => {
        try {
            await deleteDoc(doc(db, "products", productId));
            toast({ title: "تم حذف المنتج بنجاح" });
        } catch (error) { toast({ title: "فشل حذف المنتج", variant: "destructive" }); }
    }, [toast]);
    
    const addCategory = useCallback(async (categoryData: Omit<Category, 'id'|'icon'>) => {
        try {
            await addDoc(collection(db, "categories"), categoryData);
            toast({ title: "تمت إضافة القسم بنجاح" });
        } catch (error) { toast({ title: "فشل إضافة القسم", variant: "destructive" }); }
    }, [toast]);

    const updateCategory = useCallback(async (updatedCategory: Omit<Category, 'icon'|'id'> & { id: string }) => {
        try {
            const { id, ...categoryData } = updatedCategory;
            await updateDoc(doc(db, "categories", id), categoryData);
            toast({ title: "تم تحديث القسم بنجاح" });
        } catch (error) { toast({ title: "فشل تحديث القسم", variant: "destructive" }); }
    }, [toast]);

    const deleteCategory = useCallback(async (categoryId: string) => {
        try {
            await deleteDoc(doc(db, "categories", categoryId));
            toast({ title: "تم حذف القسم بنجاح" });
        } catch (error) { toast({ title: "فشل حذف القسم", variant: "destructive" }); }
    }, [toast]);

    const addRestaurant = useCallback(async (restaurantData: Omit<Restaurant, 'id'> & { image: string }) => {
        try {
            const imageUrl = await uploadImage(restaurantData.image, `restaurants/${uuidv4()}`);
            await addDoc(collection(db, "restaurants"), { ...restaurantData, image: imageUrl });
            toast({ title: "تمت إضافة المتجر بنجاح" });
        } catch (error) { toast({ title: "فشل إضافة المتجر", variant: "destructive" }); }
    }, [toast, uploadImage]);

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
            toast({ title: "تم تحديث المتجر بنجاح" });
        } catch (error) { console.error(error); toast({ title: "فشل تحديث المتجر", variant: "destructive" }); }
    }, [toast, uploadImage]);

    const deleteRestaurant = useCallback(async (restaurantId: string) => {
        try {
            await deleteDoc(doc(db, "restaurants", restaurantId));
            toast({ title: "تم حذف المتجر بنجاح" });
        } catch (error) { toast({ title: "فشل حذف المتجر", variant: "destructive" }); }
    }, [toast]);
    
    const addBanner = useCallback(async (bannerData: Omit<Banner, 'id'> & { image: string }) => {
        try {
            const imageUrl = await uploadImage(bannerData.image, `banners/${uuidv4()}`);
            await addDoc(collection(db, "banners"), { ...bannerData, image: imageUrl });
            toast({ title: "تمت إضافة البنر بنجاح" });
        } catch (error) { toast({ title: "فشل إضافة البنر", variant: "destructive" }); }
    }, [toast, uploadImage]);

    const updateBanner = useCallback(async (banner: Banner) => {
        try {
            const { id, image, ...bannerData } = banner;
            let finalImageUrl = image;
            if (image && image.startsWith('data:')) {
                finalImageUrl = await uploadImage(image, `banners/${id}`);
            }
            await updateDoc(doc(db, "banners", id), { ...bannerData, image: finalImageUrl });
            toast({ title: "تم تحديث البنر بنجاح" });
        } catch (error) { toast({ title: "فشل تحديث البنر", variant: "destructive" }); }
    }, [toast, uploadImage]);

    const deleteBanner = useCallback(async (bannerId: string) => {
        try {
            await deleteDoc(doc(db, "banners", bannerId));
            toast({ title: "تم حذف البنر بنجاح" });
        } catch (error) { toast({ title: "فشل حذف البنر", variant: "destructive" }); }
    }, [toast]);

    const addDeliveryZone = useCallback(async (zone: Omit<DeliveryZone, 'id'>) => {
        try {
            await addDoc(collection(db, "deliveryZones"), zone);
            toast({ title: "تمت إضافة المنطقة بنجاح" });
        } catch (error) { toast({ title: "فشل إضافة المنطقة", variant: "destructive" }); }
    }, [toast]);

    const updateDeliveryZone = useCallback(async (zone: DeliveryZone) => {
        try {
            const { id, ...zoneData } = zone;
            await updateDoc(doc(db, "deliveryZones", id), zoneData);
            toast({ title: "تم تحديث المنطقة بنجاح" });
        } catch (error) { toast({ title: "فشل تحديث المنطقة", variant: "destructive" }); }
    }, [toast]);

    const deleteDeliveryZone = useCallback(async (zoneId: string) => {
        try {
            await deleteDoc(doc(db, "deliveryZones", zoneId));
            toast({ title: "تم حذف المنطقة بنجاح" });
        } catch (error) { toast({ title: "فشل حذف المنطقة", variant: "destructive" }); }
    }, [toast]);

    const addCoupon = useCallback(async (couponData: Omit<Coupon, 'id' | 'usedCount' | 'usedBy'>) => {
        try {
            const finalData = { ...couponData, usedCount: 0, usedBy: [] };
            await addDoc(collection(db, "coupons"), finalData);
            toast({ title: "تمت إضافة الكود بنجاح" });
        } catch (error) { toast({ title: "فشل إضافة الكود", variant: "destructive" }); }
    }, [toast]);

    const deleteCoupon = useCallback(async (couponId: string) => {
        try {
            await deleteDoc(doc(db, "coupons", couponId));
            toast({ title: "تم حذف الكود بنجاح" });
        } catch (error) { toast({ title: "فشل حذف الكود", variant: "destructive" }); }
    }, [toast]);
    
    const addTelegramConfig = useCallback(async (configData: Omit<TelegramConfig, 'id'>) => {
        try {
            await addDoc(collection(db, "telegramConfigs"), configData);
            toast({ title: "تمت إضافة المعرف بنجاح" });
        } catch (error) { toast({ title: "فشل إضافة المعرف", variant: "destructive" }); }
    }, [toast]);

    const deleteTelegramConfig = useCallback(async (configId: string) => {
        try {
            await deleteDoc(doc(db, "telegramConfigs", configId));
            toast({ title: "تم حذف المعرف بنجاح" });
        } catch (error) { toast({ title: "فشل حذف المعرف", variant: "destructive" }); }
    }, [toast]);

    const addDeliveryWorker = useCallback(async (workerData: Pick<DeliveryWorker, 'id' | 'name'>) => {
        try {
            const newWorker: DeliveryWorker = { ...workerData, isOnline: true, unfreezeProgress: 0, lastDeliveredAt: new Date().toISOString() };
            await setDoc(doc(db, 'deliveryWorkers', workerData.id), newWorker);
        } catch (error) { console.error("Error adding delivery worker:", error); toast({ title: "فشل إضافة عامل توصيل", variant: "destructive" }); throw error; }
    }, [toast]);

    const updateWorkerStatus = useCallback(async (workerId: string, isOnline: boolean) => {
        try {
            await updateDoc(doc(db, 'deliveryWorkers', workerId), { isOnline });
        } catch (error) { console.error("Error updating worker status:", error); toast({ title: "فشل تحديث حالة العامل", variant: "destructive" }); }
    }, [toast]);
    
    
    const assignOrderToNextWorker = useCallback(async (orderId: string, excludedWorkerIds: string[] = []) => {
        try {
            const orderRef = doc(db, "orders", orderId);
            
            // Refetch data inside the function to ensure it's up-to-date
            const allOrdersSnapshot = await getDocs(collection(db, "orders"));
            const currentAllOrders = allOrdersSnapshot.docs.map(d => ({id: d.id, ...d.data()}) as Order);
            const orderToAssign = currentAllOrders.find(o => o.id === orderId);
            
            const deliveryWorkersSnapshot = await getDocs(collection(db, "deliveryWorkers"));
            const currentDeliveryWorkers = deliveryWorkersSnapshot.docs.map(d => ({id: d.id, ...d.data()}) as DeliveryWorker);
            
            const telegramConfigsSnapshot = await getDocs(collection(db, "telegramConfigs"));
            const currentTelegramConfigs = telegramConfigsSnapshot.docs.map(d => ({id: d.id, ...d.data()}) as TelegramConfig);


            if (!orderToAssign) throw new Error("Order to assign not found");

            const completedOrdersByWorker: {[workerId: string]: number} = {};
            currentAllOrders.forEach(o => {
                if (o.status === 'delivered' && o.deliveryWorkerId) {
                    completedOrdersByWorker[o.deliveryWorkerId] = (completedOrdersByWorker[o.deliveryWorkerId] || 0) + 1;
                }
            });

            const busyWorkerIds = new Set(currentAllOrders.filter(o => ['confirmed', 'preparing', 'on_the_way'].includes(o.status)).map(o => o.deliveryWorkerId).filter((id): id is string => !!id));
            
            const availableWorkers = currentDeliveryWorkers.filter(w => w.isOnline && !busyWorkerIds.has(w.id) && !excludedWorkerIds.includes(w.id));

            if (availableWorkers.length === 0) {
                await updateDoc(orderRef, { status: 'unassigned' as OrderStatus, assignedToWorkerId: null, assignmentTimestamp: null, rejectedBy: excludedWorkerIds });
                return;
            }

            availableWorkers.sort((a,b) => (completedOrdersByWorker[a.id] || 0) - (completedOrdersByWorker[b.id] || 0));
            const nextWorker = availableWorkers[0];
            
            await updateDoc(orderRef, { status: 'pending_assignment' as OrderStatus, assignedToWorkerId: nextWorker.id, assignmentTimestamp: new Date().toISOString(), rejectedBy: excludedWorkerIds });
            
            const workerConfig = currentTelegramConfigs.find(c => c.type === 'worker' && c.workerId === nextWorker.id);
            if (workerConfig) {
                sendTelegramMessage(workerConfig.chatId, `*لديك طلب جديد في الانتظار* 🛵\n*رقم الطلب:* \`${orderId.substring(0, 6)}\`\n*المنطقة:* ${orderToAssign.address.deliveryZone}\n*ربحك من التوصيل:* ${formatCurrency(orderToAssign.deliveryFee)}`);
            }
        } catch (error) {
            console.error("Failed to assign order to next worker:", error);
            toast({title: "فشل تعيين الطلب", description: "حدث خطأ أثناء محاولة تعيين الطلب لعامل آخر.", variant: "destructive"});
        }
    }, [toast]);
    
    const updateOrderStatus = useCallback(async (orderId: string, status: OrderStatus, workerId?: string) => {
        try {
            await runTransaction(db, async (transaction) => {
                const orderRef = doc(db, "orders", orderId);
                const orderDoc = await transaction.get(orderRef);

                if (!orderDoc.exists()) {
                    throw new Error("لم يتم العثور على الطلب.");
                }
                const currentOrder = orderDoc.data() as Order;
                const updateData: any = { status };

                if (status === 'confirmed' && workerId) {
                    if (currentOrder.status !== 'pending_assignment' || currentOrder.assignedToWorkerId !== workerId) {
                        throw new Error("لم يعد هذا الطلب متاحًا لك.");
                    }
                    updateData.deliveryWorkerId = workerId;
                } else if (status === 'unassigned' && workerId) {
                    updateData.rejectedBy = arrayUnion(workerId);
                }
                
                if (status !== 'pending_assignment') {
                    updateData.assignedToWorkerId = null;
                    updateData.assignmentTimestamp = null;
                    if (status !== 'unassigned') updateData.rejectedBy = [];
                }

                transaction.update(orderRef, updateData);
            });

            if (status === 'unassigned' && workerId) {
                const order = allOrders.find(o => o.id === orderId);
                if (order) {
                    await assignOrderToNextWorker(orderId, order.rejectedBy || []);
                }
            }
            
        } catch (error: any) {
            console.error("Failed to update order status:", error);
            toast({title: "فشل تحديث الطلب", description: error.message, variant: "destructive"});
            throw error; // Re-throw the error to be caught by the caller
        }
    }, [toast, assignOrderToNextWorker, allOrders]);
    
    
    const placeOrder = useCallback(async (currentCart: CartItem[], address: Address, deliveryFee: number, couponCode?: string): Promise<string> => {
        if (!userId) throw new Error("User ID not found.");
        if (currentCart.length === 0) throw new Error("السلة فارغة.");
        
        let newOrderId: string | null = null;
        
        try {
            await runTransaction(db, async (transaction) => {
                const productRefs = currentCart.map(item => doc(db, "products", item.product.id));
                const productDocs = await Promise.all(productRefs.map(ref => transaction.get(ref)));

                let couponDoc: any = null;
                let couponData: Coupon | null = null;
                if (couponCode?.trim()) {
                    const foundCoupon = coupons.find(c => c.code === couponCode.trim().toUpperCase());
                    if (foundCoupon) {
                        couponDoc = doc(db, "coupons", foundCoupon.id);
                        couponData = await transaction.get(couponDoc).then(snap => snap.exists() ? { id: snap.id, ...snap.data() } as Coupon : null);
                    } else { throw new Error(`كود الخصم "${couponCode}" غير صالح.`); }
                }

                if (couponData) {
                    if (couponData.usedCount >= couponData.maxUses) throw new Error("تم استخدام هذا الكود بالكامل.");
                    if (couponData.usedBy?.includes(userId)) throw new Error("لقد استخدمت هذا الكود من قبل.");
                }

                let calculatedProfit = 0;

                for (let i = 0; i < productDocs.length; i++) {
                    const productDoc = productDocs[i];
                    const item = currentCart[i];
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
                        transaction.update(productRefs[i], { sizes: newSizes });
                    } else {
                        if ((serverProduct.stock ?? 0) < item.quantity) throw new Error(`الكمية المطلوبة من "${item.product.name}" غير متوفرة.`);
                        transaction.update(productRefs[i], { stock: (serverProduct.stock || 0) - item.quantity });
                    }
                }
                
                let discountAmount = 0;
                let appliedCouponInfo: Order['appliedCoupon'] = null;
                if (couponData && couponDoc) {
                    discountAmount = couponData.discountValue;
                    appliedCouponInfo = { code: couponData.code, discountAmount: discountAmount };
                    transaction.update(couponDoc, { usedCount: couponData.usedCount + 1, usedBy: arrayUnion(userId) });
                }

                const subtotal = currentCart.reduce((total, item) => {
                    const price = item.selectedSize?.price ?? item.product.discountPrice ?? item.product.price;
                    return total + price * item.quantity;
                }, 0);
                const finalTotal = Math.max(0, subtotal - discountAmount) + deliveryFee;
                
                const newOrderRef = doc(collection(db, "orders"));
                newOrderId = newOrderRef.id;
                
                const orderRestaurant = restaurants.find(r => r.id === currentCart[0].product.restaurantId);

                const newOrderData: Omit<Order, 'id'> = { userId, items: currentCart, total: finalTotal, date: new Date().toISOString(), status: 'unassigned', estimatedDelivery: new Date(Date.now() + 45 * 60 * 1000).toISOString(), address, profit: calculatedProfit, deliveryFee, deliveryWorkerId: null, deliveryWorker: null, assignedToWorkerId: null, assignmentTimestamp: null, rejectedBy: [], appliedCoupon: appliedCouponInfo, restaurant: orderRestaurant ? {id: orderRestaurant.id, name: orderRestaurant.name, latitude: orderRestaurant.latitude, longitude: orderRestaurant.longitude} : null, };
                transaction.set(newOrderRef, newOrderData);
            });
            
            if (!newOrderId) throw new Error("Failed to create new order ID.");

            clearCart();
            
            const newOrder = (await getDoc(doc(db, "orders", newOrderId))).data() as Order;
            if (newOrder) {
                 telegramConfigs.filter(c => c.type === 'owner').forEach(c => {
                    sendTelegramMessage(c.chatId, `*طلب جديد!* 🎉\n*رقم الطلب:* \`${newOrderId?.substring(0, 6)}\`\n*الزبون:* ${newOrder.address.name}\n*المنطقة:* ${newOrder.address.deliveryZone}\n*المبلغ:* ${formatCurrency(newOrder.total)}`);
                });
                await assignOrderToNextWorker(newOrderId, []);
            }
            return newOrderId;
        } catch (error) {
            console.error("Place order transaction failed: ", error);
            throw error;
        }

    }, [userId, clearCart, telegramConfigs, assignOrderToNextWorker, coupons, allOrders, restaurants]);
    
    const deleteOrder = useCallback(async (orderId: string) => {
        try {
            await deleteDoc(doc(db, "orders", orderId));
            toast({ title: "تم حذف الطلب بنجاح" });
        } catch(e) {
            console.error(e);
            toast({title: "فشل حذف الطلب", variant: "destructive"})
        }
    }, [toast]);
    
    
    const value = useMemo(() => ({
        products, categories, restaurants, banners, deliveryZones, allOrders, supportTickets, coupons, telegramConfigs, deliveryWorkers,
        isLoading,
        addProduct, updateProduct, deleteProduct,
        addCategory, updateCategory, deleteCategory,
        addRestaurant, updateRestaurant, deleteRestaurant,
        addBanner, updateBanner, deleteBanner,
        addDeliveryZone, updateDeliveryZone, deleteDeliveryZone,
        updateOrderStatus, deleteOrder,
        addCoupon, deleteCoupon,
        addTelegramConfig, deleteTelegramConfig,
        placeOrder,
        addDeliveryWorker, updateWorkerStatus,
        createSupportTicket, addMessageToTicket, resolveSupportTicket,
        cart, addToCart, removeFromCart, updateCartQuantity, clearCart, cartTotal,
        userId, addresses, addAddress, deleteAddress,
        mySupportTicket, startNewTicketClient,
        assignOrderToNextWorker,
    }), [
        products, categories, restaurants, banners, deliveryZones, allOrders, supportTickets, coupons, telegramConfigs, deliveryWorkers,
        isLoading, addProduct, updateProduct, deleteProduct, addCategory, updateCategory, deleteCategory, addRestaurant, updateRestaurant, deleteRestaurant,
        addBanner, updateBanner, deleteBanner, addDeliveryZone, updateDeliveryZone, deleteDeliveryZone, updateOrderStatus, deleteOrder, addCoupon, deleteCoupon, addTelegramConfig, deleteTelegramConfig,
        placeOrder, addDeliveryWorker, updateWorkerStatus, createSupportTicket, addMessageToTicket, resolveSupportTicket,
        cart, addToCart, removeFromCart, updateCartQuantity, clearCart, cartTotal,
        userId, addresses, addAddress, deleteAddress,
        mySupportTicket, startNewTicketClient,
        assignOrderToNextWorker
    ]);
    
    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
