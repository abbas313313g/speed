
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, onSnapshot, doc, updateDoc, query, where, getDocs, limit, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Order, OrderStatus, DeliveryWorker } from '@/lib/types';
import { useToast } from './use-toast';
import { sendOrderNotification } from '@/services/onesignal-service';

export const useOrders = (branchId?: string) => {
    const [allOrders, setAllOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    const isAssigning = useRef(false);
    
    // التوزيع التلقائي: قمت بتبسيطه جداً لمنع الـ Loops
    const autoAssignOrders = useCallback(async (orders: Order[]) => {
        if (isAssigning.current) return;
        
        // الطلبات التي تحتاج سائق هي فقط التي وافق عليها المطعم (preparing) ولم يعين لها سائق بعد
        const eligibleOrders = orders.filter(o => o.status === 'preparing' && !o.deliveryWorkerId);
        if (eligibleOrders.length === 0) return;

        isAssigning.current = true;
        try {
            const workersRef = collection(db, "deliveryWorkers");
            const wQuery = query(workersRef, where("isOnline", "==", true), limit(20));
            const workersSnap = await getDocs(wQuery);
            const onlineWorkers = workersSnap.docs.map(d => ({ id: d.id, ...d.data() })) as DeliveryWorker[];

            if (onlineWorkers.length === 0) { isAssigning.current = false; return; }

            for (const order of eligibleOrders) {
                // تعيين أول سائق متاح ببساطة لتسريع العملية
                const bestWorker = onlineWorkers[0]; 
                if (bestWorker) {
                    await updateDoc(doc(db, "orders", order.id), {
                        deliveryWorkerId: bestWorker.id,
                        deliveryWorker: { id: bestWorker.id, name: bestWorker.name }
                    });
                    sendOrderNotification(bestWorker.id);
                }
            }
        } catch (e) {
            console.error("Auto-assign error:", e);
        } finally {
            isAssigning.current = false;
        }
    }, []);

    useEffect(() => {
        const ordersRef = collection(db, 'orders');
        let q = query(ordersRef, limit(100));
        if (branchId && branchId !== 'all') {
            q = query(ordersRef, where('branchId', '==', branchId), limit(100));
        }

        const unsub = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Order[];
            data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setAllOrders(data);
            setIsLoading(false);
            
            if (branchId && branchId !== 'all') {
                autoAssignOrders(data);
            }
        });
        return () => unsub();
    }, [branchId, autoAssignOrders]);
    
    // تحديث الحالة: جعلته مباشراً جداً لضمان عدم الفشل
    const updateOrderStatus = useCallback(async (orderId: string, status: OrderStatus, workerId?: string) => {
        try {
            const orderRef = doc(db, "orders", orderId);
            const updateData: any = { status };

            if (status === 'confirmed' && workerId) {
                updateData.deliveryWorkerId = workerId;
            }

            await updateDoc(orderRef, updateData);
            return true;
        } catch (error: any) {
            console.error("Status update failed:", error);
            return false;
        }
    }, []);

    const deleteOrder = useCallback(async (orderId: string) => {
        try {
            await updateDoc(doc(db, "orders", orderId), { status: 'cancelled' });
            toast({ title: "تم إلغاء الطلب" });
        } catch(e) {
            toast({title: "فشل الإلغاء", variant: "destructive"})
        }
    }, [toast]);

    return { allOrders, isLoading, updateOrderStatus, deleteOrder };
};
