
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, onSnapshot, doc, runTransaction, arrayUnion, deleteDoc, getDoc, writeBatch, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Order, OrderStatus, DeliveryWorker } from '@/lib/types';
import { useToast } from './use-toast';
import { getWorkerLevel } from '@/lib/workerLevels';
import { sendTelegramMessage } from '@/lib/telegram';
import { useTelegramConfigs } from './useTelegramConfigs';
import { formatCurrency } from '@/lib/utils';
import { useDeliveryWorkers } from './useDeliveryWorkers';

export const useOrders = () => {
    const [allOrders, setAllOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    const { telegramConfigs } = useTelegramConfigs();
    const { deliveryWorkers } = useDeliveryWorkers();
    
    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'orders'),
            (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Order[];
                data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                setAllOrders(data);
                setIsLoading(false);
            },
            (error) => {
                console.error("Error fetching orders:", error);
                toast({ title: "Failed to fetch orders", variant: "destructive" });
                setIsLoading(false);
            }
        );
        return () => unsub();
    }, [toast]);
    
    const updateOrderStatus = useCallback(async (orderId: string, status: OrderStatus, workerId?: string) => {
        try {
            await runTransaction(db, async (transaction) => {
                const orderRef = doc(db, "orders", orderId);
                const orderDoc = await transaction.get(orderRef);
                if (!orderDoc.exists()) throw new Error("لم يتم العثور على الطلب.");
                
                const updateData: Partial<Order> = { status };
                const currentOrder = orderDoc.data() as Order;

                // Scenario: Driver accepts an available order
                if (status === 'confirmed' && workerId) {
                    if (currentOrder.deliveryWorkerId) throw new Error("This order has already been taken.");
                    const workerDocRef = doc(db, "deliveryWorkers", workerId);
                    const workerDoc = await transaction.get(workerDocRef);
                    if (!workerDoc.exists()) throw new Error("Driver not found");
                    const workerData = workerDoc.data() as DeliveryWorker;
                    updateData.deliveryWorkerId = workerId;
                    updateData.deliveryWorker = { id: workerId, name: workerData.name || workerId };
                }
                
                // Scenario: Driver marks order as delivered
                if (status === 'delivered') {
                    const currentWorkerId = currentOrder.deliveryWorkerId;
                    if (currentWorkerId) {
                        const workerDocRef = doc(db, "deliveryWorkers", currentWorkerId);
                        const workerDoc = await transaction.get(workerDocRef); 
                        
                        if (workerDoc.exists()) {
                            const worker = workerDoc.data() as DeliveryWorker;
                            const now = new Date();
                            
                             const myDeliveredOrdersSnapshot = await getDocs(query(collection(db, "orders"), where("deliveryWorkerId", "==", currentWorkerId), where("status", "==", "delivered")));
                             const deliveredCount = myDeliveredOrdersSnapshot.size;

                            const { isFrozen } = getWorkerLevel(worker, deliveredCount, now);
                            
                            let workerUpdate: Partial<DeliveryWorker> = {};
                            if (isFrozen) {
                                const unfreezeProgress = (worker.unfreezeProgress || 0) + 1;
                                workerUpdate = (unfreezeProgress >= 10) ? { lastDeliveredAt: now.toISOString(), unfreezeProgress: 0 } : { unfreezeProgress };
                            } else {
                                workerUpdate = { lastDeliveredAt: now.toISOString(), unfreezeProgress: 0 };
                            }
                            transaction.update(workerDocRef, workerUpdate);
                        }
                    }
                }
                
                transaction.update(orderRef, updateData);
            });
            
            toast({ title: `تم تحديث حالة الطلب بنجاح` });

            // Fetch the updated order for notifications
            const updatedOrderSnap = await getDoc(doc(db, "orders", orderId));
            if(!updatedOrderSnap.exists()) return;
            const updatedOrder = updatedOrderSnap.data() as Order;

            // Notify owner when restaurant accepts
            if (status === 'preparing') {
                telegramConfigs.filter(c => c.type === 'owner').forEach(c => {
                    sendTelegramMessage(c.chatId, `✅ تم قبول الطلب \`${orderId.substring(0, 6)}\` من قبل مطعم *${updatedOrder.restaurant?.name}*.\nالطلب الآن متاح للسائقين.`);
                });
            }

            // Notify restaurant when driver accepts
            if (status === 'confirmed' && updatedOrder.deliveryWorker) {
                 const restaurantTelegramConfig = telegramConfigs.find(c => c.type === 'restaurant' && c.restaurantId === updatedOrder.restaurant?.id);
                 if (restaurantTelegramConfig) {
                     sendTelegramMessage(restaurantTelegramConfig.chatId, `🚴 الطلب \`${orderId.substring(0, 6)}\` تم قبوله من قبل السائق *${updatedOrder.deliveryWorker.name}*.`);
                 }
            }


        } catch (error: any) {
            console.error("Failed to update order status:", error);
            toast({title: "فشل تحديث الطلب", description: error.message, variant: "destructive"});
            throw error;
        }
    }, [toast, telegramConfigs]);

    const deleteOrder = useCallback(async (orderId: string) => {
        try {
            await deleteDoc(doc(db, "orders", orderId));
            toast({ title: "تم حذف الطلب بنجاح" });
        } catch(e) {
            console.error(e);
            toast({title: "فشل حذف الطلب", variant: "destructive"})
        }
    }, [toast]);
    
    const markOrdersAsPaid = useCallback(async (orderIds: string[]) => {
        try {
            const batch = writeBatch(db);
            orderIds.forEach(id => {
                const orderRef = doc(db, "orders", id);
                batch.update(orderRef, { isPaid: true });
            });
            await batch.commit();
            toast({ title: "تم تحديث سجل الطلبات بنجاح" });
        } catch (e) {
            console.error("Failed to mark orders as paid:", e);
            toast({ title: "فشل تحديث السجل", variant: "destructive" });
        }
    }, [toast]);

    return {
        allOrders,
        isLoading,
        updateOrderStatus,
        deleteOrder,
        markOrdersAsPaid,
    };
};
