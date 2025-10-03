
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { Address } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

export const useAddresses = () => {
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        try {
            const savedAddresses = localStorage.getItem('speedShopAddresses');
            if (savedAddresses) {
                setAddresses(JSON.parse(savedAddresses));
            }
        } catch(e) {
            console.error("Could not parse addresses from local storage", e);
            setAddresses([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if(!isLoading){
            localStorage.setItem('speedShopAddresses', JSON.stringify(addresses));
        }
    }, [addresses, isLoading]);

    const addAddress = useCallback((address: Omit<Address, 'id'>) => {
        const newAddress = { ...address, id: `addr_${uuidv4()}` };
        setAddresses(prev => [...prev, newAddress]);
    }, []);

    const deleteAddress = useCallback((addressId: string) => {
        setAddresses(prev => prev.filter(addr => addr.id !== addressId));
    }, []);

    return { addresses, addAddress, deleteAddress, isLoading };
};
