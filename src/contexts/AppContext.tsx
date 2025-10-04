
"use client";

import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { collection, doc, runTransaction, arrayUnion, addDoc, updateDoc, deleteDoc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/hooks/use-toast';
import { sendTelegramMessage } from '@/lib/telegram';
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
import { useOrders } from '@/hooks/useOrders';
import { useDeliveryWorkers } from '@/hooks/useDeliveryWorkers';
import { useTelegramConfigs } from '@/hooks/useTelegramConfigs';
import { useRestaurants } from '@/hooks/useRestaurants';
import { useProducts } from '@/hooks/useProducts';
import { useSupportTickets } from '@/hooks/useSupportTickets';
import { useCoupons } from '@/hooks/useCoupons';
import { useDeliveryZones } from '@/hooks/useDeliveryZones';
import { useBanners } from '@/hooks/useBanners';
import { useCategories } from '@/hooks/useCategories';


interface AppContextType {
    products: Product[];
    categories: Category[];
    restaurants: Restaurant[];
    banners: Banner[];
    deliveryZones: DeliveryZone[];
    allOrders: Order[];
    allUsers: any[]; // Mocked for now
    supportTickets: SupportTicket[];
    coupons: Coupon[];
    telegramConfigs: TelegramConfig[];
    deliveryWorkers: DeliveryWorker[];
    
    isLoading: boolean;

    placeOrder: (address: Address, deliveryFee: number, couponCode?: string) => Promise<string | null>;
    
    createSupportTicket: (firstMessage: Message) => Promise<void>;
    addMessageToTicket: (ticketId: string, message: Message) => Promise<void>;

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
}


export const AppContext = createContext<AppContextType | null>(null);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
    const { toast } = useToast();
    
    const { products, isLoading: productsLoading } = useProducts();
    const { categories, isLoading: categoriesLoading } = useCategories();
    const { restaurants, isLoading: restaurantsLoading } = useRestaurants();
    const { banners, isLoading: bannersLoading } = useBanners();
    const { deliveryZones, isLoading: zonesLoading } = useDeliveryZones();
    const { allOrders, isLoading: ordersLoading } = useOrders();
    const { supportTickets, isLoading: ticketsLoading } = useSupportTickets();
    const { coupons, isLoading: couponsLoading } = useCoupons();
    const { telegramConfigs, isLoading: telegramLoading } = useTelegramConfigs();
    const { deliveryWorkers, isLoading: workersLoading } = useDeliveryWorkers();
    
    const [allUsers, setAllUsers] = useState<any[]>([]); // Mocked for now
    
    const [cart, setCart] = useState<CartItem[]>([]);
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [userId, setUserId] = useState<string|null>(null);
    const [myCurrentSupportTicket, setMySupportTicket] = useState<SupportTicket|null>(null);
    
    const isLoading = productsLoading || categoriesLoading || restaurantsLoading || bannersLoading || zonesLoading || ordersLoading || ticketsLoading || couponsLoading || telegramLoading || workersLoading;

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
    }, []);

    useEffect(() => {
        if (!isLoading) {
            localStorage.setItem('speedShopCart', JSON.stringify(cart));
        }
    }, [cart, isLoading]);

    const addToCart = useCallback((product: Product, quantity: number, selectedSize?: ProductSize): boolean => {
         if (product.sizes && product.sizes.length > 0 && !selectedSize) {
            toast({
                title: "الرجاء اختيار الحجم",
                description: `لهذا المنتج أحجام متعددة. الرجاء الدخول لصفحة المنتج لاختيار الحجم.`,
                variant: "default",
            });
            return false;
        }

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
        const price = item.selectedSize?.price ?? item.product.discountPrice ?? item.product.price ?? 0;
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

    const placeOrder = useCallback(async (address: Address, deliveryFee: number, couponCode?: string): Promise<string | null> => {
        if (!userId) {
            toast({ title: "User ID not found.", variant: "destructive" });
            return null;
        }
        if (cart.length === 0) {
            toast({ title: "السلة فارغة.", variant: "destructive" });
            return null;
        }
        
        let newOrderId: string | null = null;
        
        try {
            await runTransaction(db, async (transaction) => {
                const productRefs = cart.map(item => doc(db, "products", item.product.id));
                const productDocs = await Promise.all(productRefs.map(ref => transaction.get(ref)));

                let couponDoc: any = null;
                let couponData: Coupon | null = null;
                if (couponCode?.trim()) {
                    const foundCoupon = coupons.find(c => c.code === couponCode.trim().toUpperCase());
                    if (foundCoupon) {
                        couponDoc = doc(db, "coupons", foundCoupon.id);
                        const couponSnap = await transaction.get(couponDoc);
                        if (!couponSnap.exists()) throw new Error(`كود الخصم "${couponCode}" غير صالح.`);
                        couponData = { id: couponSnap.id, ...couponSnap.data() } as Coupon;
                    } else { throw new Error(`كود الخصم "${couponCode}" غير صالح.`); }
                }

                if (couponData) {
                    if (couponData.usedCount >= couponData.maxUses) throw new Error("تم استخدام هذا الكود بالكامل.");
                    if (couponData.usedBy?.includes(userId)) throw new Error("لقد استخدمت هذا الكود من قبل.");
                }

                let totalProfit = 0;

                for (let i = 0; i < productDocs.length; i++) {
                    const productDoc = productDocs[i];
                    const item = cart[i];
                    if (!productDoc.exists()) throw new Error(`منتج "${item.product.name}" لم يعد متوفرًا.`);
                    const serverProduct = productDoc.data() as Product;
                    
                    const itemPrice = item.selectedSize?.price ?? serverProduct.discountPrice ?? serverProduct.price;
                    const itemProfit = (itemPrice - (serverProduct.wholesalePrice || 0)) * item.quantity;
                    
                    if (!isNaN(itemProfit)) {
                        totalProfit += itemProfit;
                    }

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

                const subtotal = cart.reduce((total, item) => {
                    const price = item.selectedSize?.price ?? item.product.discountPrice ?? item.product.price;
                    return total + price * item.quantity;
                }, 0);
                const finalTotal = Math.max(0, subtotal - discountAmount) + deliveryFee;
                
                const newOrderRef = doc(collection(db, "orders"));
                newOrderId = newOrderRef.id;
                
                const orderRestaurant = restaurants.find(r => r.id === cart[0].product.restaurantId);

                const newOrderData: Omit<Order, 'id'> = {
                    userId,
                    items: cart,
                    total: finalTotal,
                    date: new Date().toISOString(),
                    status: 'unassigned',
                    estimatedDelivery: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
                    address,
                    profit: totalProfit || 0,
                    deliveryFee,
                    deliveryWorkerId: null,
                    deliveryWorker: null,
                    assignedToWorkerId: null,
                    assignmentTimestamp: null,
                    rejectedBy: [],
                    appliedCoupon: appliedCouponInfo,
                    restaurant: orderRestaurant ? {
                        id: orderRestaurant.id,
                        name: orderRestaurant.name,
                        latitude: orderRestaurant.latitude ?? null,
                        longitude: orderRestaurant.longitude ?? null
                    } : null,
                };
                transaction.set(newOrderRef, newOrderData);
            });
            
            if (!newOrderId) {
                throw new Error("Failed to create new order ID.");
            }

            clearCart();
            
            const newOrderSnap = await getDoc(doc(db, "orders", newOrderId));
            if (newOrderSnap.exists()) {
                 const newOrder = newOrderSnap.data() as Order;
                 telegramConfigs.filter(c => c.type === 'owner').forEach(c => {
                    sendTelegramMessage(c.chatId, `*طلب جديد!* 🎉\n*رقم الطلب:* \`${newOrderId?.substring(0, 6)}\`\n*الزبون:* ${newOrder.address.name}\n*المنطقة:* ${newOrder.address.deliveryZone}\n*المبلغ:* ${formatCurrency(newOrder.total)}`);
                });
            }
            return newOrderId;
        } catch (error) {
            console.error("Place order transaction failed: ", error);
            toast({
              title: "فشل إرسال الطلب",
              description: "الرجاء محاولة إعادة تشغيل التطبيق.",
              variant: "destructive",
            });
            return null;
        }
    }, [userId, cart, coupons, restaurants, clearCart, telegramConfigs, toast]);
    
    const value = useMemo(() => ({
        products, categories, restaurants, banners, deliveryZones, allOrders, supportTickets, coupons, telegramConfigs, deliveryWorkers, allUsers,
        isLoading,
        placeOrder,
        createSupportTicket, addMessageToTicket,
        cart, addToCart, removeFromCart, updateCartQuantity, clearCart, cartTotal,
        userId, addresses, addAddress, deleteAddress,
        mySupportTicket, startNewTicketClient,
    }), [
        products, categories, restaurants, banners, deliveryZones, allOrders, supportTickets, coupons, telegramConfigs, deliveryWorkers, allUsers,
        isLoading,
        placeOrder, createSupportTicket, addMessageToTicket,
        cart, addToCart, removeFromCart, updateCartQuantity, clearCart, cartTotal,
        userId, addresses, addAddress, deleteAddress,
        mySupportTicket, startNewTicketClient,
    ]);
    
    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
