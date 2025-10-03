
import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { DeliveryWorker } from '@/lib/types';
import { useToast } from './use-toast';

let allDeliveryWorkers: DeliveryWorker[] = [];
let hasFetched = false;
const listeners = new Set<(data: DeliveryWorker[]) => void>();

const fetchAllDeliveryWorkers = async () => {
    if (hasFetched) return allDeliveryWorkers;
    try {
        const workersSnap = await getDocs(collection(db, "deliveryWorkers"));
        allDeliveryWorkers = workersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as DeliveryWorker));
        hasFetched = true;
        listeners.forEach(listener => listener(allDeliveryWorkers));
        return allDeliveryWorkers;
    } catch (error) {
        console.error("Error fetching delivery workers:", error);
        return [];
    }
};

export const useDeliveryWorkers = () => {
    const [deliveryWorkers, setDeliveryWorkersState] = useState<DeliveryWorker[]>(allDeliveryWorkers);
    const [isLoading, setIsLoading] = useState(!hasFetched);
    const { toast } = useToast();

    useEffect(() => {
        const listener = (data: DeliveryWorker[]) => setDeliveryWorkersState(data);
        listeners.add(listener);

        if (!hasFetched) {
            setIsLoading(true);
            fetchAllDeliveryWorkers().finally(() => setIsLoading(false));
        }

        return () => {
            listeners.delete(listener);
        };
    }, []);

    const setDeliveryWorkers = useCallback((newWorkers: DeliveryWorker[] | ((prev: DeliveryWorker[]) => DeliveryWorker[])) => {
        if (typeof newWorkers === 'function') {
            allDeliveryWorkers = newWorkers(allDeliveryWorkers);
        } else {
            allDeliveryWorkers = newWorkers;
        }
        listeners.forEach(listener => listener(allDeliveryWorkers));
    }, []);

    const addDeliveryWorker = async (workerData: Pick<DeliveryWorker, 'id' | 'name'>) => {
        setIsLoading(true);
        try {
            const workerRef = doc(db, 'deliveryWorkers', workerData.id);
            const newWorkerData = { name: workerData.name, isOnline: true, unfreezeProgress: 0, lastDeliveredAt: new Date().toISOString() };
            await setDoc(workerRef, newWorkerData, { merge: true });

            setDeliveryWorkers(prev => {
                const existing = prev.find(w => w.id === workerData.id);
                if (existing) {
                    return prev.map(w => w.id === workerData.id ? { ...w, ...newWorkerData } : w);
                }
                return [...prev, { ...workerData, ...newWorkerData }];
            });
        } catch (error) {
            console.error("Failed to add delivery worker:", error);
            toast({ title: "فشل تسجيل العامل", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const updateWorkerStatus = async (workerId: string, isOnline: boolean) => {
        const worker = allDeliveryWorkers.find(w => w.id === workerId);
        if (worker && worker.isOnline === isOnline) {
            return;
        }
        setIsLoading(true);
        try {
            const workerRef = doc(db, 'deliveryWorkers', workerId);
            await setDoc(workerRef, { isOnline }, { merge: true });
            setDeliveryWorkers(prev => prev.map(w => w.id === workerId ? { ...w, isOnline } : w));
        } catch (error) {
            console.error("Failed to update worker status:", error);
            toast({ title: "فشل تحديث حالة العامل", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    return { deliveryWorkers, isLoading, addDeliveryWorker, updateWorkerStatus };
};
