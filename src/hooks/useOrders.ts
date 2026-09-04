
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, onSnapshot, doc, updateDoc, query, where, getDocs, limit, deleteDoc, increment, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Order, OrderStatus, DeliveryWorker } from '@/lib/types';
import { useToast } from './use-toast';
import { sendFcmNotification } from '@/services/fcm-service';
import { calculateDistance } from '@/lib/utils';

export const useOrders = (branchId?: string) => {
    const [allOrders, setAllOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    const isAssigningRef = useRef(false);
    const lastAssignTimeRef = useRef(0);

    const cleanupTimedOutAssignments = useCallback(async (orders: Order[]) => {
        const now = new Date().getTime();
        const timedOutOrders = orders.filter(o => 
            o.status === 'confirmed' && 
            o.confirmedAt && 
            (now - new Date(o.confirmedAt).getTime() > 20000)
        );

        for (const order of timedOutOrders) {
            try {
                await updateDoc(doc(db, "orders", order.id), {
                    deliveryWorkerId: null,
                    deliveryWorker: null,
                    status: 'pending_assignment',
                    confirmedAt: null,
                    lastSkippedWorkerId: order.deliveryWorkerId
                });
            } catch (e) {
                console.error("Timeout cleanup failed:", e);
            }
        }
    }, []);

    const autoAssignOrders = useCallback(async (orders: Order[]) => {
        const now = Date.now();
        if (isAssigningRef.current || (now - lastAssignTimeRef.current < 5000)) return;
        
        const pendingOrders = orders.filter(o => o.status === 'pending_assignment');
        if (pendingOrders.length === 0) return;

        isAssigningRef.current = true;
        lastAssignTimeRef.current = now;

        try {
            const workersRef = collection(db, "deliveryWorkers");
            const wQuery = query(
                workersRef, 
                where("isOnline", "==", true), 
                where("isActive", "==", true),
                limit(50)
            );
            const workersSnap = await getDocs(wQuery);
            let onlineWorkers = workersSnap.docs.map(d => ({ id: d.id, ...d.data() })) as DeliveryWorker[];

            if (onlineWorkers.length > 0) {
                for (const order of pendingOrders) {
                    const lastSkipped = (order as any).lastSkippedWorkerId;
                    
                    // 1. الأولوية لمناديب نفس الفرع
                    let candidates = onlineWorkers.filter(w => w.branchId === order.branchId && w.id !== lastSkipped);
                    
                    // 2. إذا لم يتوفر، ابحث في الفروع الأخرى بشرط المسافة أقل من 18 كم
                    if (candidates.length === 0) {
                        candidates = onlineWorkers.filter(w => 
                            w.branchId !== order.branchId && 
                            w.id !== lastSkipped &&
                            w.latitude && w.longitude && order.restaurant?.latitude && order.restaurant?.longitude &&
                            calculateDistance(order.restaurant.latitude, order.restaurant.longitude, w.latitude, w.longitude) < 18
                        );
                    }

                    if (candidates.length > 0) {
                        const worker = [...candidates].sort(() => Math.random() - 0.5)[0];
                        await updateDoc(doc(db, "orders", order.id), {
                            deliveryWorkerId: worker.id,
                            deliveryWorker: { id: worker.id, name: worker.name },
                            status: 'confirmed', 
                            confirmedAt: new Date().toISOString()
                        });
                        
                        sendFcmNotification(worker.id, 'deliveryWorkers', 'طلب جديد بانتظارك! 🚀', `لديك 20 ثانية للموافقة على طلب ${order.restaurant?.name || 'جديد'}`);
                        break; 
                    }
                }
            }
        } catch (e) {
            console.error("Auto-assign failed:", e);
        } finally {
            setTimeout(() => { isAssigningRef.current = false; }, 2000);
        }
    }, []);

    useEffect(() => {
        const ordersRef = collection(db, 'orders');
        const q = query(ordersRef, orderBy("date", "desc"), limit(100));

        const unsub = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Order[];
            
            let finalData = data;
            if (branchId && branchId !== 'all' && branchId !== 'main') {
                finalData = data.filter(o => o.branchId === branchId);
            }
            
            setAllOrders(finalData);
            setIsLoading(false);
            cleanupTimedOutAssignments(finalData);
            autoAssignOrders(finalData);
        }, (error) => {
            setIsLoading(false);
        });
        return () => unsub();
    }, [branchId, autoAssignOrders, cleanupTimedOutAssignments]);
    
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
