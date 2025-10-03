
"use client";

import { useContext } from 'react';
import { AppContext } from '@/contexts/AppContext';

export const useCoupons = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useCoupons must be used within an AppProvider');
    }
    return {
        coupons: context.coupons,
        isLoading: context.isLoading,
        addCoupon: context.addCoupon,
        deleteCoupon: context.deleteCoupon,
    };
};
