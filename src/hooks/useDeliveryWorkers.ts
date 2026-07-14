
"use client";

import { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, doc, setDoc, getDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { DeliveryWorker } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export const useDeliveryWorkers = (branchId?: string) => {
    const [deliveryWorkers, setDeliveryWorkers] = useState<DeliveryWorker[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const workersRef = collection(db, 'deliveryWorkers');
        let q = query(workersRef);
        
        // العزل الصارم: جلب المناديب التابعين للكود الممرر فقط
        if (branchId && branchId !== 'all') {
            q = query(workersRef, where('branchId', '==', branchId));
        }

        const unsub = onSnapshot(q,
            (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as DeliveryWorker[];
                setDeliveryWorkers(data);
                setIsLoading(false);
            },
            (error) => {
                console.error("Error fetching delivery workers:", error);
                setIsLoading(false);
            }
        );
        return () => unsub();
    }, [branchId]);

    const addDeliveryWorker = useCallback(async (workerData: {id: string, name: string, password: string}) => {
        try {
            const workerDocRef = doc(db, "deliveryWorkers", workerData.id);
            const docSnap = await getDoc(workerDocRef);

            if (docSnap.exists()) {
                toast({ title: "هذا الرقم مسجل مسبقاً", variant: "destructive" });
                return false;
            }

            const completeWorkerData: DeliveryWorker = {
                id: workerData.id,
                name: workerData.name,
                password: workerData.password,
                isOnline: true,
                unfreezeProgress: 0,
                lastDeliveredAt: null,
                totalDeliveredCount: 0,
                branchId: branchId || 'main' // يختم بكود الفرع الحالي
            };
            await setDoc(workerDocRef, completeWorkerData);
            toast({ title: "تم تسجيل الكابتن بنجاح!" });
            return true;
        } catch (error) { 
            console.error("Error adding worker:", error);
            toast({ title: "فشل تسجيل العامل", variant: "destructive" }); 
            return false;
        }
    }, [toast, branchId]);
    
    const updateWorkerStatus = useCallback(async (workerId: string, isOnline: boolean) => {
         try {
            await updateDoc(doc(db, "deliveryWorkers", workerId), { isOnline });
        } catch (error) { 
            console.error("Error updating worker status:", error);
        }
    }, []);

    const updateWorkerDetails = useCallback(async (workerId: string, details: Partial<DeliveryWorker>) => {
        try {
            await updateDoc(doc(db, 'deliveryWorkers', workerId), details);
            toast({ title: 'تم تحديث البيانات بنجاح' });
        } catch (error) {
            toast({ title: 'فشل تحديث البيانات', variant: 'destructive' });
        }
    }, [toast]);
    
    const deleteWorker = useCallback(async (workerId: string) => {
        try {
            await deleteDoc(doc(db, "deliveryWorkers", workerId));
            toast({ title: "تم حذف العامل بنجاح" });
        } catch(e) {
            toast({ title: "فشل حذف العامل", variant: "destructive"});
        }
    }, [toast]);

    return { deliveryWorkers, isLoading, addDeliveryWorker, updateWorkerStatus, deleteWorker, updateWorkerDetails };
};
