
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, onSnapshot, doc, updateDoc, query, where, getDocs, limit, deleteDoc, increment, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Order, OrderStatus, DeliveryWorker } from '@/lib/types';
import { useToast } from './use-toast';
import { sendFcmNotification } from '@/services/fcm-service';

const ASSIGNMENT_TIMEOUT_MS = 20000; 

export const useOrders = (branchId?: string) => {
    const [allOrders, setAllOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    const isAssigningRef = useRef(false);

    const penalizeWorker = useCallback(async (workerId: string) => {
        try {
            const workerRef = doc(db, "deliveryWorkers", workerId);
            const workerSnap = await getDocs(query(collection(db, "deliveryWorkers"), where("__name__", "==", workerId)));
            if (workerSnap.empty) return;
            
            const workerData = workerSnap.docs[0].data();
            const currentIdle = (workerData.idleCount || 0) + 1;
            
            if (currentIdle >= 3) {
                await updateDoc(workerRef, { isOnline: false, idleCount: 0 });
            } else {
                await updateDoc(workerRef, { idleCount: increment(1) });
            }
        } catch (e) {}
    }, []);

    const autoAssignOrders = useCallback(async (orders: Order[]) => {
        if (isAssigningRef.current) return;
        
        const pendingOrders = orders.filter(o => o.status === 'pending_assignment');
        if (pendingOrders.length === 0) return;

        isAssigningRef.current = true;
        try {
            // توزيع الطلبات عالمياً: نبحث عن المناديب المتصلين في كل الأفرع
            const workersRef = collection(db, "deliveryWorkers");
            const wQuery = query(
                workersRef, 
                where("isOnline", "==", true), 
                where("isActive", "==", true),
                limit(100)
            );
            const workersSnap = await getDocs(wQuery);
            let onlineWorkers = workersSnap.docs.map(d => ({ id: d.id, ...d.data() })) as DeliveryWorker[];

            if (onlineWorkers.length > 0) {
                for (const order of pendingOrders) {
                    const activeWorkersIds = orders
                        .filter(o => ['preparing', 'confirmed', 'ready_for_pickup', 'on_the_way'].includes(o.status))
                        .map(o => o.deliveryWorkerId);
                    
                    const workerLoadMap = new Map();
                    activeWorkersIds.forEach(id => {
                        if(id) workerLoadMap.set(id, (workerLoadMap.get(id) || 0) + 1);
                    });

                    // اختيار مندوب عشوائي لديه ضغط عمل أقل من 3 طلبات
                    const targetWorkers = onlineWorkers.filter(w => (workerLoadMap.get(w.id) || 0) < 3);
                    const finalPool = targetWorkers.length > 0 ? targetWorkers : onlineWorkers;
                    
                    const shuffled = [...finalPool].sort(() => Math.random() - 0.5);
                    const worker = shuffled[0];
                    
                    if (worker) {
                        await updateDoc(doc(db, "orders", order.id), {
                            deliveryWorkerId: worker.id,
                            deliveryWorker: { id: worker.id, name: worker.name },
                            status: 'confirmed',
                            confirmedAt: new Date().toISOString()
                        });
                        
                        sendFcmNotification(worker.id, 'deliveryWorkers', 'لديك طلب جديد! 🚀', `وصلك طلب من ${order.restaurant?.name || 'متجر جديد'}`);
                    }
                }
            }
        } catch (e) {
            console.error("Auto-assign failed:", e);
        } finally {
            setTimeout(() => { isAssigningRef.current = false; }, 4000);
        }
    }, []);

    useEffect(() => {
        const ordersRef = collection(db, 'orders');
        // تحسين أداء جلب الطلبات عبر الفروع
        let q = query(ordersRef, orderBy("date", "desc"), limit(100));
        
        if (branchId && branchId !== 'all' && branchId !== 'main') {
            q = query(ordersRef, where('branchId', '==', branchId), orderBy("date", "desc"), limit(100));
        }

        const unsub = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Order[];
            setAllOrders(data);
            setIsLoading(false);
            autoAssignOrders(data);
        }, (error) => {
            setIsLoading(false);
        });
        return () => unsub();
    }, [branchId, autoAssignOrders]);
    
    const updateOrderStatus = useCallback(async (orderId: string, status: OrderStatus, workerId?: string) => {
        try {
            const orderRef = doc(db, "orders", orderId);
            const updateData: any = { status };
            
            if (status === 'preparing' && workerId) {
                const workerRef = doc(db, "deliveryWorkers", workerId);
                await updateDoc(workerRef, { idleCount: 0 });
                updateData.deliveryWorkerId = workerId;
                updateData.confirmedAt = null; 
            }

            if (status === 'unassigned') {
                updateData.deliveryWorkerId = null;
                updateData.deliveryWorker = null;
                updateData.confirmedAt = null;
                updateData.status = 'pending_assignment';
            }

            await updateDoc(orderRef, updateData);
            return true;
        } catch (error: any) {
            return false;
        }
    }, []);

    const deleteOrder = useCallback(async (orderId: string) => {
        try {
            await deleteDoc(doc(db, "orders", orderId));
            toast({ title: "تم حذف الطلب نهائياً ✅" });
        } catch(e) {
            toast({ title: "فشل حذف الطلب", variant: "destructive" });
        }
    }, [toast]);

    return { allOrders, isLoading, updateOrderStatus, deleteOrder };
};
