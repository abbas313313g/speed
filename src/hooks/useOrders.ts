
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, onSnapshot, doc, updateDoc, query, where, getDocs, limit, deleteDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Order, OrderStatus, DeliveryWorker } from '@/lib/types';
import { useToast } from './use-toast';
import { sendOrderNotification } from '@/services/onesignal-service';

const ASSIGNMENT_TIMEOUT_MS = 20000; // 20 ثانية

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
            
            const updateData: any = { idleCount: increment(1) };
            if (currentIdle >= 3) {
                updateData.isOnline = false;
                updateData.idleCount = 0;
                toast({ title: "تم إيقاف نشاطك", description: "بسبب تجاهل 3 طلبات، يرجى تفعيل الحالة عند استعدادك.", variant: "destructive" });
            }
            
            await updateDoc(workerRef, updateData);
        } catch (e) {
            console.error("Penalize error:", e);
        }
    }, [toast]);

    const autoAssignOrders = useCallback(async (orders: Order[]) => {
        if (isAssigningRef.current) return;
        
        // جلب الطلبات غير المعينة حتى لو كانت قيد التحضير في المطعم
        const pendingOrders = orders.filter(o => 
            (o.status === 'unassigned' || o.status === 'preparing' || (o.status === 'confirmed' && !o.deliveryWorkerId)) && 
            !o.deliveryWorkerId
        );
        
        if (pendingOrders.length === 0) return;

        isAssigningRef.current = true;
        try {
            const workersRef = collection(db, "deliveryWorkers");
            const wQuery = query(workersRef, where("isOnline", "==", true), where("isActive", "==", true), limit(15));
            const workersSnap = await getDocs(wQuery);
            const onlineWorkers = workersSnap.docs.map(d => ({ id: d.id, ...d.data() })) as DeliveryWorker[];

            if (onlineWorkers.length > 0) {
                for (const order of pendingOrders) {
                    const worker = onlineWorkers[Math.floor(Math.random() * onlineWorkers.length)];
                    await updateDoc(doc(db, "orders", order.id), {
                        deliveryWorkerId: worker.id,
                        deliveryWorker: { id: worker.id, name: worker.name },
                        status: 'confirmed',
                        confirmedAt: new Date().toISOString()
                    });
                    sendOrderNotification(worker.id);
                }
            }
        } catch (e) {
            console.error("Auto-assign failed:", e);
        } finally {
            setTimeout(() => { isAssigningRef.current = false; }, 3000);
        }
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date().getTime();
            allOrders.forEach(async (order) => {
                if (order.status === 'confirmed' && order.deliveryWorkerId && order.confirmedAt) {
                    const confirmedTime = new Date(order.confirmedAt).getTime();
                    if (now - confirmedTime > ASSIGNMENT_TIMEOUT_MS) {
                        await penalizeWorker(order.deliveryWorkerId);
                        await updateDoc(doc(db, "orders", order.id), {
                            deliveryWorkerId: null,
                            deliveryWorker: null,
                            status: 'unassigned',
                            confirmedAt: null
                        });
                    }
                }
            });
        }, 5000);
        return () => clearInterval(interval);
    }, [allOrders, penalizeWorker]);

    useEffect(() => {
        const ordersRef = collection(db, 'orders');
        let q = query(ordersRef, limit(60));
        
        if (branchId && branchId !== 'all') {
            q = query(ordersRef, where('branchId', '==', branchId), limit(60));
        }

        const unsub = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Order[];
            const sortedData = data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setAllOrders(sortedData);
            setIsLoading(false);
            
            if (data.some(o => (o.status === 'unassigned' || o.status === 'preparing') && !o.deliveryWorkerId)) {
                autoAssignOrders(data);
            }
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
            }

            if (status === 'unassigned') {
                const order = allOrders.find(o => o.id === orderId);
                if (order?.deliveryWorkerId) {
                    await penalizeWorker(order.deliveryWorkerId);
                }
                updateData.deliveryWorkerId = null;
                updateData.deliveryWorker = null;
                updateData.confirmedAt = null;
            }

            await updateDoc(orderRef, updateData);
            return true;
        } catch (error: any) {
            return false;
        }
    }, [allOrders, penalizeWorker]);

    const deleteOrder = useCallback(async (orderId: string) => {
        try {
            await deleteDoc(doc(db, "orders", orderId));
            toast({ title: "تم حذف الطلب نهائياً من النظام ✅" });
        } catch(e) {
            toast({ title: "عذراً، فشل حذف الطلب", variant: "destructive" });
        }
    }, [toast]);

    return { allOrders, isLoading, updateOrderStatus, deleteOrder };
};
