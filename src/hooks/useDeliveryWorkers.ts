
"use client";

import { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { DeliveryWorker } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export const useDeliveryWorkers = () => {
    const [deliveryWorkers, setDeliveryWorkers] = useState<DeliveryWorker[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'deliveryWorkers'),
            (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as DeliveryWorker[];
                setDeliveryWorkers(data);
                setIsLoading(false);
            },
            (error) => {
                console.error("Error fetching delivery workers:", error);
                toast({ title: "Failed to fetch delivery workers", variant: "destructive" });
                setIsLoading(false);
            }
        );
        return () => unsub();
    }, []);

    const addDeliveryWorker = useCallback(async (workerData: {id: string, name: string}) => {
        try {
            const completeWorkerData: Omit<DeliveryWorker, 'id'> = {
                name: workerData.name,
                isOnline: true,
                unfreezeProgress: 0,
                lastDeliveredAt: null,
            };
            // Using phone number (id) as document id
            await setDoc(doc(db, "deliveryWorkers", workerData.id), completeWorkerData);
            toast({ title: "تم تسجيل العامل بنجاح" });
        } catch (error) { 
            console.error("Error adding worker:", error);
            toast({ title: "فشل تسجيل العامل", variant: "destructive" }); 
            throw error;
        }
    }, [toast]);
    
    const updateWorkerStatus = useCallback(async (workerId: string, isOnline: boolean) => {
         try {
            await setDoc(doc(db, "deliveryWorkers", workerId), { isOnline }, { merge: true });
        } catch (error) { 
            console.error("Error updating worker status:", error);
            toast({ title: "فشل تحديث حالة العامل", variant: "destructive" }); 
            throw error;
        }
    }, [toast]);


    return { deliveryWorkers, isLoading, addDeliveryWorker, updateWorkerStatus };
};
