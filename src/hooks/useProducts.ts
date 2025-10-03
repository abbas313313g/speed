
"use client";

import { useContext } from 'react';
import { AppContext } from '@/contexts/AppContext';

export const useProducts = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useProducts must be used within an AppProvider');
    }
    return {
        products: context.products,
        isLoading: context.isLoading,
        addProduct: context.addProduct,
        updateProduct: context.updateProduct,
        deleteProduct: context.deleteProduct,
    };
};
