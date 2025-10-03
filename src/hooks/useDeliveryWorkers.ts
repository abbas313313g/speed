
"use client";

import { useContext } from 'react';
import { AppContext } from '@/contexts/AppContext';

export const useDeliveryWorkers = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useDeliveryWorkers must be used within an AppProvider');
    }

    return {
        deliveryWorkers: context.deliveryWorkers,
        isLoading: context.isLoading,
        addDeliveryWorker: context.addDeliveryWorker,
        updateWorkerStatus: context.updateWorkerStatus,
    };
};

    