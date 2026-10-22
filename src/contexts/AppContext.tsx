
"use client";

import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { collection, doc, arrayUnion, updateDoc, getDocs, query, where, onSnapshot, addDoc, limit, orderBy, increment, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/hooks/use-toast';
import { safeStorage, formatCurrency } from '@/lib/utils';
import { ToastAction } from '@/components/ui/toast';
import type { 
    Product, SupportTicket, Coupon, Address, CartItem, Message, ProductSize, Restaurant, Order, OrderStatus, User
} from '@/lib/types';
import { useSupportTickets } from '@/hooks/useSupportTickets';
import { useCoupons } from '@/hooks/useCoupons';
import { useRestaurants } from '@/hooks/useRestaurants';
import { useBanners } from '@/hooks/useBanners';
import { useOrders } from '@/hooks/useOrders';
import { useTelegramConfigs } from '@/hooks/useTelegramConfigs';
import { sendFcmNotification } from '@/services/fcm-service';
import { sendRestaurantOrderNotification } from '@/services/onesignal-service';
import { sendTelegramMessage } from '@/lib/telegram';

interface AppContextType {
    isLoading: boolean;
    isMainDataReady: boolean;
    placeOrder: (address: Address, deliveryFee: number, couponCode?: string, walletDiscount?: number) => Promise<string | null>;
    createSupportTicket: (firstMessage: Message) => Promise<void>;
    addMessageToTicket: (ticketId: string, message: Message) => Promise<void>;
    cart: CartItem[];
    addToCart: (product: Product, quantity: number, selectedSize?: ProductSize) => boolean;
    removeFromCart: (productId: string, sizeName?: string) => void;
    updateCartQuantity: (productId: string, quantity: number, sizeName?: string) => void;
    clearCart: () => void;
    cartTotal: number;
    userId: string | null;
    user: User | null;
    addresses: Address[];
    addAddress: (address: Omit<Address, 'id'>) => Promise<void>;
    deleteAddress: (addressId: string) => void;
    mySupportTickets: SupportTicket[];
    activeTab: number;
    previousTab: number;
    setActiveTab: (index: number, pushToHistory?: boolean) => void;
    selectedProductId: string | null;
    setSelectedProductId: (id: string | null) => void;
    selectedRestaurantId: string | null;
    setSelectedRestaurantId: (id: string | null) => void;
    syncUserByPhone: (phone: string) => Promise<string | null>;
    register: (name: string, phone: string, password: string) => Promise<boolean>;
    login: (phone: string, password: string) => Promise<boolean>;
    guestLogin: () => void;
    logout: () => void;
    isDarkMode: boolean;
    toggleDarkMode: () => void;
    walletBalance: number;
    showAddressSheet: boolean;
    setShowAddressSheet: (show: boolean) => void;
}

export const AppContext = createContext<AppContextType | null>(null);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
    const { toast } = useToast();
    const { restaurants, isLoading: restaurantsLoading } = useRestaurants();
    const { banners, isLoading: bannersLoading } = useBanners();
    const { allOrders, isLoading: ordersLoading } = useOrders();
    const { coupons } = useCoupons();
    const { telegramConfigs } = useTelegramConfigs();

    const [cart, setCart] = useState<CartItem[]>([]);
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [userId, setUserId] = useState<string|null>(null);
    const [user, setUser] = useState<User|null>(null);
    const [activeTab, setActiveTabState] = useState(0);
    const [previousTab, setPreviousTab] = useState(0);
    const [selectedProductId, setSelectedProductId] = useState<string|null>(null);
    const [selectedRestaurantId, setSelectedRestaurantId] = useState<string|null>(null);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [walletBalance, setWalletBalance] = useState(0);
    const [showAddressSheet, setShowAddressSheet] = useState(false);

    useEffect(() => {
        try {
            let id = safeStorage.get('speedShopUserId');
            if (id) {
                setUserId(id);
                // جلب بيانات المستخدم من فيربيس
                getDoc(doc(db, "users", id)).then(docSnap => {
                    if (docSnap.exists()) {
                        setUser({ id, ...docSnap.data() } as User);
                    } else if (id === 'guest_user') {
                        setUser({ id: 'guest_user', name: 'ضيف سبيد', phone: '', isAdmin: false, isGuest: true });
                    }
                });
            }
            const savedCart = safeStorage.get('speedShopCart');
            if(savedCart) setCart(JSON.parse(savedCart));
            
            const savedTheme = safeStorage.get('speedShopTheme');
            if (savedTheme === 'dark') {
                setIsDarkMode(true);
                document.documentElement.classList.add('dark');
            }
        } catch (e) {}
    }, []);

    useEffect(() => {
        if (!userId || userId === 'guest_user') return;
        const unsub = onSnapshot(doc(db, "wallets", userId), (docSnap) => {
            if (docSnap.exists()) {
                setWalletBalance(docSnap.data().balance || 0);
            } else {
                setWalletBalance(0);
            }
        });
        return () => unsub();
    }, [userId]);

    const { supportTickets, createSupportTicket: createTicketHook, addMessageToTicket: addMsgHook } = useSupportTickets(undefined, userId || undefined);

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
        if (!userId || userId === 'guest_user') return;
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

    const register = async (name: string, phone: string, password: string) => {
        try {
            const q = query(collection(db, "users"), where("phone", "==", phone), limit(1));
            const snap = await getDocs(q);
            if (!snap.empty) {
                toast({ title: "هذا الرقم مسجل مسبقاً", variant: "destructive" });
                return false;
            }
            const newId = uuidv4();
            const userData = { name, phone, password, isAdmin: false, createdAt: new Date().toISOString() };
            await setDoc(doc(db, "users", newId), userData);
            setUserId(newId);
            setUser({ id: newId, ...userData } as User);
            safeStorage.set('speedShopUserId', newId);
            toast({ title: "تم إنشاء الحساب بنجاح! 🎉" });
            return true;
        } catch (e) { return false; }
    };

    const login = async (phone: string, password: string) => {
        try {
            const q = query(collection(db, "users"), where("phone", "==", phone), where("password", "==", password), limit(1));
            const snap = await getDocs(q);
            if (snap.empty) {
                toast({ title: "الرقم أو كلمة المرور غير صحيحة", variant: "destructive" });
                return false;
            }
            const data = snap.docs[0].data();
            const id = snap.docs[0].id;
            setUserId(id);
            setUser({ id, ...data } as User);
            safeStorage.set('speedShopUserId', id);
            toast({ title: "تم تسجيل الدخول بنجاح ✅" });
            return true;
        } catch (e) { return false; }
    };

    const guestLogin = () => {
        const id = 'guest_user';
        setUserId(id);
        setUser({ id, name: 'ضيف سبيد', phone: '', isAdmin: false, isGuest: true });
        safeStorage.set('speedShopUserId', id);
        toast({ title: "أهلاً بك كضيف في سبيد شوب!" });
    };

    const logout = () => {
        setUserId(null);
        setUser(null);
        setAddresses([]);
        setCart([]);
        safeStorage.remove('speedShopUserId');
        safeStorage.remove('speedShopCart');
        window.location.reload();
    };

    const syncUserByPhone = useCallback(async (phone: string): Promise<string | null> => {
        try {
            const q = query(collection(db, "users"), where("phone", "==", phone), limit(1));
            const snap = await getDocs(q);
            if (!snap.empty) {
                const id = snap.docs[0].id;
                setUserId(id);
                safeStorage.set('speedShopUserId', id);
                return id;
            }
            return null;
        } catch (e) { return null; }
    }, []);

    const addAddress = useCallback(async (a: Omit<Address, 'id' | 'userId'>) => {
        try {
            if (!userId || userId === 'guest_user') {
                toast({ title: "يرجى تسجيل الدخول أولاً", variant: "destructive" });
                return;
            }
            await addDoc(collection(db, "addresses"), { ...a, userId });
        } catch (e) {
            console.error("AppContext Add Address Error:", e);
            throw e;
        }
    }, [userId, toast]);

    const addToCart = useCallback((product: Product, quantity: number, selectedSize?: ProductSize): boolean => {
        // التحقق من وجود عنوان قبل الإضافة
        if (addresses.length === 0) {
            toast({ title: "يرجى إضافة عنوان أولاً", description: "نحتاج لموقعك لتحديد التكاليف وتوفر الخدمة." });
            setShowAddressSheet(true);
            return false;
        }

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
    }, [cart, toast, addresses.length]);

    const removeFromCart = (pid: string, sname?: string) => setCart(prev => prev.filter(i => !(i.product.id === pid && i.selectedSize?.name === sname)));
    const updateCartQuantity = (pid: string, q: number, sname?: string) => setCart(prev => prev.map(i => (i.product.id === pid && i.selectedSize?.name === sname) ? { ...i, quantity: q } : i));
    const createSupportTicket = (m: Message) => createTicketHook(m, userId!, addresses[0]?.name || 'زبون سبيد', addresses[0]?.deliveryZone);
    const clearCart = () => setCart([]);
    
    const cartTotal = useMemo(() => {
        return cart.reduce((total, item) => {
            const rest = restaurants.find(r => r.id === item.product.restaurantId);
            const globalDiscount = rest?.discountPercentage || 0;
            const getAdjusted = (p: number) => globalDiscount > 0 ? p * (1 - globalDiscount/100) : p;
            const basePrice = item.selectedSize ? getAdjusted(item.selectedSize.price) : (item.product.discountPrice || getAdjusted(item.product.price));
            return total + (basePrice * item.quantity);
        }, 0);
    }, [cart, restaurants]);

    const placeOrder = useCallback(async (addr: Address, dFee: number, couponCode?: string, walletDiscount = 0): Promise<string | null> => {
        if (!userId || cart.length === 0) return null;
        
        try {
            const nextNumPromise = getDocs(query(collection(db, "orders"), orderBy("orderNumber", "desc"), limit(1)));
            const coupon = couponCode?.trim() ? coupons.find(c => c.code === couponCode.trim().toUpperCase()) : null;
            let historyCheckPromise = Promise.resolve(null as any);
            if (coupon?.isFirstOrderOnly) {
                historyCheckPromise = getDocs(query(collection(db, "orders"), where("userId", "==", userId), limit(1)));
            }

            const [lastSnap, historySnap] = await Promise.all([nextNumPromise, historyCheckPromise]);

            let nextNumber = 1;
            if (!lastSnap.empty) {
                nextNumber = (lastSnap.docs[0].data().orderNumber || 0) + 1;
            }

            let customerDeliveryFee = dFee;
            let finalCartTotal = cartTotal;
            let appliedDiscount = 0;
            let couponToUpdateId = null;

            if (coupon) {
                if (coupon.usedCount >= coupon.maxUses) {
                    toast({ title: "هذا الكود انتهى استخدامه", variant: "destructive" });
                    return null;
                }
                if (coupon.isFirstOrderOnly && historySnap && !historySnap.empty) {
                    toast({ title: "عذراً، هذا الكود للزبائن الجدد فقط", variant: "destructive" });
                    return null;
                }
                if (coupon.discountTarget === 'delivery') {
                    appliedDiscount = coupon.isFullDiscount ? customerDeliveryFee : Math.min(customerDeliveryFee, coupon.discountValue);
                    customerDeliveryFee -= appliedDiscount;
                } else {
                    appliedDiscount = coupon.isFullDiscount ? finalCartTotal : Math.min(finalCartTotal, coupon.discountValue);
                    finalCartTotal -= appliedDiscount;
                }
                couponToUpdateId = coupon.id;
            }
            
            const rest = restaurants.find(r => r.id === cart[0].product.restaurantId);
            const currentBranchId = rest?.branchId || 'main';

            const finalCashTotal = Math.max(0, finalCartTotal + customerDeliveryFee - walletDiscount);

            const orderData = {
                orderNumber: nextNumber, 
                userId, 
                items: cart.map(i => ({
                    product: { 
                      id: i.product.id || '', 
                      name: i.product.name || '', 
                      price: i.product.price || 0, 
                      discountPrice: i.product.discountPrice || 0, 
                      image: i.product.image || '', 
                      restaurantId: i.product.restaurantId || '' 
                    },
                    quantity: i.quantity || 1,
                    selectedSize: i.selectedSize ? { name: i.selectedSize.name || '', price: i.selectedSize.price || 0 } : null
                })), 
                total: finalCashTotal,
                walletAmountUsed: walletDiscount,
                date: new Date().toISOString(), 
                status: 'unassigned' as OrderStatus, 
                address: {
                    name: addr.name || '', phone: addr.phone || '', details: addr.details || '',
                    deliveryZone: addr.deliveryZone || 'عام', latitude: addr.latitude || 0, longitude: addr.longitude || 0
                }, 
                deliveryFee: dFee || 0, 
                restaurant: rest ? { 
                    id: rest.id, name: rest.name, latitude: rest.latitude || 0, longitude: rest.longitude || 0, 
                    commissionRate: rest.commissionRate || 10, discountPercentage: rest.discountPercentage || 0,
                    oneSignalId: rest.oneSignalId || '', oneSignalWebId: rest.oneSignalWebId || '',
                    notificationPreference: rest.notificationPreference || 'app'
                } : null,
                branchId: currentBranchId,
                isPaid: false, isFeePaid: false, isOrderPaidToOffice: false,
                appliedCoupon: couponToUpdateId ? { code: couponCode?.toUpperCase() || '', discountAmount: appliedDiscount } : null
            };

            const docRef = await addDoc(collection(db, "orders"), orderData);
            
            if (walletDiscount > 0) {
                updateDoc(doc(db, "wallets", userId), { balance: increment(-walletDiscount) }).catch(() => {});
            }

            if (couponToUpdateId) {
                updateDoc(doc(db, "coupons", couponToUpdateId), {
                    usedCount: increment(1), usedBy: arrayUnion(userId)
                }).catch(() => {});
            }

            const adminTelegramConfigs = telegramConfigs.filter(c => c.type === 'admin_orders');
            if (adminTelegramConfigs.length > 0) {
                const orderSummary = `🔔 *طلب جديد وصل!*
📌 *رقم القائمة:* #${nextNumber}
🏠 *المتجر:* ${rest?.name || 'غير معروف'}
📍 *المنطقة:* ${addr.deliveryZone}
💰 *كاش الزبون:* ${formatCurrency(finalCashTotal)}
${walletDiscount > 0 ? `👛 *مخصوم من المحفظة:* ${formatCurrency(walletDiscount)}\n` : ''}🏙️ *الفرع:* ${currentBranchId === 'main' ? 'المركز الرئيسي' : currentBranchId}
📞 *هاتف الزبون:* ${addr.phone}`;

                adminTelegramConfigs.forEach(config => {
                    if (config.targetBranchId === 'all' || config.targetBranchId === currentBranchId) {
                        sendTelegramMessage(config.chatId, orderSummary).catch(() => {});
                    }
                });
            }

            if (rest) {
                const targetIds: string[] = [];
                const pref = rest.notificationPreference || 'app';
                if ((pref === 'app' || pref === 'both') && rest.oneSignalId) targetIds.push(rest.oneSignalId);
                if ((pref === 'web' || pref === 'both') && rest.oneSignalWebId) targetIds.push(rest.oneSignalWebId);
                if (targetIds.length > 0) sendRestaurantOrderNotification(targetIds, rest.name, nextNumber).catch(() => {});
                sendFcmNotification(rest.id, 'restaurants', 'طلب جديد وصل! 🍔', `لديك طلب جديد برقم #${nextNumber}`).catch(() => {});
            }

            clearCart();
            return docRef.id;
        } catch (e) {
            toast({ title: "عذراً، حدث خطأ في معالجة طلبك.", variant: "destructive" });
            return null;
        }
    }, [userId, cart, coupons, restaurants, cartTotal, toast, clearCart, telegramConfigs]);

    const isMainDataReady = useMemo(() => {
        return !bannersLoading && !restaurantsLoading && !ordersLoading;
    }, [bannersLoading, restaurantsLoading, ordersLoading]);

    const value = {
        isLoading: bannersLoading || restaurantsLoading || ordersLoading, 
        isMainDataReady, placeOrder, createSupportTicket, addMessageToTicket: addMsgHook,
        cart, addToCart, removeFromCart, updateCartQuantity, clearCart, cartTotal, userId, user, addresses, 
        addAddress, register, login, guestLogin, logout,
        deleteAddress: (id: string) => updateDoc(doc(db, "addresses", id), { userId: 'deleted' }),
        mySupportTickets: useMemo(() => supportTickets.filter(t => t.userId === userId).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [userId, supportTickets]),
        activeTab, previousTab, setActiveTab, selectedProductId, setSelectedProductId, selectedRestaurantId, setSelectedRestaurantId, syncUserByPhone,
        isDarkMode, toggleDarkMode, walletBalance, showAddressSheet, setShowAddressSheet
    };

    return <AppContext.Provider value={value as any}>{children}</AppContext.Provider>;
};
