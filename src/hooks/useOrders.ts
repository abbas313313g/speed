
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, onSnapshot, doc, updateDoc, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Order, OrderStatus, DeliveryWorker } from '@/lib/types';
import { useToast } from './use-toast';
import { sendOrderNotification } from '@/services/onesignal-service';

export const useOrders = (branchId?: string) => {
    const [allOrders, setAllOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    const isAssigningRef = useRef(false);
    
    const autoAssignOrders = useCallback(async (orders: Order[]) => {
        if (isAssigningRef.current) return;
        
        const pendingOrders = orders.filter(o => o.status === 'preparing' && !o.deliveryWorkerId);
        if (pendingOrders.length === 0) return;

        isAssigningRef.current = true;
        try {
            const workersRef = collection(db, "deliveryWorkers");
            const wQuery = query(workersRef, where("isOnline", "==", true), limit(10));
            const workersSnap = await getDocs(wQuery);
            const onlineWorkers = workersSnap.docs.map(d => ({ id: d.id, ...d.data() })) as DeliveryWorker[];

            if (onlineWorkers.length > 0) {
                for (const order of pendingOrders) {
                    const worker = onlineWorkers[Math.floor(Math.random() * onlineWorkers.length)];
                    await updateDoc(doc(db, "orders", order.id), {
                        deliveryWorkerId: worker.id,
                        deliveryWorker: { id: worker.id, name: worker.name }
                    });
                    sendOrderNotification(worker.id);
                }
            }
        } catch (e) {
            console.error("Auto-assign failed:", e);
        } finally {
            setTimeout(() => { isAssigningRef.current = false; }, 5000);
        }
    }, []);

    useEffect(() => {
        // تم إلغاء الـ orderBy في الاستعلام لتجنب أخطاء الفهارس
        // نقوم بالترتيب يدوياً في المتصفح لضمان أقصى سرعة
        const ordersRef = collection(db, 'orders');
        let q = query(ordersRef, limit(60));
        
        if (branchId && branchId !== 'all') {
            q = query(ordersRef, where('branchId', '==', branchId), limit(60));
        }

        const unsub = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Order[];
            
            // ترتيب الطلبات من الأحدث للأقدم
            const sortedData = data.sort((a, b) => 
                new Date(b.date).getTime() - new Date(a.date).getTime()
            );

            setAllOrders(sortedData);
            setIsLoading(false);
            
            if (data.some(o => o.status === 'preparing' && !o.deliveryWorkerId)) {
                autoAssignOrders(data);
            }
        }, (error) => {
            console.error("Orders Snapshot Error:", error);
            setIsLoading(false);
        });
        return () => unsub();
    }, [branchId, autoAssignOrders]);
    
    const updateOrderStatus = useCallback(async (orderId: string, status: OrderStatus, workerId?: string) => {
        try {
            const orderRef = doc(db, "orders", orderId);
            const updateData: any = { status };
            if (workerId) updateData.deliveryWorkerId = workerId;
            
            await updateDoc(orderRef, updateData);
            return true;
        } catch (error: any) {
            return false;
        }
    }, []);

    const deleteOrder = useCallback(async (orderId: string) => {
        try {
            await updateDoc(doc(db, "orders", orderId), { status: 'cancelled' });
        } catch(e) {}
    }, []);

    return { allOrders, isLoading, updateOrderStatus, deleteOrder };
};
