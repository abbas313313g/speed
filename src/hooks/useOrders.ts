
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, onSnapshot, doc, updateDoc, query, where, getDocs, limit, deleteDoc, increment, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Order, OrderStatus, DeliveryWorker } from '@/lib/types';
import { useToast } from './use-toast';
import { sendFcmNotification } from '@/services/fcm-service';

export const useOrders = (branchId?: string) => {
    const [allOrders, setAllOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    const isAssigningRef = useRef(false);

    const autoAssignOrders = useCallback(async (orders: Order[]) => {
        if (isAssigningRef.current) return;
        
        const pendingOrders = orders.filter(o => o.status === 'pending_assignment');
        if (pendingOrders.length === 0) return;

        isAssigningRef.current = true;
        try {
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
        
        // استخدام استعلام بسيط لتجنب مشاكل الـ Index في البداية، والترتيب في الذاكرة
        let q = query(ordersRef, limit(200));
        
        if (branchId && branchId !== 'all' && branchId !== 'main') {
            q = query(ordersRef, where('branchId', '==', branchId), limit(200));
        }

        const unsub = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Order[];
            // الترتيب اليدوي لضمان السرعة ومنع التصفير
            const sortedData = data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            
            setAllOrders(sortedData);
            setIsLoading(false);
            autoAssignOrders(sortedData);
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
