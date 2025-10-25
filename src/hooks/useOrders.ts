
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

export const useOrders = () => {
    const [allOrders, setAllOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    const { telegramConfigs } = useTelegramConfigs();
    
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

                // Scenario: Driver accepts an available order
                if (status === 'confirmed' && workerId) {
                    const workerDocRef = doc(db, "deliveryWorkers", workerId);
                    const workerDoc = await transaction.get(workerDocRef);
                    if (!workerDoc.exists()) throw new Error("Driver not found");
                    const workerData = workerDoc.data() as DeliveryWorker;
                    updateData.deliveryWorkerId = workerId;
                    updateData.deliveryWorker = { id: workerId, name: workerData.name || workerId };
                }
                
                // Scenario: Driver marks order as delivered
                if (status === 'delivered') {
                    const currentOrder = orderDoc.data() as Order;
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

            if (status === 'preparing') {
                 const orderSnap = await getDoc(doc(db, "orders", orderId));
                 if(orderSnap.exists()) {
                     const orderData = orderSnap.data() as Order;
                      telegramConfigs.filter(c => c.type === 'owner').forEach(c => {
                        sendTelegramMessage(c.chatId, `✅ تم قبول الطلب \`${orderId.substring(0, 6)}\` من قبل مطعم *${orderData.restaurant?.name}*.`);
                    });
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

    