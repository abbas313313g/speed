
"use client";

import { useContext, useCallback } from 'react';
import { AppContext } from '@/contexts/AppContext';
import { useToast } from './use-toast';
import { doc, runTransaction, arrayUnion, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Order, OrderStatus, DeliveryWorker } from '@/lib/types';
import { getWorkerLevel } from '@/lib/workerLevels';

export const useOrders = () => {
    const context = useContext(AppContext);
    const { toast } = useToast();

    if (!context) {
        throw new Error('useOrders must be used within an AppProvider');
    }

    const { allOrders, setAllOrders, telegramConfigs, assignOrderToNextWorker, setDeliveryWorkers } = context;

    const updateOrderStatus = useCallback(async (orderId: string, status: OrderStatus, workerId?: string) => {
        try {
            await runTransaction(db, async (transaction) => {
                const orderRef = doc(db, "orders", orderId);
                const orderDoc = await transaction.get(orderRef);

                if (!orderDoc.exists()) {
                    throw new Error("لم يتم العثور على الطلب.");
                }

                const currentOrder = orderDoc.data() as Order;
                const updateData: any = { status };

                if (status === 'confirmed' && workerId) {
                    if (currentOrder.status !== 'pending_assignment' || currentOrder.assignedToWorkerId !== workerId) {
                        throw new Error("لم يعد هذا الطلب متاحًا لك.");
                    }
                    const workerDocRef = doc(db, "deliveryWorkers", workerId);
                    const workerDoc = await transaction.get(workerDocRef);
                    if (!workerDoc.exists()) {
                        throw new Error("لم يتم العثور على عامل التوصيل.");
                    }
                    const workerData = workerDoc.data();
                    updateData.deliveryWorkerId = workerId;
                    updateData.deliveryWorker = { id: workerId, name: workerData.name };
                }

                if (status === 'unassigned' && workerId) {
                    updateData.rejectedBy = arrayUnion(workerId);
                }
                
                if (status !== 'pending_assignment') {
                    updateData.assignedToWorkerId = null;
                    updateData.assignmentTimestamp = null;
                    if (status !== 'unassigned') updateData.rejectedBy = [];
                }

                transaction.update(orderRef, updateData);

                if (status === 'delivered' && workerId) {
                    const workerDocRef = doc(db, "deliveryWorkers", workerId);
                    const workerDoc = await transaction.get(workerDocRef);
                    if (workerDoc.exists()) {
                        const worker = workerDoc.data() as DeliveryWorker;
                        const now = new Date();
                        
                        // Note: This count is based on client-side data, for a more robust solution, this should be a server-side count.
                        const myDeliveredOrders = allOrders.filter(o => o.deliveryWorkerId === workerId && o.status === 'delivered').length + 1;

                        const { isFrozen } = getWorkerLevel(worker, myDeliveredOrders, now);
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
            });

            // After the transaction is successful, update the local state
            const updatedOrderSnap = await getDoc(doc(db, "orders", orderId));
            if (!updatedOrderSnap.exists()) return;
            const updatedOrder = { id: updatedOrderSnap.id, ...updatedOrderSnap.data() } as Order;

            setAllOrders(prev => prev.map(o => o.id === orderId ? updatedOrder : o));
            
            if (status === 'delivered' && workerId) {
                const updatedWorkerSnap = await getDoc(doc(db, "deliveryWorkers", workerId));
                if (updatedWorkerSnap.exists()) {
                    const updatedWorker = { id: updatedWorkerSnap.id, ...updatedWorkerSnap.data() } as DeliveryWorker;
                    setDeliveryWorkers(prev => prev.map(w => w.id === workerId ? updatedWorker : w));
                }
            }
            
            if (status === 'unassigned' && workerId) {
                await assignOrderToNextWorker(orderId, updatedOrder.rejectedBy || []);
            }
            toast({ title: `تم تحديث حالة الطلب بنجاح` });

        } catch (error: any) {
            console.error("Failed to update order status:", error);
            toast({title: "فشل تحديث الطلب", description: error.message, variant: "destructive"});
            // Re-fetch orders to ensure UI is consistent with backend state after a failed transaction
            const ordersSnap = await getDocs(collection(db, "orders"));
            setAllOrders(ordersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            throw error;
        }
    }, [toast, allOrders, assignOrderToNextWorker, setAllOrders, setDeliveryWorkers, telegramConfigs]);

    return {
        allOrders: context.allOrders,
        isLoading: context.isLoading,
        updateOrderStatus,
        deleteOrder: context.deleteOrder,
    };
};
