
"use client";

import { useContext } from 'react';
import { AppContext } from '@/contexts/AppContext';

export const useUsers = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useUsers must be used within an AppProvider');
    }
    return {
        allUsers: context.allUsers,
        isLoading: context.isLoading,
    };
};
