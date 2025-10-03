
"use client";

import { useContext } from 'react';
import { AppContext } from '@/contexts/AppContext';

export const useDeliveryZones = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useDeliveryZones must be used within an AppProvider');
    }
    return {
        deliveryZones: context.deliveryZones,
        isLoading: context.isLoading,
        addDeliveryZone: context.addDeliveryZone,
        updateDeliveryZone: context.updateDeliveryZone,
        deleteDeliveryZone: context.deleteDeliveryZone,
    };
};
