
"use client";

import { useContext, useCallback } from 'react';
import { AppContext } from '@/contexts/AppContext';
import { useToast } from './use-toast';
import { doc, runTransaction, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Order, OrderStatus, DeliveryWorker } from '@/lib/types';
import { getWorkerLevel } from '@/lib/workerLevels';

export const useOrders = () => {
    const context = useContext(AppContext);
    
    if (!context) {
        throw new Error('useOrders must be used within an AppProvider');
    }
    
    const { toast } = useToast();
    const { allOrders, deliveryWorkers } = context;

    const assignOrderToNextWorker = useCallback(async (orderId: string, excludedWorkerIds: string[] = []) => {
        // This function is now managed inside the AppContext to avoid circular dependencies
    }, []);

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
                    const workerData = workerDoc.data() as DeliveryWorker;
                    const workerInfoForOrder = { id: workerId, name: workerData.name };
                    updateData.deliveryWorkerId = workerId;
                    updateData.deliveryWorker = workerInfoForOrder;
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
                        
                        // We filter `allOrders` from the context, which is updated by onSnapshot
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

            // The onSnapshot in AppContext will handle UI updates automatically.
            toast({ title: `تم تحديث حالة الطلب بنجاح` });

            // If an order was rejected, trigger the reassignment logic.
             if (status === 'unassigned' && workerId) {
                const order = allOrders.find(o => o.id === orderId);
                if (order && context.assignOrderToNextWorker) {
                    // Use the function from context
                    await context.assignOrderToNextWorker(orderId, order.rejectedBy);
                }
            }

        } catch (error: any) {
            console.error("Failed to update order status:", error);
            toast({title: "فشل تحديث الطلب", description: error.message, variant: "destructive"});
            throw error;
        }
    }, [toast, allOrders, context]);

    return {
        allOrders: context.allOrders,
        isLoading: context.isLoading,
        updateOrderStatus,
        deleteOrder: context.deleteOrder,
    };
};

    