
"use client";

import { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, doc, runTransaction, getDoc, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Order, OrderStatus, DeliveryWorker } from '@/lib/types';
import { useToast } from './use-toast';
import { sendTelegramMessage } from '@/lib/telegram';

export const useOrders = (branchId?: string) => {
    const [allOrders, setAllOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    
    const autoAssignOrders = useCallback(async (orders: Order[]) => {
        const preparingOrders = orders.filter(o => o.status === 'preparing' && !o.deliveryWorkerId);
        if (preparingOrders.length === 0) return;

        try {
            const workersRef = collection(db, "deliveryWorkers");
            // الفلترة حسب الفرع للمناديب أونلاين
            const wQuery = branchId && branchId !== 'all'
                ? query(workersRef, where("isOnline", "==", true), where("branchId", "==", branchId))
                : query(workersRef, where("isOnline", "==", true));
            
            const workersSnap = await getDocs(wQuery);
            const onlineWorkers = workersSnap.docs.map(d => ({ id: d.id, ...d.data() })) as DeliveryWorker[];

            if (onlineWorkers.length === 0) return;

            const activeOrdersSnap = await getDocs(query(collection(db, "orders"), where("status", "in", ["confirmed", "preparing", "ready_for_pickup", "on_the_way"])));
            
            const workerLoad = new Map<string, { restaurantId: string | null, count: number }>();
            onlineWorkers.forEach(w => workerLoad.set(w.id, { restaurantId: null, count: 0 }));
            
            activeOrdersSnap.forEach(d => {
                const o = d.data() as Order;
                if (o.deliveryWorkerId && workerLoad.has(o.deliveryWorkerId)) {
                    const current = workerLoad.get(o.deliveryWorkerId)!;
                    workerLoad.set(o.deliveryWorkerId, { 
                        restaurantId: o.restaurant?.id || current.restaurantId, 
                        count: current.count + 1 
                    });
                }
            });

            for (const order of preparingOrders) {
                const targetRestaurantId = order.restaurant?.id;
                if (!targetRestaurantId) continue;
                
                const eligibleWorkers = onlineWorkers.filter(w => {
                    const load = workerLoad.get(w.id)!;
                    if (load.count === 0) return true;
                    if (load.count < 2 && load.restaurantId === targetRestaurantId) return true;
                    return false;
                });

                if (eligibleWorkers.length === 0) continue;

                const sortedWorkers = eligibleWorkers.sort((a, b) => {
                    const loadA = workerLoad.get(a.id)!.count;
                    const loadB = workerLoad.get(b.id)!.count;
                    if (loadA !== loadB) return loadA - loadB;
                    return (a.totalDeliveredCount || 0) - (b.totalDeliveredCount || 0);
                });

                const bestWorker = sortedWorkers[0];
                if (bestWorker) {
                    await updateOrderStatus(order.id, 'confirmed', bestWorker.id);
                    const current = workerLoad.get(bestWorker.id)!;
                    workerLoad.set(bestWorker.id, { restaurantId: targetRestaurantId, count: current.count + 1 });
                }
            }
        } catch (e) {
            console.error("Auto-assign failed:", e);
        }
    }, [branchId]);

    useEffect(() => {
        const ordersRef = collection(db, 'orders');
        // عزل تام: إذا كان هناك فرع محدد، نجلب بياناته فقط. إذا كان 'all' نجلب الكل (للإحصائيات العامة)
        let q = ordersRef;
        if (branchId && branchId !== 'all') {
            q = query(ordersRef, where('branchId', '==', branchId)) as any;
        }

        const unsub = onSnapshot(q,
            (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Order[];
                data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                setAllOrders(data);
                setIsLoading(false);
                if (branchId && branchId !== 'all') autoAssignOrders(data);
            },
            (error) => {
                console.error("Error fetching orders:", error);
                setIsLoading(false);
            }
        );
        return () => unsub();
    }, [branchId, autoAssignOrders]);
    
    const updateOrderStatus = useCallback(async (orderId: string, status: OrderStatus, workerId?: string) => {
        try {
            await runTransaction(db, async (transaction) => {
                const orderRef = doc(db, "orders", orderId);
                const orderDoc = await transaction.get(orderRef);
                if (!orderDoc.exists()) throw new Error("USER_ERROR: الطلب غير موجود.");
                
                const updateData: Partial<Order> = { status };
                const currentOrder = orderDoc.data() as Order;

                if (status === 'confirmed' && workerId) {
                    if (currentOrder.deliveryWorkerId) return;
                    const workerDocRef = doc(db, "deliveryWorkers", workerId);
                    const workerDoc = await transaction.get(workerDocRef);
                    if (!workerDoc.exists()) throw new Error("USER_ERROR: السائق غير موجود.");
                    const workerData = workerDoc.data() as DeliveryWorker;
                    updateData.deliveryWorkerId = workerId;
                    updateData.deliveryWorker = { id: workerId, name: workerData.name || workerId };
                }
                
                if (status === 'delivered') {
                    const currentWorkerId = currentOrder.deliveryWorkerId;
                    if (currentWorkerId) {
                        const workerDocRef = doc(db, "deliveryWorkers", currentWorkerId);
                        const workerDoc = await transaction.get(workerDocRef); 
                        if (workerDoc.exists()) {
                            const worker = workerDoc.data() as DeliveryWorker;
                            transaction.update(workerDocRef, { 
                                totalDeliveredCount: (worker.totalDeliveredCount || 0) + 1,
                                lastDeliveredAt: new Date().toISOString()
                            });
                        }
                    }
                }
                transaction.update(orderRef, updateData);
            });
        } catch (error: any) {
            console.error("Update status failed:", error);
        }
    }, []);

    const deleteOrder = useCallback(async (orderId: string) => {
        try {
            await runTransaction(db, async (transaction) => {
                transaction.delete(doc(db, "orders", orderId));
            });
            toast({ title: "تم الحذف" });
        } catch(e) {
            toast({title: "فشل الحذف", variant: "destructive"})
        }
    }, [toast]);

    return {
        allOrders,
        isLoading,
        updateOrderStatus,
        deleteOrder,
    };
};
