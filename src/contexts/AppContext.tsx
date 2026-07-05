
"use client";

import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { collection, doc, runTransaction, arrayUnion, updateDoc } from 'firebase/firestore';
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

    activeTab: number;
    setActiveTab: (index: number) => void;

    selectedProductId: string | null;
    setSelectedProductId: (id: string | null) => void;
    selectedRestaurantId: string | null;
    setSelectedRestaurantId: (id: string | null) => void;
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
    const [isForceNewTicket, setIsForceNewTicket] = useState(false);
    const [activeTab, setActiveTab] = useState(0);
    
    const [selectedProductId, setSelectedProductId] = useState<string|null>(null);
    const [selectedRestaurantId, setSelectedRestaurantId] = useState<string|null>(null);

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
                title: "تنبيه",
                description: `يرجى اختيار حجم المنتج أولاً من صفحة التفاصيل.`,
            });
            return false;
        }

        const restaurantId = product.restaurantId;
        const cartIsFromDifferentRestaurant = cart.length > 0 && cart[0].product.restaurantId !== restaurantId;

        if (cartIsFromDifferentRestaurant) {
            toast({
                title: "بدء سلة جديدة؟",
                description: "لديك منتجات من متجر آخر في السلة. هل تريد إفراغها والبدء من هذا المتجر؟",
                action: <ToastAction altText="نعم" onClick={() => {
                    setCart([{ product, quantity, selectedSize }]);
                }}>نعم</ToastAction>,
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
    
    // الربط اللحظي لتذكرة الدعم الخاصة بالمستخدم
    const mySupportTicket = useMemo(() => {
        if (isForceNewTicket || !userId) return null;
        
        // جلب كافة التذاكر الخاصة بالمستخدم الحالي من القائمة القادمة من Firebase Hook
        const userTickets = supportTickets.filter(t => t.userId === userId);
        if (userTickets.length === 0) return null;
        
        // البحث عن تذكرة غير مغلقة
        const unresolved = userTickets.find(t => !t.isResolved);
        if (unresolved) return unresolved;
        
        // إذا كانت جميعها مغلقة، نعيد الأحدث
        return [...userTickets].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    }, [userId, supportTickets, isForceNewTicket]);
    
    const startNewTicketClient = useCallback(() => {
        setIsForceNewTicket(true);
    }, []);

    const addMessageToTicket = useCallback(async (ticketId: string, message: Message) => {
        try {
            const ticketRef = doc(db, "supportTickets", ticketId);
            await updateDoc(ticketRef, { history: arrayUnion(message) });
        } catch (error) {
             toast({ title: "فشل الإرسال", description: "عذراً، لم نتمكن من إرسال رسالتك. يرجى التحقق من جودة الإنترنت.", variant: "destructive" });
        }
    }, [toast]);
    
    const createSupportTicket = useCallback(async (firstMessage: Message) => {
        if (!userId) return;
        
        setIsForceNewTicket(false);

        // إذا كان هناك تذكرة نشطة بالفعل، نضيف الرسالة لها فقط
        const activeTicket = mySupportTicket;
        if (activeTicket && !activeTicket.isResolved) {
             await addMessageToTicket(activeTicket.id, firstMessage);
             return;
        }
        
        const userName = addresses[0]?.name || `مستخدم ${userId.substring(0, 4)}`;
        await createTicketHook(firstMessage, userId, userName);
    }, [userId, mySupportTicket, addresses, createTicketHook, addMessageToTicket]);

    const placeOrder = useCallback(async (address: Address, deliveryFee: number, couponCode?: string): Promise<string | null> => {
        if (!userId) {
            toast({ title: "خلل في الهوية", description: "يرجى إعادة فتح التطبيق لنتعرف على هويتك مجدداً.", variant: "destructive" });
            return null;
        }
        if (cart.length === 0) {
            toast({ title: "السلة فارغة", description: "أضف بعض المنتجات أولاً لتتمكن من إرسال طلبك.", variant: "destructive" });
            return null;
        }
        
        let newOrderId: string | null = null;
        
        try {
            await runTransaction(db, async (transaction) => {
                const productRefs = cart.map(item => doc(db, "products", item.product.id));
                const productSnaps = await Promise.all(productRefs.map(ref => transaction.get(ref)));

                let couponDoc: any = null;
                let couponData: Coupon | null = null;
                if (couponCode?.trim()) {
                    const foundCoupon = coupons.find(c => c.code === couponCode.trim().toUpperCase());
                    if (foundCoupon) {
                        couponDoc = doc(db, "coupons", foundCoupon.id);
                        const couponSnap = await transaction.get(couponDoc);
                        if (couponSnap.exists()) {
                            couponData = { id: couponSnap.id, ...couponSnap.data() } as Coupon;
                        }
                    }
                }

                if (couponCode?.trim() && !couponData) throw new Error("كود الخصم الذي أدخلته غير صحيح.");
                if (couponData) {
                    if (couponData.usedCount >= couponData.maxUses) throw new Error("عذراً، كود الخصم هذا انتهت صلاحيته.");
                    if (couponData.usedBy?.includes(userId)) throw new Error("لقد استخدمت كود الخصم هذا من قبل.");
                }

                let totalProfit = 0;
                const updates: {ref: any, data: any}[] = [];

                for (let i = 0; i < productSnaps.length; i++) {
                    const snap = productSnaps[i];
                    const item = cart[i];
                    if (!snap.exists()) throw new Error(`المنتج "${item.product.name}" لم يعد متاحاً في المتجر حالياً.`);
                    
                    const serverProduct = snap.data() as Product;
                    const itemPrice = item.selectedSize?.price ?? serverProduct.discountPrice ?? serverProduct.price;
                    totalProfit += (itemPrice - (serverProduct.wholesalePrice || 0)) * item.quantity;

                    if (item.selectedSize) {
                        const sizeIdx = serverProduct.sizes?.findIndex(s => s.name === item.selectedSize!.name);
                        if (sizeIdx === undefined || sizeIdx === -1 || serverProduct.sizes![sizeIdx].stock < item.quantity) {
                            throw new Error(`نعتذر، الكمية المطلوبة من "${item.product.name} - ${item.selectedSize.name}" غير كافية في المتجر.`);
                        }
                        const newSizes = [...serverProduct.sizes!];
                        newSizes[sizeIdx] = { ...newSizes[sizeIdx], stock: newSizes[sizeIdx].stock - item.quantity };
                        updates.push({ ref: productRefs[i], data: { sizes: newSizes } });
                    } else {
                        if ((serverProduct.stock ?? 0) < item.quantity) throw new Error(`نعتذر، الكمية المطلوبة من "${item.product.name}" غير كافية في المتجر.`);
                        updates.push({ ref: productRefs[i], data: { stock: (serverProduct.stock || 0) - item.quantity } });
                    }
                }

                updates.forEach(u => transaction.update(u.ref, u.data));

                let discountAmount = 0;
                let appliedCouponInfo: Order['appliedCoupon'] = null;
                if (couponData && couponDoc) {
                    discountAmount = couponData.discountValue;
                    appliedCouponInfo = { code: couponData.code, discountAmount };
                    transaction.update(couponDoc, { 
                        usedCount: (couponData.usedCount || 0) + 1, 
                        usedBy: arrayUnion(userId) 
                    });
                }

                const finalTotal = Math.max(0, cartTotal - discountAmount) + deliveryFee;
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
            if (newOrderId) {
                 telegramConfigs.filter(c => c.type === 'owner').forEach(c => {
                    sendTelegramMessage(c.chatId, `*طلب جديد!* 🎉\n*رقم الطلب:* \`${newOrderId?.substring(0, 6)}\`\n*الزبون:* ${address.name}\n*المبلغ:* ${formatCurrency(cartTotal)}`);
                });
            }
            return newOrderId;
        } catch (error: any) {
            toast({
              title: "فشل إرسال الطلب",
              description: error.message || "حدث خطأ غير متوقع أثناء معالجة الطلب، يرجى المحاولة لاحقاً.",
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
        activeTab, setActiveTab,
        selectedProductId, setSelectedProductId,
        selectedRestaurantId, setSelectedRestaurantId
    }), [
        isLoading,
        placeOrder, createSupportTicket, addMessageToTicket,
        cart, addToCart, removeFromCart, updateCartQuantity, clearCart, cartTotal,
        userId, addresses, addAddress, deleteAddress,
        mySupportTicket, startNewTicketClient,
        activeTab, setActiveTab,
        selectedProductId, setSelectedProductId,
        selectedRestaurantId, setSelectedRestaurantId
    ]);
    
    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
