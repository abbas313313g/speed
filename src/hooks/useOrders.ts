
"use client";

import { useContext } from 'react';
import { AppContext } from '@/contexts/AppContext';
import { OrderStatus } from '@/lib/types';
import { useToast } from './use-toast';

export const useOrders = () => {
    const context = useContext(AppContext);
    const { toast } = useToast();
    
    if (!context) {
        throw new Error('useOrders must be used within an AppProvider');
    }
    
    const updateOrderStatusWithToast = async (orderId: string, status: OrderStatus, workerId?: string) => {
        try {
            await context.updateOrderStatus(orderId, status, workerId);
            // The toast is now handled in the context to avoid duplication
        } catch (error: any) {
            // The error is already toasted in the context's function
            // We re-throw it so components know the operation failed
            throw error;
        }
    };
    
    return {
        allOrders: context.allOrders,
        isLoading: context.isLoading,
        updateOrderStatus: updateOrderStatusWithToast,
        deleteOrder: context.deleteOrder,
    };
};


  