
"use client";

import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, setDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { DeliveryWorker } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export const useDeliveryWorkers = () => {
    const [deliveryWorkers, setDeliveryWorkers] = useState<DeliveryWorker[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    const fetchWorkers = useCallback(async () => {
        setIsLoading(true);
        try {
            const querySnapshot = await getDocs(collection(db, "deliveryWorkers"));
            const workers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DeliveryWorker));
            setDeliveryWorkers(workers);
        } catch (error) {
            console.error("Error fetching delivery workers:", error);
            toast({ title: "فشل تحميل بيانات عمال التوصيل", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchWorkers();
    }, [fetchWorkers]);
    
    const addDeliveryWorker = useCallback(async (workerData: Pick<DeliveryWorker, 'id' | 'name'>) => {
        try {
            const newWorker: DeliveryWorker = { ...workerData, isOnline: true, unfreezeProgress: 0, lastDeliveredAt: new Date().toISOString() };
            await setDoc(doc(db, 'deliveryWorkers', workerData.id), newWorker);
            setDeliveryWorkers(prev => [...prev, newWorker]);
        } catch (error) {
            console.error("Error adding delivery worker:", error);
            toast({ title: "فشل إضافة عامل توصيل", variant: "destructive" });
            throw error;
        }
    }, [toast]);
    
    const updateWorkerStatus = useCallback(async (workerId: string, isOnline: boolean) => {
        try {
            await updateDoc(doc(db, 'deliveryWorkers', workerId), { isOnline });
            setDeliveryWorkers(prev => prev.map(w => w.id === workerId ? {...w, isOnline} : w));
        } catch (error) {
            console.error("Error updating worker status:", error);
            toast({ title: "فشل تحديث حالة العامل", variant: "destructive" });
        }
    }, [toast]);

    return { deliveryWorkers, isLoading, addDeliveryWorker, updateWorkerStatus, fetchWorkers, setDeliveryWorkers };
};

