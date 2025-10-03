
"use client";

import { useContext } from 'react';
import { AppContext } from '@/contexts/AppContext';

export const useOrders = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useOrders must be used within an AppProvider');
    }
    return {
        allOrders: context.allOrders,
        isLoading: context.isLoading,
        updateOrderStatus: context.updateOrderStatus,
        deleteOrder: context.deleteOrder,
    };
};
