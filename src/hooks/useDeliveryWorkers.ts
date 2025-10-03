
"use client";

import { useContext, useCallback } from 'react';
import { AppContext } from '@/contexts/AppContext';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { DeliveryWorker } from '@/lib/types';
import { useToast } from './use-toast';

export const useDeliveryWorkers = () => {
    const context = useContext(AppContext);
    const { toast } = useToast();

    if (!context) {
        throw new Error('useDeliveryWorkers must be used within an AppProvider');
    }
    
    const { deliveryWorkers, setDeliveryWorkers } = context;

    const addDeliveryWorker = useCallback(async (workerData: Pick<DeliveryWorker, 'id' | 'name'>) => {
        try {
            const newWorker: DeliveryWorker = { 
                ...workerData, 
                isOnline: true, 
                unfreezeProgress: 0, 
                lastDeliveredAt: new Date().toISOString() 
            };
            await setDoc(doc(db, 'deliveryWorkers', workerData.id), newWorker);
            setDeliveryWorkers(prev => [...prev, newWorker]);
        } catch (error) { 
            console.error("Error adding delivery worker:", error); 
            toast({ title: "فشل إضافة عامل توصيل", variant: "destructive" }); 
            throw error; 
        }
    }, [setDeliveryWorkers, toast]);

    const updateWorkerStatus = useCallback(async (workerId: string, isOnline: boolean) => {
        try {
            await updateDoc(doc(db, 'deliveryWorkers', workerId), { isOnline });
            setDeliveryWorkers(prev => prev.map(w => w.id === workerId ? {...w, isOnline} : w));
        } catch (error) { 
            console.error("Error updating worker status:", error); 
            toast({ title: "فشل تحديث حالة العامل", variant: "destructive" }); 
        }
    }, [setDeliveryWorkers, toast]);


    return {
        deliveryWorkers: context.deliveryWorkers,
        isLoading: context.isLoading,
        addDeliveryWorker,
        updateWorkerStatus,
    };
};
