
"use client";

import { useContext } from 'react';
import { AppContext } from '@/contexts/AppContext';

export const useAddresses = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useAddresses must be used within an AppProvider');
    }
    return {
        addresses: context.addresses,
        addAddress: context.addAddress,
        deleteAddress: context.deleteAddress,
        isLoading: context.isLoading,
    };
};
