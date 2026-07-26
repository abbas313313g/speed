
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
import { useProducts } from '@/hooks/useProducts';
import { useSupportTickets } from '@/hooks/useSupportTickets';
import { useCoupons } from '@/hooks/useCoupons';
import { useTelegramConfigs } from '@/hooks/useTelegramConfigs';
import { useRestaurants } from '@/hooks/useRestaurants';

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
    addAddress: (address: Omit<Address, 'id'>) => Promise<void>;
    deleteAddress: (addressId: string) => void;
    mySupportTicket: SupportTicket | null;
    startNewTicketClient: () => void;
    activeTab: number;
    setActiveTab: (index: number, pushToHistory?: boolean) => void;
    selectedProductId: string | null;
    setSelectedProductId: (id: string | null) => void;
    selectedRestaurantId: string | null;
    setSelectedRestaurantId: (id: string | null) => void;
    filteredRestaurants: Restaurant[];
    filteredProducts: Product[];
    syncUserByPhone: (phone: string) => Promise<string | null>;
}

export const AppContext = createContext<AppContextType | null>(null);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
    const { toast } = useToast();
    const { products, isLoading: productsLoading } = useProducts();
    const { restaurants, isLoading: restaurantsLoading } = useRestaurants();
    const { supportTickets, isLoading: ticketsLoading, createSupportTicket: createTicketHook } = useSupportTickets();
    const { coupons, isLoading: couponsLoading } = useCoupons();
    const { telegramConfigs, isLoading: telegramLoading } = useTelegramConfigs();

    const [cart, setCart] = useState<CartItem[]>([]);
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [userId, setUserId] = useState<string|null>(null);
    const [isForceNewTicket, setIsForceNewTicket] = useState(false);
    const [activeTab, setActiveTabState] = useState(0);
    const [selectedProductId, setSelectedProductId] = useState<string|null>(null);
    const [selectedRestaurantId, setSelectedRestaurantId] = useState<string|null>(null);

    const isLoading = (productsLoading || restaurantsLoading || ticketsLoading || couponsLoading || telegramLoading);

    useEffect(() => {
        try {
            let id = safeStorage.get('speedShopUserId');
            if (!id) { 
                id = uuidv4(); 
                safeStorage.set('speedShopUserId', id); 
            }
            setUserId(id);

            const savedCart = safeStorage.get('speedShopCart');
            if(savedCart) setCart(JSON.parse(savedCart));
            
            if (window.history.state === null) {
                window.history.replaceState({ tab: 0 }, '');
            }
        } catch (e) {}

        const handlePopState = (event: PopStateEvent) => {
            try {
                if (event.state && typeof event.state.tab === 'number') {
                    setActiveTabState(event.state.tab);
                } else {
                    setActiveTabState(0);
                }
            } catch(e) {}
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    useEffect(() => {
        if (!userId) return;

        const q = query(collection(db, "addresses"), where("userId", "==", userId));
        const unsub = onSnapshot(q, (snapshot) => {
            const addrData = snapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data() 
            })) as Address[];
            setAddresses(addrData.sort((a: any, b: any) => (b.createdAt || 0) > (a.createdAt || 0) ? 1 : -1));
        }, (error) => {
            console.error("Firestore addresses sync error:", error);
        });

        return () => unsub();
    }, [userId]);

    const setActiveTab = useCallback((index: number, pushToHistory = true) => {
        setActiveTabState(index);
        if (pushToHistory) {
            try {
                window.history.pushState({ tab: index }, '');
            } catch (e) {}
        }
    }, []);

    useEffect(() => { 
        if (!isLoading) {
            try {
                safeStorage.set('speedShopCart', JSON.stringify(cart)); 
            } catch (e) {}
        }
    }, [cart, isLoading]);

    // وظيفة استرجاع حساب المستخدم القديم برقم الهاتف
    const syncUserByPhone = useCallback(async (phone: string): Promise<string | null> => {
        if (!phone) return null;
        try {
            const q = query(collection(db, "addresses"), where("phone", "==", phone), limit(1));
            const snap = await getDocs(q);
            if (!snap.empty) {
                const oldUserId = snap.docs[0].data().userId;
                if (oldUserId) {
                    setUserId(oldUserId);
                    safeStorage.set('speedShopUserId', oldUserId);
                    return oldUserId;
                }
            }
        } catch (e) {
            console.error("Sync user by phone failed:", e);
        }
        return null;
    }, []);

    const filteredRestaurants = useMemo(() => {
        let list = [...restaurants];
        const currentAddr = addresses[0];
        if (currentAddr?.latitude && currentAddr?.longitude) {
            list = list.filter(r => {
                if (!r.latitude || !r.longitude) return true;
                const dist = calculateDistance(currentAddr.latitude!, currentAddr.longitude!, r.latitude, r.longitude);
                return dist <= 20;
            });
        }
        return list.sort((a, b) => {
            if (a.isStoreOpen === b.isStoreOpen) return 0;
            return a.isStoreOpen ? -1 : 1;
        });
    }, [restaurants, addresses]);

    const filteredProducts = useMemo(() => {
        const list = products.filter(p => {
            const isApproved = p.status === 'approved';
            const isActive = p.isActive !== false;
            const restaurantVisible = filteredRestaurants.some(r => r.id === p.restaurantId);
            return isApproved && isActive && restaurantVisible;
        });
        
        return list.sort((a, b) => {
            const aOpen = filteredRestaurants.find(r => r.id === a.restaurantId)?.isStoreOpen;
            const bOpen = filteredRestaurants.find(r => r.id === b.restaurantId)?.isStoreOpen;
            if (aOpen === bOpen) return 0;
            return aOpen ? -1 : 1;
        });
    }, [products, filteredRestaurants]);

    const addToCart = useCallback((product: Product, quantity: number, selectedSize?: ProductSize): boolean => {
        if (product.sizes && product.sizes.length > 0 && !selectedSize) {
            toast({ title: "تنبيه", description: "يرجى اختيار الحجم والنوع أولاً." });
            return false;
        }
        const restaurantId = product.restaurantId;
        if (cart.length > 0 && cart[0].product.restaurantId !== restaurantId) {
            toast({
                title: "بدء سلة جديدة؟",
                description: "لديك منتجات من متجر آخر. هل تريد إفراغ السلة والبدء من هذا المتجر؟",
                action: <ToastAction altText="نعم" onClick={() => setCart([{ product, quantity, selectedSize }])}>نعم</ToastAction>,
            });
            return false;
        }
        setCart(prevCart => {
            const idx = prevCart.findIndex(item => item.product.id === product.id && item.selectedSize?.name === selectedSize?.name);
            if (idx > -1) {
                const updated = [...prevCart];
                updated[idx].quantity += quantity;
                return updated;
            }
            return [...prevCart, { product, quantity, selectedSize }];
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
    
    const clearCart = useCallback(() => { 
        setCart([]); 
        safeStorage.remove('speedShopCart'); 
    }, []);

    const cartTotal = useMemo(() => cart.reduce((total, item) => {
        const price = item.selectedSize?.price || item.product.discountPrice || item.product.price || 0;
        return total + price * item.quantity;
    }, 0), [cart]);

    const addAddress = useCallback(async (addr: Omit<Address, 'id'>) => { 
        let targetId = userId;
        // محاولة ربط المستخدم بالرقم إذا لم يكن مسجلاً محلياً
        if (addr.phone) {
            const foundId = await syncUserByPhone(addr.phone);
            if (foundId) targetId = foundId;
        }

        if (!targetId) return;

        try {
            await addDoc(collection(db, "addresses"), {
                ...addr,
                userId: targetId,
                createdAt: new Date().toISOString()
            });
            toast({ title: "تم حفظ العنوان سحابياً بنجاح ✅" });
        } catch (e) {
            toast({ title: "فشل حفظ العنوان", variant: "destructive" });
        }
    }, [userId, toast, syncUserByPhone]);

    const deleteAddress = useCallback(async (id: string) => { 
        try {
            await deleteDoc(doc(db, "addresses", id));
            toast({ title: "تم حذف العنوان" });
        } catch (e) {
            toast({ title: "فشل الحذف", variant: "destructive" });
        }
    }, [toast]);
    
    const mySupportTicket = useMemo(() => {
        if (isForceNewTicket || !userId) return null;
        const userTickets = supportTickets.filter(t => t.userId === userId);
        if (userTickets.length === 0) return null;
        return [...userTickets].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).find(t => !t.isResolved) || null;
    }, [userId, supportTickets, isForceNewTicket]);
    
    const startNewTicketClient = useCallback(() => setIsForceNewTicket(true), []);
    const addMessageToTicket = useCallback(async (tid: string, msg: Message) => {
        try { await updateDoc(doc(db, "supportTickets", tid), { history: arrayUnion(msg) }); } catch (e) {}
    }, []);
    
    const createSupportTicket = useCallback(async (msg: Message) => {
        if (!userId) return;
        setIsForceNewTicket(false);
        if (mySupportTicket && !mySupportTicket.isResolved) { await addMessageToTicket(mySupportTicket.id, msg); return; }
        const userName = addresses[0]?.name || `مستخدم ${userId.substring(0, 4)}`;
        const userZone = addresses[0]?.deliveryZone;
        await createTicketHook(msg, userId, userName, userZone);
    }, [userId, mySupportTicket, addresses, createTicketHook, addMessageToTicket]);

    const placeOrder = useCallback(async (addr: Address, dFee: number, coup?: string): Promise<string | null> => {
        let curId = userId || safeStorage.get('speedShopUserId');
        if (!curId || cart.length === 0) return null;
        
        let finalOrderId: string | null = null;
        const curCart = [...cart];
        
        try {
            await runTransaction(db, async (tx) => {
                let cData: Coupon | null = null;
                if (coup?.trim()) {
                    const fC = coupons.find(c => c.code === coup.trim().toUpperCase());
                    if (fC) {
                        const cSnap = await tx.get(doc(db, "coupons", fC.id));
                        if (cSnap.exists()) cData = { id: cSnap.id, ...cSnap.data() } as Coupon;
                    }
                }
                
                if (coup?.trim() && !cData) throw new Error("USER_ERROR: كود الخصم غير صحيح.");
                
                if (cData) {
                    if (cData.usedCount >= cData.maxUses) throw new Error("USER_ERROR: الكود وصل للحد الأقصى للاستخدام.");
                    if (cData.usedBy?.includes(curId!)) throw new Error("USER_ERROR: لقد استخدمت هذا الكود مسبقاً.");
                    if (cData.restaurantId && cData.restaurantId !== curCart[0].product.restaurantId) throw new Error("USER_ERROR: هذا الكود مخصص لمتجر آخر.");
                    
                    if (cData.isFirstOrderOnly) {
                        const ordersQuery = query(collection(db, "orders"), where("userId", "==", curId));
                        const ordersSnap = await getDocs(ordersQuery);
                        if (!ordersSnap.empty) throw new Error("USER_ERROR: هذا الكود مخصص للطلب الأول فقط.");
                    }
                }

                let tProfit = 0; 
                let curCartTotal = 0;
                
                for (const item of curCart) {
                    const pSnap = await tx.get(doc(db, "products", item.product.id));
                    if (!pSnap.exists()) throw new Error("USER_ERROR: أحد المنتجات لم يعد متوفراً.");
                    
                    const sProd = pSnap.data() as Product;
                    const price = item.selectedSize?.price || sProd.discountPrice || sProd.price || 0;
                    
                    curCartTotal += (price * item.quantity);
                    tProfit += (price - (sProd.wholesalePrice || 0)) * item.quantity;
                    
                    if (!sProd.isUnlimitedStock) {
                        if (item.selectedSize) {
                            const nSizes = [...(sProd.sizes || [])];
                            const sIdx = nSizes.findIndex(s => s.name === item.selectedSize!.name);
                            if (sIdx !== -1 && !nSizes[sIdx].isUnlimited) {
                                if (nSizes[sIdx].stock < item.quantity) throw new Error(`USER_ERROR: الكمية المطلوبة من ${item.product.name} غير متوفرة.`);
                                nSizes[sIdx].stock -= item.quantity;
                                tx.update(doc(db, "products", item.product.id), { sizes: nSizes });
                            }
                        } else {
                            if ((sProd.stock || 0) < item.quantity) throw new Error(`USER_ERROR: الكمية المطلوبة من ${item.product.name} غير متوفرة.`);
                            tx.update(doc(db, "products", item.product.id), { stock: (sProd.stock || 0) - item.quantity });
                        }
                    }
                }
                
                let disc = 0; 
                let cInfo: any = null;
                if (cData) { 
                    disc = cData.discountValue; 
                    cInfo = { code: cData.code, discountAmount: disc }; 
                    tx.update(doc(db, "coupons", cData.id), { 
                        usedCount: (cData.usedCount || 0) + 1, 
                        usedBy: arrayUnion(curId!) 
                    }); 
                }
                
                const fTotal = Math.max(0, curCartTotal - disc) + dFee;
                const nORef = doc(collection(db, "orders"));
                finalOrderId = nORef.id;
                
                const rest = restaurants.find(r => r.id === curCart[0].product.restaurantId);
                
                const nOData: any = {
                    userId: curId,
                    items: curCart,
                    total: fTotal,
                    date: new Date().toISOString(),
                    status: 'unassigned',
                    estimatedDelivery: new Date(Date.now() + 45*60*1000).toISOString(),
                    address: addr,
                    profit: tProfit,
                    deliveryFee: dFee,
                    deliveryWorkerId: null,
                    deliveryWorker: null,
                    isPaid: false,
                    isFeePaid: false,
                    isOrderPaidToOffice: false,
                    appliedCoupon: cInfo,
                    restaurant: rest ? { 
                        id: rest.id, 
                        name: rest.name, 
                        latitude: rest.latitude || null, 
                        longitude: rest.longitude || null 
                    } : null,
                    branchId: rest?.branchId || 'main'
                };
                
                tx.set(nORef, JSON.parse(JSON.stringify(nOData)));
            });
            
            clearCart();
            return finalOrderId;
        } catch (e: any) { 
            const errorMsg = e.message.includes("USER_ERROR") 
                ? e.message.replace("USER_ERROR: ", "") 
                : "حدث خطأ فني أثناء محاولة إتمام الطلب، يرجى المحاولة لاحقاً.";
            
            toast({ 
                title: "فشل الطلب", 
                description: errorMsg, 
                variant: "destructive" 
            }); 
            return null; 
        }
    }, [userId, cart, coupons, restaurants, clearCart, toast]);
    
    const value = useMemo(() => ({
        isLoading, placeOrder, createSupportTicket, addMessageToTicket, cart, addToCart, removeFromCart, updateCartQuantity, clearCart, cartTotal,
        userId, addresses, addAddress, deleteAddress, mySupportTicket, startNewTicketClient, activeTab, setActiveTab, selectedProductId, setSelectedProductId, selectedRestaurantId, setSelectedRestaurantId,
        filteredRestaurants, filteredProducts, syncUserByPhone
    }), [isLoading, cart, addresses, userId, mySupportTicket, activeTab, filteredRestaurants, filteredProducts, setActiveTab, placeOrder, createSupportTicket, addMessageToTicket, addToCart, removeFromCart, updateCartQuantity, clearCart, cartTotal, addAddress, deleteAddress, startNewTicketClient, setSelectedProductId, setSelectedRestaurantId, syncUserByPhone]);

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
