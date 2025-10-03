
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { Address } from '@/lib/types';

export const useAddresses = () => {
    const [addresses, setAddresses] = useState<Address[]>([]);

    useEffect(() => {
        const savedAddresses = localStorage.getItem('speedShopAddresses');
        if (savedAddresses) {
            setAddresses(JSON.parse(savedAddresses));
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('speedShopAddresses', JSON.stringify(addresses));
    }, [addresses]);

    const addAddress = useCallback((address: Omit<Address, 'id'>) => {
        const newAddress = { ...address, id: `addr_${Date.now()}` };
        setAddresses(prev => [...prev, newAddress]);
    }, []);

    const deleteAddress = useCallback((addressId: string) => {
        setAddresses(prev => prev.filter(addr => addr.id !== addressId));
    }, []);

    return { addresses, addAddress, deleteAddress };
};
