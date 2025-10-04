
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, onSnapshot, doc, runTransaction, arrayUnion, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Order, OrderStatus, DeliveryWorker } from '@/lib/types';
import { useToast } from './use-toast';
import { getWorkerLevel } from '@/lib/workerLevels';

export const useOrders = () => {
    const [allOrders, setAllOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    
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
    }, []);
    
    const updateOrderStatus = useCallback(async (orderId: string, status: OrderStatus, workerId?: string) => {
        try {
            await runTransaction(db, async (transaction) => {
                const orderRef = doc(db, "orders", orderId);
                const orderDoc = await transaction.get(orderRef);
                if (!orderDoc.exists()) throw new Error("لم يتم العثور على الطلب.");
                const currentOrder = orderDoc.data() as Order;
                
                const updateData: any = { status };

                if (status === 'confirmed' && workerId) {
                    if (currentOrder.status !== 'pending_assignment' || currentOrder.assignedToWorkerId !== workerId) {
                        throw new Error("لم يعد هذا الطلب متاحًا لك.");
                    }
                    
                    // Fetch worker doc within the transaction for consistency
                    const workerDocRef = doc(db, "deliveryWorkers", workerId);
                    const workerDoc = await transaction.get(workerDocRef);

                    if (!workerDoc.exists()) {
                        throw new Error("لم يتم العثور على بيانات العامل أو أن الاسم مفقود.");
                    }

                    const workerData = workerDoc.data() as DeliveryWorker;
                    updateData.deliveryWorkerId = workerId;
                    // Use worker ID as fallback for name to ensure reliability
                    updateData.deliveryWorker = { id: workerId, name: workerData.name || workerId };

                } else if (status === 'unassigned' && workerId) {
                    // This is a rejection, add worker to rejectedBy list
                    updateData.rejectedBy = arrayUnion(workerId);
                }
                
                if (status !== 'pending_assignment') {
                    updateData.assignedToWorkerId = null;
                    updateData.assignmentTimestamp = null;
                }

                if (status === 'delivered' && currentOrder.deliveryWorkerId) {
                    const currentWorkerId = currentOrder.deliveryWorkerId;
                    const workerDocRef = doc(db, "deliveryWorkers", currentWorkerId);
                    const workerDoc = await transaction.get(workerDocRef); // reading inside transaction
                    
                    if (workerDoc.exists()) {
                        const worker = workerDoc.data() as DeliveryWorker;
                        const now = new Date();
                        const myDeliveredOrders = allOrders.filter(o => o.deliveryWorkerId === currentWorkerId && o.status === 'delivered').length + 1;
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

                transaction.update(orderRef, updateData);
            });
            
            toast({ title: `تم تحديث حالة الطلب بنجاح` });

        } catch (error: any) {
            console.error("Failed to update order status:", error);
            toast({title: "فشل تحديث الطلب", description: error.message, variant: "destructive"});
            throw error;
        }
    }, [toast, allOrders]);

    const deleteOrder = useCallback(async (orderId: string) => {
        try {
            await deleteDoc(doc(db, "orders", orderId));
            toast({ title: "تم حذف الطلب بنجاح" });
        } catch(e) {
            console.error(e);
            toast({title: "فشل حذف الطلب", variant: "destructive"})
        }
    }, [toast]);
    
    return {
        allOrders,
        isLoading,
        updateOrderStatus,
        deleteOrder,
    };
};
