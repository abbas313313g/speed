
"use client";

import { useContext } from 'react';
import { AppContext } from '@/contexts/AppContext';

export const useCategories = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useCategories must be used within an AppProvider');
    }
    return {
        categories: context.categories,
        isLoading: context.isLoading,
        addCategory: context.addCategory,
        updateCategory: context.updateCategory,
        deleteCategory: context.deleteCategory,
    };
};
