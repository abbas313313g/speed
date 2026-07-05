
"use client";

import { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, doc, runTransaction, getDoc, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Order, OrderStatus, DeliveryWorker } from '@/lib/types';
import { useToast } from './use-toast';
import { getWorkerLevel } from '@/lib/workerLevels';
import { sendTelegramMessage } from '@/lib/telegram';
import { useTelegramConfigs } from './useTelegramConfigs';
import { useDeliveryWorkers } from './useDeliveryWorkers';

export const useOrders = () => {
    const [allOrders, setAllOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    const { telegramConfigs } = useTelegramConfigs();
    
    // Automatic Assignment Logic with Constraints
    const autoAssignOrders = useCallback(async (orders: Order[]) => {
        const preparingOrders = orders.filter(o => o.status === 'preparing' && !o.deliveryWorkerId);
        if (preparingOrders.length === 0) return;

        try {
            const workersSnap = await getDocs(query(collection(db, "deliveryWorkers"), where("isOnline", "==", true)));
            const onlineWorkers = workersSnap.docs.map(d => ({ id: d.id, ...d.data() })) as DeliveryWorker[];

            if (onlineWorkers.length === 0) return;

            // Get active orders once to calculate workload
            const activeOrdersQuery = query(collection(db, "orders"), where("status", "in", ["confirmed", "preparing", "ready_for_pickup", "on_the_way"]));
            const activeOrdersSnap = await getDocs(activeOrdersQuery);
            
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

                // Rules:
                // 1. Must be from the same restaurant if already has orders.
                // 2. Max 2 orders total.
                // 3. Prefer completely free drivers first (Equality).
                
                const eligibleWorkers = onlineWorkers.filter(w => {
                    const load = workerLoad.get(w.id)!;
                    if (load.count === 0) return true; // Completely free
                    if (load.count < 2 && load.restaurantId === targetRestaurantId) return true; // Same restaurant, less than 2
                    return false;
                });

                if (eligibleWorkers.length === 0) continue;

                // Sort by: load count (ascending), then career deliveries (ascending for fairness)
                const sortedWorkers = eligibleWorkers.sort((a, b) => {
                    const loadA = workerLoad.get(a.id)!.count;
                    const loadB = workerLoad.get(b.id)!.count;
                    if (loadA !== loadB) return loadA - loadB;
                    return (a.totalDeliveredCount || 0) - (b.totalDeliveredCount || 0);
                });

                const bestWorker = sortedWorkers[0];
                if (bestWorker) {
                    await updateOrderStatus(order.id, 'confirmed', bestWorker.id);
                    // Update local load map so next order in loop knows this worker is busy
                    const current = workerLoad.get(bestWorker.id)!;
                    workerLoad.set(bestWorker.id, { restaurantId: targetRestaurantId, count: current.count + 1 });
                    console.log(`Auto-assigned order ${order.id} to worker ${bestWorker.name}`);
                }
            }
        } catch (e) {
            console.error("Auto-assign failed:", e);
        }
    }, []);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'orders'),
            (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Order[];
                data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                setAllOrders(data);
                setIsLoading(false);
                
                // Trigger auto assign check
                autoAssignOrders(data);
            },
            (error) => {
                console.error("Error fetching orders:", error);
                setIsLoading(false);
            }
        );
        return () => unsub();
    }, [autoAssignOrders]);
    
    const updateOrderStatus = useCallback(async (orderId: string, status: OrderStatus, workerId?: string) => {
        try {
            await runTransaction(db, async (transaction) => {
                const orderRef = doc(db, "orders", orderId);
                const orderDoc = await transaction.get(orderRef);
                if (!orderDoc.exists()) throw new Error("USER_ERROR: الطلب غير موجود.");
                
                const updateData: Partial<Order> = { status };
                const currentOrder = orderDoc.data() as Order;

                if (status === 'confirmed' && workerId) {
                    if (currentOrder.deliveryWorkerId) return; // Already assigned
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
                            const totalCount = (worker.totalDeliveredCount || 0) + 1;
                            transaction.update(workerDocRef, { 
                                totalDeliveredCount: totalCount,
                                lastDeliveredAt: new Date().toISOString()
                            });
                        }
                    }
                }
                transaction.update(orderRef, updateData);
            });
            
            const updatedOrderSnap = await getDoc(doc(db, "orders", orderId));
            const updatedOrder = updatedOrderSnap.data() as Order;

            // Telegram Notifications
            if (status === 'preparing') {
                telegramConfigs.filter(c => c.type === 'restaurant' && c.restaurantId === updatedOrder.restaurant?.id).forEach(c => {
                    sendTelegramMessage(c.chatId, `🔔 *طلب جديد قيد التحضير!*\nرقم الطلب: \`${orderId.substring(0, 6)}\`\nالمبلغ: ${updatedOrder.total}`);
                });
            }

            if (status === 'confirmed' && updatedOrder.deliveryWorker) {
                 const restaurantTelegramConfig = telegramConfigs.find(c => c.type === 'restaurant' && c.restaurantId === updatedOrder.restaurant?.id);
                 if (restaurantTelegramConfig) {
                     sendTelegramMessage(restaurantTelegramConfig.chatId, `🚴 *تم تعيين سائق!*\nالطلب \`${orderId.substring(0, 6)}\` استلمه الكابتن: *${updatedOrder.deliveryWorker.name}*`);
                 }
            }

        } catch (error: any) {
            console.error("Update status failed:", error);
        }
    }, [telegramConfigs]);

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
    
    const markOrdersAsPaid = useCallback(async (orderIds: string[]) => {
        try {
            const batch = writeBatch(db);
            orderIds.forEach(id => batch.update(doc(db, "orders", id), { isPaid: true }));
            await batch.commit();
            toast({ title: "تمت التسوية" });
        } catch (e) {
            toast({ title: "فشل التسوية", variant: "destructive" });
        }
    }, [toast]);
    
    const markDeliveryFeesAsPaid = useCallback(async (orderIds: string[]) => {
        try {
            const batch = writeBatch(db);
            orderIds.forEach(id => batch.update(doc(db, "orders", id), { isFeePaid: true }));
            await batch.commit();
            toast({ title: "تمت تسوية أجور السائق" });
        } catch (e) {
            toast({ title: "فشل التسوية", variant: "destructive" });
        }
    }, [toast]);

    return {
        allOrders,
        isLoading,
        updateOrderStatus,
        deleteOrder,
        markOrdersAsPaid,
        markDeliveryFeesAsPaid,
    };
};

