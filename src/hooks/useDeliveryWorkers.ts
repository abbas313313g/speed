
"use client";

import { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, doc, setDoc, getDoc, getDocs, writeBatch, deleteDoc, updateDoc } from 'firebase/firestore';
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
                toast({ title: "فشل جلب بيانات العمال", description: "حدث خطأ أثناء تحميل البيانات.", variant: "destructive" });
                setIsLoading(false);
            }
        );
        return () => unsub();
    }, [toast]);

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
            };
            await setDoc(workerDocRef, completeWorkerData);
            toast({ title: "تم تسجيلك بنجاح!" });
            return true;
        } catch (error) { 
            console.error("Error adding worker:", error);
            toast({ title: "فشل تسجيل العامل", variant: "destructive" }); 
            return false;
        }
    }, [toast]);
    
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

    const deleteAllWorkers = useCallback(async () => {
        try {
            const workersSnapshot = await getDocs(collection(db, "deliveryWorkers"));
            const batch = writeBatch(db);
            workersSnapshot.forEach((doc) => batch.delete(doc.ref));
            await batch.commit();
            toast({ title: "تم حذف جميع السجلات" });
        } catch(e) {
            toast({ title: "فشل الحذف", variant: "destructive"});
        }
    }, [toast]);


    return { deliveryWorkers, isLoading, addDeliveryWorker, updateWorkerStatus, deleteAllWorkers, deleteWorker, updateWorkerDetails };
};
