
"use client";

import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { collection, doc, runTransaction, arrayUnion, updateDoc, getDocs, query, where, onSnapshot, addDoc, deleteDoc, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/hooks/use-toast';
import { calculateDistance, safeStorage } from '@/lib/utils';
import { ToastAction } from '@/components/ui/toast';
import type { 
    Product, Order, SupportTicket, Coupon, Address, CartItem, Message, ProductSize, Restaurant
} from '@/lib/types';
import { useSupportTickets } from '@/hooks/useSupportTickets';
import { useCoupons } from '@/hooks/useCoupons';
import { useRestaurants } from '@/hooks/useRestaurants';
import { useBanners } from '@/hooks/useBanners';
import { useCategories } from '@/hooks/useCategories';

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
    filteredRestaurants: Restaurant[];
    syncUserByPhone: (phone: string) => Promise<string | null>;
}

export const AppContext = createContext<AppContextType | null>(null);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
    const { toast } = useToast();
    const { restaurants, isLoading: restaurantsLoading } = useRestaurants();
    const { banners, isLoading: bannersLoading } = useBanners();
    const { categories } = useCategories();
    const { supportTickets, createSupportTicket: createTicketHook } = useSupportTickets();
    const { coupons } = useCoupons();

    const [cart, setCart] = useState<CartItem[]>([]);
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [userId, setUserId] = useState<string|null>(null);
    const [isForceNewTicket, setIsForceNewTicket] = useState(false);
    const [activeTab, setActiveTabState] = useState(0);
    const [previousTab, setPreviousTab] = useState(0);
    const [selectedProductId, setSelectedProductId] = useState<string|null>(null);
    const [selectedRestaurantId, setSelectedRestaurantId] = useState<string|null>(null);

    // جاهزية لحظية: لا ننتظر أي منتجات، فقط أساسيات الواجهة
    const isMainDataReady = useMemo(() => {
        return !bannersLoading || banners.length > 0;
    }, [bannersLoading, banners.length]);

    useEffect(() => {
        try {
            let id = safeStorage.get('speedShopUserId');
            if (id) setUserId(id);
            const savedCart = safeStorage.get('speedShopCart');
            if(savedCart) setCart(JSON.parse(savedCart));
            if (window.history.state === null) window.history.replaceState({ tab: 0 }, '');
        } catch (e) {}

        const handlePopState = (event: PopStateEvent) => {
            if (event.state && typeof event.state.tab === 'number') setActiveTabState(event.state.tab);
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    useEffect(() => {
        if (!userId) return;
        const q = query(collection(db, "addresses"), where("userId", "==", userId));
        return onSnapshot(q, (snapshot) => {
            const addrData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Address[];
            setAddresses(addrData.sort((a: any, b: any) => (b.createdAt || 0) > (a.createdAt || 0) ? 1 : -1));
        });
    }, [userId]);

    const setActiveTab = useCallback((index: number, pushToHistory = true) => {
        if (activeTab !== index) setPreviousTab(activeTab);
        setActiveTabState(index);
        if (pushToHistory) window.history.pushState({ tab: index }, '');
    }, [activeTab]);

    useEffect(() => { 
        safeStorage.set('speedShopCart', JSON.stringify(cart)); 
    }, [cart]);

    const syncUserByPhone = useCallback(async (phone: string): Promise<string | null> => {
        if (!phone) return null;
        const q = query(collection(db, "addresses"), where("phone", "==", phone), limit(1));
        const snap = await getDocs(q);
        const targetId = !snap.empty ? snap.docs[0].data().userId : uuidv4();
        setUserId(targetId);
        safeStorage.set('speedShopUserId', targetId);
        return targetId;
    }, []);

    const filteredRestaurants = useMemo(() => {
        let list = [...restaurants];
        const currentAddr = addresses[0];
        if (currentAddr?.latitude && currentAddr?.longitude) {
            list = list.filter(r => {
                if (!r.latitude || !r.longitude) return true;
                return calculateDistance(currentAddr.latitude!, currentAddr.longitude!, r.latitude, r.longitude) <= 22;
            });
        }
        return list.sort((a, b) => (a.isStoreOpen === b.isStoreOpen ? 0 : a.isStoreOpen ? -1 : 1));
    }, [restaurants, addresses]);

    const addToCart = useCallback((product: Product, quantity: number, selectedSize?: ProductSize): boolean => {
        if (product.sizes?.length && !selectedSize) return false;
        if (cart.length > 0 && cart[0].product.restaurantId !== product.restaurantId) {
            toast({
                title: "بدء سلة جديدة؟",
                description: "لديك منتجات من متجر آخر.",
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

    const removeFromCart = useCallback((productId: string, sizeName?: string) => {
        setCart(prev => prev.filter(item => !(item.product.id === productId && item.selectedSize?.name === sizeName)));
    }, []);

    const updateCartQuantity = useCallback((productId: string, quantity: number, sizeName?: string) => {
        if (quantity < 1) { removeFromCart(productId, sizeName); return; }
        setCart(prev => prev.map(item => (item.product.id === productId && item.selectedSize?.name === sizeName) ? { ...item, quantity } : item));
    }, [removeFromCart]);
    
    const clearCart = useCallback(() => { setCart([]); safeStorage.remove('speedShopCart'); }, []);
    const cartTotal = useMemo(() => cart.reduce((t, i) => t + (i.selectedSize?.price || i.product.discountPrice || i.product.price) * i.quantity, 0), [cart]);

    const addAddress = useCallback(async (addr: Omit<Address, 'id'>) => { 
        let targetId = userId || await syncUserByPhone(addr.phone);
        if (!targetId) return;
        await addDoc(collection(db, "addresses"), { ...addr, userId: targetId, createdAt: new Date().toISOString() });
        toast({ title: "تم حفظ العنوان بنجاح ✅" });
    }, [userId, toast, syncUserByPhone]);

    const deleteAddress = (id: string) => deleteDoc(doc(db, "addresses", id)).then(() => toast({ title: "تم حذف العنوان" }));
    
    const mySupportTicket = useMemo(() => {
        if (isForceNewTicket || !userId) return null;
        return supportTickets.filter(t => t.userId === userId).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).find(t => !t.isResolved) || null;
    }, [userId, supportTickets, isForceNewTicket]);
    
    const startNewTicketClient = () => setIsForceNewTicket(true);
    const addMessageToTicket = (tid: string, msg: Message) => updateDoc(doc(db, "supportTickets", tid), { history: arrayUnion(msg) });
    
    const createSupportTicket = async (msg: Message) => {
        if (!userId) return;
        setIsForceNewTicket(false);
        const userName = addresses[0]?.name || `مستخدم ${userId.substring(0, 4)}`;
        await createTicketHook(msg, userId, userName, addresses[0]?.deliveryZone);
    };

    const placeOrder = useCallback(async (addr: Address, dFee: number, coup?: string): Promise<string | null> => {
        let curId = userId; if (!curId || cart.length === 0) return null;
        let finalOrderId: string | null = null;
        try {
            await runTransaction(db, async (tx) => {
                let disc = 0; let cData: Coupon | null = null;
                if (coup?.trim()) {
                    const fC = coupons.find(c => c.code === coup.trim().toUpperCase());
                    if (fC) {
                        const s = await tx.get(doc(db, "coupons", fC.id));
                        if (s.exists()) cData = { id: s.id, ...s.data() } as Coupon;
                    }
                }
                if (cData) {
                    tx.update(doc(db, "coupons", cData.id), { usedCount: (cData.usedCount || 0) + 1, usedBy: arrayUnion(curId!) });
                    disc = cData.discountValue;
                }
                const nORef = doc(collection(db, "orders"));
                finalOrderId = nORef.id;
                const rest = restaurants.find(r => r.id === cart[0].product.restaurantId);
                tx.set(nORef, {
                    userId: curId, items: cart, total: Math.max(0, cartTotal - disc) + dFee,
                    date: new Date().toISOString(), status: 'unassigned', address: addr, deliveryFee: dFee,
                    restaurant: rest ? { id: rest.id, name: rest.name, latitude: rest.latitude, longitude: rest.longitude } : null,
                    branchId: rest?.branchId || 'main'
                });
            });
            clearCart(); return finalOrderId;
        } catch (e: any) { toast({ title: "فشل الطلب", variant: "destructive" }); return null; }
    }, [userId, cart, coupons, restaurants, cartTotal, clearCart, toast]);
    
    const value = useMemo(() => ({
        isLoading: !isMainDataReady, isMainDataReady, placeOrder, createSupportTicket, addMessageToTicket, cart, addToCart, removeFromCart, updateCartQuantity, clearCart, cartTotal,
        userId, addresses, addAddress, deleteAddress, mySupportTicket, startNewTicketClient, activeTab, previousTab, setActiveTab, selectedProductId, setSelectedProductId, selectedRestaurantId, setSelectedRestaurantId,
        filteredRestaurants, syncUserByPhone
    }), [isMainDataReady, cart, addresses, userId, mySupportTicket, activeTab, previousTab, filteredRestaurants, setActiveTab, placeOrder, createSupportTicket, addMessageToTicket, addToCart, removeFromCart, updateCartQuantity, clearCart, cartTotal, addAddress, deleteAddress, startNewTicketClient, setSelectedProductId, setSelectedRestaurantId, syncUserByPhone]);

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
