
"use client";

import { useContext } from 'react';
import { AppContext } from '@/contexts/AppContext';
import type { Address } from '@/lib/types';


export const useCart = () => {
    const context = useContext(AppContext);
    
    if (!context) {
        throw new Error('useCart must be used within an AppProvider');
    }

    const placeOrder = (address: Address, deliveryFee: number, couponCode?: string) => {
        return context.placeOrder(address, deliveryFee, couponCode);
    };

    return { 
        cart: context.cart, 
        addToCart: context.addToCart, 
        removeFromCart: context.removeFromCart, 
        updateCartQuantity: context.updateCartQuantity, 
        clearCart: context.clearCart, 
        cartTotal: context.cartTotal,
        placeOrder,
    };
};
