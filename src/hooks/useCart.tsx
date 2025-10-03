
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from "@/hooks/use-toast";
import type { CartItem, Product, ProductSize, Address, Order, Coupon, Restaurant } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { runTransaction, doc, collection, query, where, getDocs, setDoc, arrayUnion, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { calculateDeliveryFee, calculateDistance } from '@/lib/utils';
import { ToastAction } from '@/components/ui/toast';

const getUserId = () => {
    if (typeof window === 'undefined') return '';
    let id = localStorage.getItem('speedShopUserId');
    if (!id) {
        id = uuidv4();
        localStorage.setItem('speedShopUserId', id);
    }
    return id;
};

export const useCart = (
    products: Product[], 
    restaurants: Restaurant[], 
    coupons: Coupon[], 
    setAllOrders: React.Dispatch<React.SetStateAction<Order[]>>,
    setProducts: (updater: (prev: Product[]) => Product[]) => void,
    setCoupons: (updater: (prev: Coupon[]) => Coupon[]) => void,
) => {
    const { toast } = useToast();
    const [cart, setCart] = useState<CartItem[]>([]);

    // Load cart from localStorage on initial render
    useEffect(() => {
        const savedCart = localStorage.getItem('speedShopCart');
        if (savedCart) {
            try {
                setCart(JSON.parse(savedCart));
            } catch (e) {
                console.error("Failed to parse cart from localStorage", e);
                localStorage.removeItem('speedShopCart');
            }
        }
    }, []);

    // Save cart to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('speedShopCart', JSON.stringify(cart));
    }, [cart]);

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
                    toast({
                        title: "تمت الإضافة إلى السلة",
                        description: `تمت إضافة ${product.name} إلى سلتك.`,
                    });
                }}>نعم، ابدأ</ToastAction>
            });
            return false;
        }

        setCart(prevCart => {
            const existingItemIndex = prevCart.findIndex(item =>
                item.product.id === product.id &&
                item.selectedSize?.name === selectedSize?.name
            );

            if (existingItemIndex > -1) {
                const updatedCart = [...prevCart];
                updatedCart[existingItemIndex].quantity += quantity;
                return updatedCart;
            }
            return [...prevCart, { product, quantity, selectedSize }];
        });
        return true;
    }, [cart, toast]);

    const removeFromCart = useCallback((productId: string, sizeName?: string) => {
        setCart(prevCart => prevCart.filter(item =>
            !(item.product.id === productId && item.selectedSize?.name === sizeName)
        ));
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

    const clearCart = useCallback(() => {
        setCart([]);
    }, []);

    const cartTotal = useMemo(() => {
        return cart.reduce((total, item) => {
            const price = item.selectedSize?.price ?? item.product.discountPrice ?? item.product.price;
            return total + price * item.quantity;
        }, 0);
    }, [cart]);

    const placeOrder = async (address: Address, couponCode?: string) => {
        const userId = getUserId();
        if (cart.length === 0) throw new Error("السلة فارغة.");
        
        const currentCart = [...cart];
        const cartRestaurant = restaurants.find(r => r.id === currentCart[0].product.restaurantId);
        if (!cartRestaurant) throw new Error("لم يتم العثور على المتجر الخاص بالطلب.");

        try {
            const orderId = await runTransaction(db, async (transaction) => {
                const productRefsAndItems = currentCart.map(item => ({
                    ref: doc(db, "products", item.product.id),
                    item: item
                }));

                const productSnaps = await Promise.all(productRefsAndItems.map(p => transaction.get(p.ref)));

                let couponSnap: any = null;
                if (couponCode?.trim()) {
                    const matchingCoupon = coupons.find(c => c.code.toUpperCase() === couponCode.trim().toUpperCase());
                    if (matchingCoupon) {
                       const couponRef = doc(db, "coupons", matchingCoupon.id);
                       couponSnap = await transaction.get(couponRef);
                    } else {
                         throw new Error(`كود الخصم "${couponCode}" غير صالح.`);
                    }
                }

                // Pre-transaction validation
                for (let i = 0; i < productSnaps.length; i++) {
                    const productDoc = productSnaps[i];
                    const { item } = productRefsAndItems[i];
                    if (!productDoc.exists()) throw new Error(`منتج "${item.product.name}" لم يعد متوفرًا.`);
                    
                    const productData = productDoc.data() as Product;
                    if (item.selectedSize) {
                        const size = productData.sizes?.find(s => s.name === item.selectedSize!.name);
                        if (!size || size.stock < item.quantity) {
                            throw new Error(`الكمية المطلوبة من "${item.product.name} (${item.selectedSize.name})" غير متوفرة.`);
                        }
                    } else {
                         if ((productData.stock ?? 0) < item.quantity) {
                            throw new Error(`الكمية المطلوبة من "${item.product.name}" غير متوفرة.`);
                        }
                    }
                }
                
                let discountAmount = 0;
                let appliedCouponInfo: Order['appliedCoupon'] = null;
                if (couponSnap && couponSnap.exists()) {
                    const couponData = couponSnap.data() as Coupon;
                    if (couponData.usedCount >= couponData.maxUses) throw new Error("تم استخدام هذا الكود بالكامل.");
                    if (couponData.usedBy?.includes(userId)) throw new Error("لقد استخدمت هذا الكود من قبل.");
                    
                    discountAmount = couponData.discountValue;
                    appliedCouponInfo = { code: couponData.code, discountAmount: discountAmount };
                }

                // Calculations
                 const subtotal = currentCart.reduce((total, item) => {
                    const price = item.selectedSize?.price ?? item.product.discountPrice ?? item.product.price;
                    return total + price * item.quantity;
                }, 0);
                
                const profit = productSnaps.reduce((acc, productSnap, index) => {
                    const productData = productSnap.data() as Product;
                    const item = currentCart[index];
                    const itemPrice = item.selectedSize?.price ?? productData.discountPrice ?? productData.price;
                    const wholesalePrice = productData.wholesalePrice || 0;
                    return acc + ((itemPrice - wholesalePrice) * item.quantity);
                }, 0);

                const distance = (address.latitude && address.longitude && cartRestaurant.latitude && cartRestaurant.longitude)
                    ? calculateDistance(address.latitude, address.longitude, cartRestaurant.latitude, cartRestaurant.longitude)
                    : 0;
                const deliveryFee = calculateDeliveryFee(distance);
                const finalTotal = Math.max(0, subtotal - discountAmount) + deliveryFee;

                // Create Order
                const newOrderRef = doc(collection(db, "orders"));
                const newOrderData: Omit<Order, 'id'> = {
                    userId: userId,
                    items: currentCart,
                    total: finalTotal,
                    date: new Date().toISOString(),
                    status: 'unassigned',
                    estimatedDelivery: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
                    address: address,
                    profit: profit,
                    deliveryFee: deliveryFee,
                    deliveryWorkerId: null,
                    deliveryWorker: null,
                    assignedToWorkerId: null,
                    assignmentTimestamp: null,
                    rejectedBy: [],
                    appliedCoupon: appliedCouponInfo,
                };
                transaction.set(newOrderRef, newOrderData);

                // Update Stock
                for (let i = 0; i < productSnaps.length; i++) {
                    const productRef = productRefsAndItems[i].ref;
                    const item = productRefsAndItems[i].item;
                    const productData = productSnaps[i].data() as Product;

                    if (item.selectedSize) {
                        const newSizes = productData.sizes?.map(s =>
                            s.name === item.selectedSize!.name ? { ...s, stock: s.stock - item.quantity } : s
                        ) ?? [];
                        transaction.update(productRef, { sizes: newSizes });
                    } else {
                        transaction.update(productRef, { stock: (productData.stock || 0) - item.quantity });
                    }
                }
                
                // Update Coupon
                if (couponSnap && couponSnap.exists()) {
                    transaction.update(couponSnap.ref, {
                        usedCount: (couponSnap.data().usedCount || 0) + 1,
                        usedBy: arrayUnion(userId)
                    });
                }
                
                // Return new order data to update local state
                return { id: newOrderRef.id, ...newOrderData };
            });
            
            // Post-transaction UI updates
            clearCart();
            
            // Add new order to local state
            setAllOrders(prev => [orderId, ...prev]);

            // Update local state for products
            setProducts(prevProducts => {
                const productUpdates = new Map<string, Partial<Product>>();
                currentCart.forEach(item => {
                    const existingProduct = prevProducts.find(p => p.id === item.product.id);
                    if (!existingProduct) return;

                    if (item.selectedSize) {
                        const newSizes = existingProduct.sizes?.map(s => 
                            s.name === item.selectedSize!.name ? { ...s, stock: s.stock - item.quantity } : s
                        ) ?? [];
                        productUpdates.set(item.product.id, { sizes: newSizes });
                    } else {
                        productUpdates.set(item.product.id, { stock: (existingProduct.stock || 0) - item.quantity });
                    }
                });
                return prevProducts.map(p => productUpdates.has(p.id) ? { ...p, ...productUpdates.get(p.id) } as Product : p);
            });
            
            // Update local state for coupons
            if(couponCode){
                setCoupons(prevCoupons => prevCoupons.map(c => {
                    if (c.code.toUpperCase() === couponCode.toUpperCase()) {
                        return { ...c, usedCount: c.usedCount + 1, usedBy: [...(c.usedBy || []), userId] };
                    }
                    return c;
                }));
            }
            
            return orderId.id;

        } catch (error: any) {
            console.error("Order placement transaction failed:", error);
            toast({
                title: "فشل إرسال الطلب",
                description: error.message || "حدث خطأ غير متوقع. يرجى الخروج من التطبيق والمحاولة مرة أخرى.",
                variant: "destructive"
            });
            throw error;
        }
    };

    return {
        cart,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        cartTotal,
        placeOrder,
    };
};

    