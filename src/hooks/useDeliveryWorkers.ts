
"use client";

import { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, doc, setDoc, getDoc, updateDoc, deleteDoc, query, where, increment } from 'firebase/firestore';
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
        
        if (branchId && branchId !== 'all') {
            q = query(workersRef, where('branchId', '==', branchId));
        }

        const unsub = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as DeliveryWorker[];
            setDeliveryWorkers(data);
            setIsLoading(false);
        }, (error) => { setIsLoading(false); });
        return () => unsub();
    }, [branchId]);

    const addDeliveryWorker = useCallback(async (workerData: {id: string, name: string, password: string}) => {
        try {
            const workerDocRef = doc(db, "deliveryWorkers", workerData.id.trim());
            const docSnap = await getDoc(workerDocRef);
            if (docSnap.exists()) {
                toast({ title: "عذراً، هذا الرقم مسجل مسبقاً", variant: "destructive" });
                return false;
            }
            const completeWorkerData: DeliveryWorker = {
                id: workerData.id.trim(),
                name: workerData.name,
                password: workerData.password,
                isOnline: false,
                isActive: true,
                branchId: branchId || 'main',
                balanceAdjustment: 0,
                debtAdjustment: 0
            };
            await setDoc(workerDocRef, completeWorkerData);
            toast({ title: "تم تسجيل الكابتن بنجاح ✅" });
            return true;
        } catch (error) { 
            toast({ title: "حدث خطأ أثناء التسجيل، حاول مرة أخرى", variant: "destructive" }); 
            return false;
        }
    }, [toast, branchId]);
    
    const updateWorkerStatus = useCallback(async (workerId: string, isOnline: boolean, location?: { latitude: number; longitude: number }) => {
        try { 
            const payload: any = { 
                isOnline,
                lastStatusUpdate: new Date().toISOString() 
            };
            if (location?.latitude && location?.longitude) {
                payload.latitude = location.latitude;
                payload.longitude = location.longitude;
            }
            await updateDoc(doc(db, "deliveryWorkers", workerId.trim()), payload); 
            return true;
        } catch (e) {
            return false;
        }
    }, []);

    const updateWorkerDetails = useCallback(async (workerId: string, details: Partial<DeliveryWorker>) => {
        try {
            await updateDoc(doc(db, 'deliveryWorkers', workerId.trim()), details);
            toast({ title: 'تم تحديث بيانات الكابتن بنجاح' });
            return true;
        } catch (e) {
            toast({ title: 'عذراً، لم نتمكن من التحديث حالياً', variant: 'destructive' });
            return false;
        }
    }, [toast]);
    
    const deleteWorker = useCallback(async (workerId: string) => {
        try {
            await deleteDoc(doc(db, "deliveryWorkers", workerId.trim()));
            toast({ title: "تم حذف الحساب نهائياً" });
        } catch(e) {
            toast({ title: "فشل الحذف، حاول مرة أخرى", variant: "destructive"});
        }
    }, [toast]);

    const adjustWorkerBalance = useCallback(async (workerId: string, amount: number, field: 'balanceAdjustment' | 'debtAdjustment') => {
        try {
            await updateDoc(doc(db, "deliveryWorkers", workerId.trim()), {
                [field]: increment(-amount) 
            });
            toast({ title: "تم إجراء الخصم المالي بنجاح" });
            return true;
        } catch (e) {
            toast({ title: "فشل تحديث الرصيد", variant: "destructive" });
            return false;
        }
    }, [toast]);

    return { 
        deliveryWorkers, isLoading, addDeliveryWorker, updateWorkerStatus, 
        deleteWorker, updateWorkerDetails, adjustWorkerBalance 
    };
};
