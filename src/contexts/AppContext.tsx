
"use client";

import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { collection, doc, runTransaction, arrayUnion, updateDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/hooks/use-toast';
import { sendTelegramMessage } from '@/lib/telegram';
import { formatCurrency } from '@/lib/utils';
import { ToastAction } from '@/components/ui/toast';
import type { 
    Product, 
    Order, 
    SupportTicket, 
    Coupon, 
    Address, 
    CartItem, 
    Message,
    ProductSize
} from '@/lib/types';
import { useProducts } from '@/hooks/useProducts';
import { useSupportTickets } from '@/hooks/useSupportTickets';
import { useCoupons } from '@/hooks/useCoupons';
import { useTelegramConfigs } from '@/hooks/useTelegramConfigs';
import { useRestaurants } from '@/hooks/useRestaurants';
import { useOrders } from '@/hooks/useOrders';


interface AppContextType {
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
    const { restaurants, isLoading: restaurantsLoading } = useRestaurants();
    const { supportTickets, isLoading: ticketsLoading, createSupportTicket: createTicketHook } = useSupportTickets();
    const { coupons, isLoading: couponsLoading } = useCoupons();
    const { telegramConfigs, isLoading: telegramLoading } = useTelegramConfigs();
    const { allOrders: ordersData, isLoading: ordersLoading } = useOrders();

    
    const [cart, setCart] = useState<CartItem[]>([]);
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [userId, setUserId] = useState<string|null>(null);
    const [myCurrentSupportTicket, setMySupportTicket] = useState<SupportTicket|null>(null);
    
    const isLoading = productsLoading || restaurantsLoading || ticketsLoading || couponsLoading || telegramLoading || ordersLoading;

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
        } catch (e) { console.error("Failed to parse cart", e); }
        
        try {
            const savedAddresses = localStorage.getItem('speedShopAddresses');
            if(savedAddresses) setAddresses(JSON.parse(savedAddresses));
        } catch (e) { console.error("Failed to parse addresses", e); }
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
                description: `هذا المنتج يتطلب اختيار حجم معين أولاً.`,
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
                    setCart([{ product, quantity, selectedSize }]);
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
        setAddresses(prev => [newAddress, ...prev]);
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
        try {
            await updateDoc(doc(db, "supportTickets", ticketId), { history: arrayUnion(message) });
        } catch (error) {
             toast({ title: "فشل إرسال الرسالة", description: "تأكد من اتصالك بالإنترنت.", variant: "destructive" });
        }
    }, [toast]);
    
    const createSupportTicket = useCallback(async (firstMessage: Message) => {
        if (!userId) return;
        const activeTicket = mySupportTicket;
        if (activeTicket && !activeTicket.isResolved) {
             await addMessageToTicket(activeTicket.id, firstMessage);
             return;
        }
        const userName = addresses[0]?.name || `مستخدم ${userId.substring(0, 4)}`;
        await createTicketHook(firstMessage, userId, userName);
        
        const newTicket: Omit<SupportTicket, 'id'> & {id?: string} = { userId, userName, createdAt: new Date().toISOString(), isResolved: false, history: [firstMessage] };
        setMySupportTicket(newTicket as SupportTicket);
    }, [userId, mySupportTicket, addresses, createTicketHook, addMessageToTicket]);

    const placeOrder = useCallback(async (address: Address, deliveryFee: number, couponCode?: string): Promise<string | null> => {
        if (!userId) {
            toast({ title: "عذراً", description: "لم نتمكن من التعرف على حسابك. أعد تشغيل التطبيق.", variant: "destructive" });
            return null;
        }
        if (cart.length === 0) {
            toast({ title: "السلة فارغة", description: "أضف منتجات أولاً لتتمكن من الطلب.", variant: "destructive" });
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
                        if (!couponSnap.exists()) throw new Error(`كود الخصم "${couponCode}" غير صحيح.`);
                        couponData = { id: couponSnap.id, ...couponSnap.data() } as Coupon;
                    } else { throw new Error(`كود الخصم "${couponCode}" غير صحيح.`); }
                }

                if (couponData) {
                    if (couponData.usedCount >= couponData.maxUses) throw new Error("عذراً، هذا الكود تم استخدامه بالكامل.");
                    if (couponData.usedBy?.includes(userId)) throw new Error("لقد استخدمت هذا الكود سابقاً.");
                }

                let totalProfit = 0;

                for (let i = 0; i < productDocs.length; i++) {
                    const productDoc = productDocs[i];
                    const item = cart[i];
                    if (!productDoc.exists()) throw new Error(`عذراً، منتج "${item.product.name}" لم يعد متوفراً في المتجر.`);
                    const serverProduct = productDoc.data() as Product;
                    
                    const itemPrice = item.selectedSize?.price ?? serverProduct.discountPrice ?? serverProduct.price;
                    const itemProfit = (itemPrice - (serverProduct.wholesalePrice || 0)) * item.quantity;
                    
                    if (!isNaN(itemProfit)) totalProfit += itemProfit;

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
                    transaction.update(couponDoc, { usedCount: (couponData.usedCount || 0) + 1, usedBy: arrayUnion(userId) });
                }

                const subtotal = cartTotal;
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
                    profit: totalProfit,
                    deliveryFee,
                    deliveryWorkerId: null,
                    deliveryWorker: null,
                    isPaid: false,
                    isFeePaid: false,
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
            
            clearCart();
            
            // Notifications
            if (newOrderId) {
                 telegramConfigs.filter(c => c.type === 'owner').forEach(c => {
                    sendTelegramMessage(c.chatId, `*طلب جديد!* 🎉\n*رقم الطلب:* \`${newOrderId?.substring(0, 6)}\`\n*الزبون:* ${address.name}\n*المبلغ:* ${formatCurrency(cartTotal)}`);
                });
            }
            return newOrderId;
        } catch (error: any) {
            toast({
              title: "فشل إرسال الطلب",
              description: error.message || "تأكد من جودة اتصالك بالإنترنت وحاول مجدداً.",
              variant: "destructive",
            });
            return null;
        }
    }, [userId, cart, coupons, restaurants, clearCart, telegramConfigs, toast, cartTotal]);
    
    const value = useMemo(() => ({
        isLoading,
        placeOrder,
        createSupportTicket, addMessageToTicket,
        cart, addToCart, removeFromCart, updateCartQuantity, clearCart, cartTotal,
        userId, addresses, addAddress, deleteAddress,
        mySupportTicket, startNewTicketClient,
    }), [
        isLoading,
        placeOrder, createSupportTicket, addMessageToTicket,
        cart, addToCart, removeFromCart, updateCartQuantity, clearCart, cartTotal,
        userId, addresses, addAddress, deleteAddress,
        mySupportTicket, startNewTicketClient,
    ]);
    
    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
