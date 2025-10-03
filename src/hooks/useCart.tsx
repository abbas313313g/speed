
"use client";

import { useContext } from 'react';
import { AppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import type { CartItem, Product, ProductSize, Address } from '@/lib/types';


export const useCart = () => {
    const context = useContext(AppContext);
    const { toast } = useToast();
    
    if (!context) {
        throw new Error('useCart must be used within an AppProvider');
    }

    const handlePlaceOrder = async (address: Address, deliveryFee: number, couponCode?: string) => {
        try {
            await context.placeOrder(context.cart, address, deliveryFee, couponCode);
            toast({
                title: "تم استلام طلبك بنجاح!",
                description: "يمكنك متابعة حالة طلبك من صفحة الطلبات.",
                duration: 5000,
            });
        } catch (error: any) {
            toast({ title: "فشل إرسال الطلب", description: error.message, variant: "destructive" });
        }
    }

    return { 
        cart: context.cart, 
        addToCart: context.addToCart, 
        removeFromCart: context.removeFromCart, 
        updateCartQuantity: context.updateCartQuantity, 
        clearCart: context.clearCart, 
        cartTotal: context.cartTotal,
        placeOrder: handlePlaceOrder,
    };
};
