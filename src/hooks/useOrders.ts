
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
    const lastAssignTimeRef = useRef(0);

    // نظام تدوير الطلبات: سحب الطلب من المندوب إذا تأخر أكثر من 20 ثانية
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
        // حماية لمنع التكرار المستمر (كوول داون 5 ثواني)
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
                    const availablePool = onlineWorkers.filter(w => w.id !== (order as any).lastSkippedWorkerId);
                    const finalPool = availablePool.length > 0 ? availablePool : onlineWorkers;
                    
                    const shuffled = [...finalPool].sort(() => Math.random() - 0.5);
                    const worker = shuffled[0];
                    
                    if (worker) {
                        // تحديث الحالة لمنع دخولها في الحلقة مرة أخرى فوراً
                        await updateDoc(doc(db, "orders", order.id), {
                            deliveryWorkerId: worker.id,
                            deliveryWorker: { id: worker.id, name: worker.name },
                            status: 'confirmed', 
                            confirmedAt: new Date().toISOString()
                        });
                        
                        sendFcmNotification(worker.id, 'deliveryWorkers', 'طلب جديد بانتظارك! 🚀', `لديك 20 ثانية للموافقة على طلب ${order.restaurant?.name || 'جديد'}`);
                        break; // تعيين طلب واحد في كل دورة لتوفير الكوتا
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
        // تقليل الليميت من 500 إلى 100 لتوفير كوتا القراءة
        const q = query(ordersRef, orderBy("date", "desc"), limit(100));

        const unsub = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Order[];
            
            let finalData = data;
            if (branchId && branchId !== 'all' && branchId !== 'main') {
                finalData = data.filter(o => o.branchId === branchId);
            }
            
            setAllOrders(finalData);
            setIsLoading(false);
            
            // استدعاء الوظائف مع حماية
            cleanupTimedOutAssignments(finalData);
            autoAssignOrders(finalData);
        }, (error) => {
            console.error("Orders Snapshot Error:", error);
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
