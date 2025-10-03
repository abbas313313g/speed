
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { CartItem, Product, ProductSize, Address, Order, Coupon } from '@/lib/types';
import { ToastAction } from '@/components/ui/toast';
import { v4 as uuidv4 } from 'uuid';
import { doc, collection, runTransaction, getDocs, query, where, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useProducts } from './useProducts';
import { useCoupons } from './useCoupons';
import { useOrders } from './useOrders';

export const useCart = () => {
    const { toast } = useToast();
    const [cart, setCart] = useState<CartItem[]>([]);
    const { products } = useProducts();
    const { coupons } = useCoupons();
    const { addOrder } = useOrders();
    const [userId, setUserId] = useState<string|null>(null);

    useEffect(() => {
        let id = localStorage.getItem('speedShopUserId');
        if (!id) {
            id = uuidv4();
            localStorage.setItem('speedShopUserId', id);
        }
        setUserId(id);
    }, []);
    
    // Load cart from localStorage on initial render
    useEffect(() => {
        const savedCart = localStorage.getItem('speedShopCart');
        if (savedCart) {
            try {
                const parsedCart: CartItem[] = JSON.parse(savedCart);
                // Data validation and reconciliation with current products
                const validatedCart = parsedCart.map(item => {
                    const productExists = products.find(p => p.id === item.product.id);
                    if (productExists) {
                        return { ...item, product: productExists };
                    }
                    return null;
                }).filter((item): item is CartItem => item !== null);
                
                setCart(validatedCart);

            } catch (e) {
                console.error("Failed to parse cart from localStorage", e);
                setCart([]);
            }
        }
    }, [products]); // Depend on products to validate cart

    // Save cart to localStorage whenever it changes
    useEffect(() => {
        if(cart.length > 0 || localStorage.getItem('speedShopCart')) {
          localStorage.setItem('speedShopCart', JSON.stringify(cart));
        }
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

    const clearCart = useCallback(() => {
        setCart([]);
    }, []);

    const cartTotal = useMemo(() => {
        return cart.reduce((total, item) => {
            const price = item.selectedSize?.price ?? item.product.discountPrice ?? item.product.price;
            return total + price * item.quantity;
        }, 0);
    }, [cart]);

    const placeOrder = useCallback(async (address: Address, deliveryFee: number, couponCode?: string) => {
        if (!userId) throw new Error("User ID not found.");
        if (cart.length === 0) throw new Error("السلة فارغة.");
        
        const currentCart = [...cart];
        
        const newOrderRef = doc(collection(db, "orders"));
        await runTransaction(db, async (transaction) => {
            const productRefsAndItems = currentCart.map(item => ({ ref: doc(db, "products", item.product.id), item: item }));
            
            let couponSnap: any = null;
            let couponData: Coupon | null = null;
            if (couponCode?.trim()) {
                const couponQuery = query(collection(db, "coupons"), where("code", "==", couponCode.trim().toUpperCase()));
                // We use getDocs inside transaction to ensure we read the latest coupon state
                const couponQuerySnap = await getDocs(couponQuery);
                if (!couponQuerySnap.empty) {
                    couponSnap = couponQuerySnap.docs[0];
                    couponData = { id: couponSnap.id, ...couponSnap.data() } as Coupon;
                } else { throw new Error(`كود الخصم "${couponCode}" غير صالح.`); }
            }

            // Validate coupon usage
            if (couponData && couponSnap) {
                if (couponData.usedCount >= couponData.maxUses) throw new Error("تم استخدام هذا الكود بالكامل.");
                if (couponData.usedBy?.includes(userId)) throw new Error("لقد استخدمت هذا الكود من قبل.");
            }

            let calculatedProfit = 0;

            for (const { ref, item } of productRefsAndItems) {
                const productDoc = await transaction.get(ref);
                if (!productDoc.exists()) throw new Error(`منتج "${item.product.name}" لم يعد متوفرًا.`);
                const serverProduct = productDoc.data() as Product;
                
                const itemPrice = item.selectedSize?.price ?? serverProduct.discountPrice ?? serverProduct.price;
                const wholesalePrice = serverProduct.wholesalePrice ?? 0;
                if(itemPrice < wholesalePrice) throw new Error(`سعر بيع المنتج ${serverProduct.name} أقل من سعر الجملة.`);
                calculatedProfit += (itemPrice - wholesalePrice) * item.quantity;

                // Stock validation
                if (item.selectedSize) {
                    const size = serverProduct.sizes?.find(s => s.name === item.selectedSize!.name);
                    if (!size || size.stock < item.quantity) throw new Error(`الكمية المطلوبة من "${item.product.name} (${item.selectedSize.name})" غير متوفرة.`);
                    const newSizes = serverProduct.sizes?.map(s => s.name === item.selectedSize!.name ? { ...s, stock: s.stock - item.quantity } : s) ?? [];
                    transaction.update(ref, { sizes: newSizes });
                } else {
                    if ((serverProduct.stock ?? 0) < item.quantity) throw new Error(`الكمية المطلوبة من "${item.product.name}" غير متوفرة.`);
                    transaction.update(ref, { stock: (serverProduct.stock || 0) - item.quantity });
                }
            }
            
            let discountAmount = 0;
            let appliedCouponInfo: Order['appliedCoupon'] = null;
            if (couponData && couponSnap) {
                discountAmount = couponData.discountValue;
                appliedCouponInfo = { code: couponData.code, discountAmount: discountAmount };
                transaction.update(couponSnap.ref, { usedCount: couponData.usedCount + 1, usedBy: arrayUnion(userId) });
            }

            const subtotal = currentCart.reduce((total, item) => {
                const price = item.selectedSize?.price ?? item.product.discountPrice ?? item.product.price;
                return total + price * item.quantity;
            }, 0);
            const finalTotal = Math.max(0, subtotal - discountAmount) + deliveryFee;
            
            const newOrderData: Omit<Order, 'id'> = { 
                userId, 
                items: currentCart, 
                total: finalTotal, 
                date: new Date().toISOString(),
                status: 'unassigned', 
                estimatedDelivery: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
                address, 
                profit: calculatedProfit, 
                deliveryFee, 
                deliveryWorkerId: null, 
                deliveryWorker: null, 
                assignedToWorkerId: null,
                assignmentTimestamp: null, 
                rejectedBy: [], 
                appliedCoupon: appliedCouponInfo,
            };
            transaction.set(newOrderRef, newOrderData);
        });
        
        clearCart();
        addOrder({ id: newOrderRef.id, ...((await getDoc(newOrderRef)).data() as Omit<Order, 'id'>) });
        return newOrderRef.id;

    }, [userId, cart, toast, clearCart, addOrder, coupons]);

    return { cart, addToCart, removeFromCart, updateCartQuantity, clearCart, cartTotal, placeOrder };
};
