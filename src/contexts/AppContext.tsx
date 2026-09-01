
"use client";

import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { collection, doc, arrayUnion, updateDoc, getDocs, query, where, onSnapshot, addDoc, limit, orderBy, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/hooks/use-toast';
import { safeStorage } from '@/lib/utils';
import { ToastAction } from '@/components/ui/toast';
import type { 
    Product, SupportTicket, Coupon, Address, CartItem, Message, ProductSize, Restaurant, Order
} from '@/lib/types';
import { useSupportTickets } from '@/hooks/useSupportTickets';
import { useCoupons } from '@/hooks/useCoupons';
import { useRestaurants } from '@/hooks/useRestaurants';
import { useBanners } from '@/hooks/useBanners';

interface AppContextType {
    isLoading: boolean;
    isMainDataReady: boolean;
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
    addAddress: (address: Omit<Address, 'id'>) => Promise<void>;
    deleteAddress: (addressId: string) => void;
    mySupportTicket: SupportTicket | null;
    startNewTicketClient: () => void;
    activeTab: number;
    previousTab: number;
    setActiveTab: (index: number, pushToHistory?: boolean) => void;
    selectedProductId: string | null;
    setSelectedProductId: (id: string | null) => void;
    selectedRestaurantId: string | null;
    setSelectedRestaurantId: (id: string | null) => void;
    syncUserByPhone: (phone: string) => Promise<string | null>;
    isDarkMode: boolean;
    toggleDarkMode: () => void;
}

export const AppContext = createContext<AppContextType | null>(null);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
    const { toast } = useToast();
    const { restaurants } = useRestaurants();
    const { banners, isLoading: bannersLoading } = useBanners();
    const { supportTickets, createSupportTicket: createTicketHook } = useSupportTickets();
    const { coupons } = useCoupons();

    const [cart, setCart] = useState<CartItem[]>([]);
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [userId, setUserId] = useState<string|null>(null);
    const [activeTab, setActiveTabState] = useState(0);
    const [previousTab, setPreviousTab] = useState(0);
    const [selectedProductId, setSelectedProductId] = useState<string|null>(null);
    const [selectedRestaurantId, setSelectedRestaurantId] = useState<string|null>(null);
    const [isDarkMode, setIsDarkMode] = useState(false);

    const isMainDataReady = useMemo(() => !bannersLoading && banners.length > 0, [bannersLoading, banners.length]);

    useEffect(() => {
        try {
            let id = safeStorage.get('speedShopUserId');
            if (id) setUserId(id);
            const savedCart = safeStorage.get('speedShopCart');
            if(savedCart) setCart(JSON.parse(savedCart));
            
            const savedTheme = safeStorage.get('speedShopTheme');
            if (savedTheme === 'dark') {
                setIsDarkMode(true);
                document.documentElement.classList.add('dark');
            }
        } catch (e) {}
    }, []);

    const toggleDarkMode = useCallback(() => {
        setIsDarkMode(prev => {
            const newVal = !prev;
            if (newVal) {
                document.documentElement.classList.add('dark');
                safeStorage.set('speedShopTheme', 'dark');
            } else {
                document.documentElement.classList.remove('dark');
                safeStorage.set('speedShopTheme', 'light');
            }
            return newVal;
        });
    }, []);

    useEffect(() => {
        const handlePopState = (event: PopStateEvent) => {
            if (event.state && typeof event.state.tab === 'number') {
                setActiveTabState(event.state.tab);
            } else {
                setActiveTabState(0);
            }
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    useEffect(() => {
        if (!userId) return;
        const q = query(collection(db, "addresses"), where("userId", "==", userId));
        return onSnapshot(q, (snapshot) => {
            const addrData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Address[];
            setAddresses(addrData);
        });
    }, [userId]);

    const setActiveTab = useCallback((index: number, pushToHistory = true) => {
        setPreviousTab(activeTab);
        setActiveTabState(index);
        if (pushToHistory) window.history.pushState({ tab: index }, '');
    }, [activeTab]);

    const syncUserByPhone = useCallback(async (phone: string): Promise<string | null> => {
        try {
            const q = query(collection(db, "addresses"), where("phone", "==", phone), limit(1));
            const snap = await getDocs(q);
            const targetId = !snap.empty ? snap.docs[0].data().userId : uuidv4();
            setUserId(targetId);
            safeStorage.set('speedShopUserId', targetId);
            return targetId;
        } catch (e) { return null; }
    }, []);

    const addToCart = useCallback((product: Product, quantity: number, selectedSize?: ProductSize): boolean => {
        if (cart.length > 0 && cart[0].product.restaurantId !== product.restaurantId) {
            toast({
                title: "تنبيه",
                description: "لديك طلبات من متجر آخر، هل تريد استبدال محتويات السلة؟",
                action: <ToastAction altText="نعم" onClick={() => setCart([{ product, quantity, selectedSize }])}>نعم</ToastAction>,
            });
            return false;
        }
        setCart(prev => {
            const idx = prev.findIndex(item => item.product.id === product.id && item.selectedSize?.name === selectedSize?.name);
            if (idx > -1) { const n = [...prev]; n[idx].quantity += quantity; return n; }
            return [...prev, { product, quantity, selectedSize }];
        });
        return true;
    }, [cart, toast]);

    const removeFromCart = (pid: string, sname?: string) => setCart(prev => prev.filter(i => !(i.product.id === pid && i.selectedSize?.name === sname)));
    const updateCartQuantity = (pid: string, q: number, sname?: string) => setCart(prev => prev.map(i => (i.product.id === pid && i.selectedSize?.name === sname) ? { ...i, quantity: q } : i));
    const clearCart = () => setCart([]);
    
    const cartTotal = useMemo(() => {
        return cart.reduce((total, item) => {
            const basePrice = item.selectedSize?.price || item.product.discountPrice || item.product.price || 0;
            return total + (basePrice * item.quantity);
        }, 0);
    }, [cart]);

    const placeOrder = useCallback(async (addr: Address, dFee: number, coupCode?: string): Promise<string | null> => {
        if (!userId || cart.length === 0) return null;
        try {
            const qLast = query(collection(db, "orders"), orderBy("date", "desc"), limit(1));
            const lastSnap = await getDocs(qLast);
            let nextNumber = 1;
            if (!lastSnap.empty) {
                const lastOrder = lastSnap.docs[0].data() as Order;
                nextNumber = (lastOrder.orderNumber || 0) + 1;
            }

            let finalDeliveryFee = dFee;
            let finalCartTotal = cartTotal;
            let appliedDiscount = 0;
            let couponToUpdateId = null;

            if (coupCode?.trim()) {
                const coupon = coupons.find(c => c.code === coupCode.trim().toUpperCase());
                if (coupon) {
                    if (coupon.usedCount >= coupon.maxUses) {
                        toast({ title: "هذا الكود انتهى استخدامه", variant: "destructive" });
                        return null;
                    }

                    if (coupon.isFirstOrderOnly) {
                        const qOrders = query(collection(db, "orders"), where("userId", "==", userId), limit(1));
                        const orderSnap = await getDocs(qOrders);
                        if (!orderSnap.empty) {
                            toast({ title: "عذراً، هذا الكود للزبائن الجدد فقط", variant: "destructive" });
                            return null;
                        }
                    }

                    if (coupon.discountTarget === 'delivery') {
                        appliedDiscount = coupon.isFullDiscount ? finalDeliveryFee : Math.min(finalDeliveryFee, coupon.discountValue);
                        finalDeliveryFee -= appliedDiscount;
                        toast({ title: `تم تطبيق خصم ${coupon.isFullDiscount ? 'كامل' : formatCurrency(appliedDiscount)} على التوصيل ✅` });
                    } else {
                        appliedDiscount = coupon.isFullDiscount ? finalCartTotal : Math.min(finalCartTotal, coupon.discountValue);
                        finalCartTotal -= appliedDiscount;
                        toast({ title: `تم تطبيق خصم ${coupon.isFullDiscount ? 'كامل' : formatCurrency(appliedDiscount)} على طلبك ✅` });
                    }
                    couponToUpdateId = coupon.id;
                } else {
                    toast({ title: "كود الخصم غير صحيح", variant: "destructive" });
                    return null;
                }
            }
            
            const rest = restaurants.find(r => r.id === cart[0].product.restaurantId);

            // تصفية البيانات من أي قيم undefined لمنع أخطاء Firebase
            const orderData = JSON.parse(JSON.stringify({
                orderNumber: nextNumber, 
                userId, 
                items: cart, 
                total: finalCartTotal + finalDeliveryFee,
                date: new Date().toISOString(), 
                status: 'unassigned', 
                address: {
                    name: addr.name,
                    phone: addr.phone,
                    details: addr.details || '',
                    deliveryZone: addr.deliveryZone || 'عام',
                    latitude: addr.latitude || 0,
                    longitude: addr.longitude || 0
                }, 
                deliveryFee: finalDeliveryFee,
                restaurant: rest ? { 
                    id: rest.id, 
                    name: rest.name, 
                    latitude: rest.latitude || 0, 
                    longitude: rest.longitude || 0, 
                    commissionRate: rest.commissionRate || 10
                } : null,
                branchId: rest?.branchId || 'main',
                isPaid: false, 
                isFeePaid: false, 
                isOrderPaidToOffice: false,
                appliedCoupon: couponToUpdateId ? { code: coupCode?.toUpperCase() || '', discountAmount: appliedDiscount } : null
            }));

            const docRef = await addDoc(collection(db, "orders"), orderData);
            
            if (couponToUpdateId) {
                await updateDoc(doc(db, "coupons", couponToUpdateId), {
                    usedCount: increment(1),
                    usedBy: arrayUnion(userId)
                });
            }

            clearCart();
            return docRef.id;
        } catch (e) {
            console.error("Order Creation Failed:", e);
            toast({ title: "عذراً، حدث خطأ في معالجة طلبك.", variant: "destructive" });
            return null;
        }
    }, [userId, cart, coupons, restaurants, cartTotal, toast]);

    const value = {
        isLoading: bannersLoading, isMainDataReady, placeOrder, createSupportTicket: createTicketHook, addMessageToTicket: (tid: string, m: Message) => updateDoc(doc(db, "supportTickets", tid), { history: arrayUnion(m) }),
        cart, addToCart, removeFromCart, updateCartQuantity, clearCart, cartTotal, userId, addresses, 
        addAddress: async (a: any) => { await addDoc(collection(db, "addresses"), { ...a, userId: userId || await syncUserByPhone(a.phone) }); },
        deleteAddress: (id: string) => updateDoc(doc(db, "addresses", id), { userId: 'deleted' }),
        mySupportTicket: useMemo(() => supportTickets.find(t => t.userId === userId && !t.isResolved), [userId, supportTickets]),
        startNewTicketClient: () => {},
        activeTab, previousTab, setActiveTab, selectedProductId, setSelectedProductId, selectedRestaurantId, setSelectedRestaurantId, syncUserByPhone,
        isDarkMode, toggleDarkMode
    };

    return <AppContext.Provider value={value as any}>{children}</AppContext.Provider>;
};

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('ar-IQ', { style: 'currency', currency: 'IQD', maximumFractionDigits: 0 }).format(amount).replace('د.ع.‏', 'د.ع');
}
