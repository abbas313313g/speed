"use client";

import { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { CartItem, Product, ProductSize } from '@/lib/types';
import { ToastAction } from '@/components/ui/toast';

export const useCart = () => {
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
                setCart([]);
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
                        description: `${quantity}x ${product.name}${selectedSize ? ` (${selectedSize.name})` : ''}`,
                    });
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
        
        toast({
            title: "تمت الإضافة إلى السلة",
            description: `${quantity}x ${product.name}${selectedSize ? ` (${selectedSize.name})` : ''}`,
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

    return { cart, addToCart, removeFromCart, updateCartQuantity, clearCart, cartTotal, setCart };
};
