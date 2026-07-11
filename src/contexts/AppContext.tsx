
"use client";

import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { collection, doc, runTransaction, arrayUnion, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/hooks/use-toast';
import { sendTelegramMessage } from '@/lib/telegram';
import { formatCurrency, calculateDistance } from '@/lib/utils';
import { ToastAction } from '@/components/ui/toast';
import type { 
    Product, Order, SupportTicket, Coupon, Address, CartItem, Message, ProductSize, Restaurant
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
    filteredRestaurants: Restaurant[];
    filteredProducts: Product[];
}

export const AppContext = createContext<AppContextType | null>(null);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
    const { toast } = useToast();
    const { products, isLoading: productsLoading } = useProducts();
    const { restaurants, isLoading: restaurantsLoading } = useRestaurants();
    const { supportTickets, isLoading: ticketsLoading, createSupportTicket: createTicketHook } = useSupportTickets();
    const { coupons, isLoading: couponsLoading } = useCoupons();
    const { telegramConfigs, isLoading: telegramLoading } = useTelegramConfigs();
    const { allOrders, isLoading: ordersLoading } = useOrders();

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
        if (!id) { id = uuidv4(); localStorage.setItem('speedShopUserId', id); }
        setUserId(id);
        try {
            const savedCart = localStorage.getItem('speedShopCart');
            if(savedCart) setCart(JSON.parse(savedCart));
            const savedAddresses = localStorage.getItem('speedShopAddresses');
            if(savedAddresses) setAddresses(JSON.parse(savedAddresses));
        } catch (e) {}
    }, []);

    useEffect(() => { if (!isLoading) localStorage.setItem('speedShopCart', JSON.stringify(cart)); }, [cart, isLoading]);
    useEffect(() => { if (!isLoading) localStorage.setItem('speedShopAddresses', JSON.stringify(addresses)); }, [addresses, isLoading]);

    // فلترة المتاجر بناءً على المسافة (20كم) وحالة المنتج (مقبول)
    const currentAddr = addresses[0];
    const filteredRestaurants = useMemo(() => {
        if (!currentAddr?.latitude || !currentAddr?.longitude) return restaurants;
        return restaurants.filter(r => {
            if (!r.latitude || !r.longitude) return true;
            const dist = calculateDistance(currentAddr.latitude!, currentAddr.longitude!, r.latitude, r.longitude);
            return dist <= 20;
        });
    }, [restaurants, currentAddr]);

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const isApproved = p.status === 'approved';
            const restaurantVisible = filteredRestaurants.some(r => r.id === p.restaurantId);
            return isApproved && restaurantVisible;
        });
    }, [products, filteredRestaurants]);

    const addToCart = useCallback((product: Product, quantity: number, selectedSize?: ProductSize): boolean => {
        if (product.sizes && product.sizes.length > 0 && !selectedSize) {
            toast({ title: "تنبيه", description: "يرجى اختيار حجم المنتج أولاً." });
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
    
    const clearCart = useCallback(() => { setCart([]); localStorage.removeItem('speedShopCart'); }, []);

    const cartTotal = useMemo(() => cart.reduce((total, item) => {
        const price = item.selectedSize?.price ?? item.product.discountPrice ?? item.product.price ?? 0;
        return total + price * item.quantity;
    }, 0), [cart]);

    const addAddress = useCallback((addr: Omit<Address, 'id'>) => { setAddresses(prev => [{ ...addr, id: `addr_${uuidv4()}` }, ...prev]); }, []);
    const deleteAddress = useCallback((id: string) => { setAddresses(prev => prev.filter(a => a.id !== id)); }, []);
    
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
        await createTicketHook(msg, userId, userName);
    }, [userId, mySupportTicket, addresses, createTicketHook, addMessageToTicket]);

    const placeOrder = useCallback(async (addr: Address, dFee: number, coup?: string): Promise<string | null> => {
        const curId = userId || localStorage.getItem('speedShopUserId');
        if (!curId || cart.length === 0) return null;
        let newOId: string | null = null;
        const curCart = [...cart];
        try {
            await runTransaction(db, async (tx) => {
                const pRefs = curCart.map(i => doc(db, "products", i.product.id));
                const pSnaps = await Promise.all(pRefs.map(r => tx.get(ref)));
                let cData: Coupon | null = null;
                if (coup?.trim()) {
                    const fC = coupons.find(c => c.code === coup.trim().toUpperCase());
                    if (fC) {
                        const cSnap = await tx.get(doc(db, "coupons", fC.id));
                        if (cSnap.exists()) cData = { id: cSnap.id, ...cSnap.data() } as Coupon;
                    }
                }
                if (coup?.trim() && !cData) throw new Error("USER_ERROR: كود الخصم غير صحيح.");
                if (cData && (cData.usedCount >= cData.maxUses || cData.usedBy?.includes(curId))) throw new Error("USER_ERROR: الكود غير متاح.");

                let tProfit = 0; let curCartTotal = 0;
                const ups: any[] = [];
                for (let i = 0; i < pSnaps.length; i++) {
                    const item = curCart[i]; const sProd = pSnaps[i].data() as Product;
                    const price = item.selectedSize?.price ?? sProd.discountPrice ?? sProd.price ?? 0;
                    curCartTotal += (price * item.quantity);
                    tProfit += (price - (sProd.wholesalePrice || 0)) * item.quantity;
                    if (item.selectedSize) {
                        const sIdx = sProd.sizes?.findIndex(s => s.name === item.selectedSize!.name);
                        if (sIdx === undefined || sIdx === -1 || sProd.sizes![sIdx].stock < item.quantity) throw new Error("USER_ERROR: كمية غير كافية.");
                        const nSizes = [...sProd.sizes!]; nSizes[sIdx].stock -= item.quantity;
                        ups.push({ ref: pRefs[i], data: { sizes: nSizes } });
                    } else {
                        if ((sProd.stock || 0) < item.quantity) throw new Error("USER_ERROR: كمية غير كافية.");
                        ups.push({ ref: pRefs[i], data: { stock: (sProd.stock || 0) - item.quantity } });
                    }
                }
                ups.forEach(u => tx.update(u.ref, u.data));
                let disc = 0; let cInfo: any = null;
                if (cData) { disc = cData.discountValue; cInfo = { code: cData.code, discountAmount: disc }; tx.update(doc(db, "coupons", cData.id), { usedCount: (cData.usedCount || 0) + 1, usedBy: arrayUnion(curId) }); }
                const fTotal = Math.max(0, curCartTotal - disc) + dFee;
                const nORef = doc(collection(db, "orders")); newOId = nORef.id;
                const rest = restaurants.find(r => r.id === curCart[0].product.restaurantId);
                const nOData: Omit<Order, 'id'> = {
                    userId: curId, items: curCart as any, total: fTotal, date: new Date().toISOString(), status: 'unassigned', estimatedDelivery: new Date(Date.now() + 45*60*1000).toISOString(),
                    address: addr, profit: tProfit, deliveryFee: dFee, deliveryWorkerId: null, deliveryWorker: null, isPaid: false, isFeePaid: false, isOrderPaidToOffice: false, appliedCoupon: cInfo,
                    restaurant: rest ? { id: rest.id, name: rest.name, latitude: rest.latitude || null, longitude: rest.longitude || null } : null
                };
                tx.set(nORef, nOData);
            });
            clearCart();
            if (newOId) telegramConfigs.filter(c => c.type === 'owner').forEach(c => sendTelegramMessage(c.chatId, `🎉 *طلب جديد!*\n*رقم:* \`${newOId?.substring(0, 6)}\`\n*الزبون:* ${addr.name}\n*المبلغ:* ${formatCurrency(cartTotal)}`));
            return newOId;
        } catch (e: any) { toast({ title: "فشل الطلب", description: e.message.includes("USER_ERROR") ? e.message.replace("USER_ERROR: ", "") : "حدث خطأ.", variant: "destructive" }); return null; }
    }, [userId, cart, coupons, restaurants, clearCart, telegramConfigs, toast]);
    
    const value = useMemo(() => ({
        isLoading, placeOrder, createSupportTicket, addMessageToTicket, cart, addToCart, removeFromCart, updateCartQuantity, clearCart, cartTotal,
        userId, addresses, addAddress, deleteAddress, mySupportTicket, startNewTicketClient, activeTab, setActiveTab, selectedProductId, setSelectedProductId, selectedRestaurantId, setSelectedRestaurantId,
        filteredRestaurants, filteredProducts
    }), [isLoading, cart, addresses, userId, mySupportTicket, activeTab, filteredRestaurants, filteredProducts]);
    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
