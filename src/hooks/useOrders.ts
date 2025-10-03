
"use client";

import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, updateDoc, deleteDoc, doc, runTransaction, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Order, OrderStatus, DeliveryWorker } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { getWorkerLevel } from '@/lib/workerLevels';
import { sendTelegramMessage } from '@/lib/telegram';
import { formatCurrency } from '@/lib/utils';
import { useTelegramConfigs } from './useTelegramConfigs';
import { useDeliveryWorkers } from './useDeliveryWorkers';

export const useOrders = () => {
    const [allOrders, setAllOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    const { telegramConfigs } = useTelegramConfigs();
    const { deliveryWorkers, setDeliveryWorkers } = useDeliveryWorkers();


    useEffect(() => {
        const fetchOrders = async () => {
            setIsLoading(true);
            try {
                const querySnapshot = await getDocs(collection(db, "orders"));
                const orders = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                setAllOrders(orders);
            } catch (error) {
                console.error("Error fetching orders:", error);
                toast({ title: "فشل تحميل الطلبات", variant: "destructive" });
            } finally {
                setIsLoading(false);
            }
        };
        fetchOrders();
    }, [toast]);
    
    const assignOrderToNextWorker = useCallback(async (orderId: string, excludedWorkerIds: string[] = []) => {
        try {
            await runTransaction(db, async (transaction) => {
                const orderRef = doc(db, "orders", orderId);
                const orderDoc = await transaction.get(orderRef);
                if (!orderDoc.exists()) throw new Error("Order does not exist.");

                const currentWorkersSnapshot = await getDocs(collection(db, "deliveryWorkers"));
                const allCurrentWorkers = currentWorkersSnapshot.docs.map(d => ({id: d.id, ...d.data()}) as DeliveryWorker);
                
                const allOrdersSnapshot = await getDocs(collection(db, "orders"));
                const allCurrentOrders = allOrdersSnapshot.docs.map(d => ({id: d.id, ...d.data()}) as Order);

                const completedOrdersByWorker: {[workerId: string]: number} = {};
                allCurrentOrders.forEach(o => {
                    if (o.status === 'delivered' && o.deliveryWorkerId) {
                        completedOrdersByWorker[o.deliveryWorkerId] = (completedOrdersByWorker[o.deliveryWorkerId] || 0) + 1;
                    }
                });
                const busyWorkerIds = new Set(allCurrentOrders.filter(o => ['confirmed', 'preparing', 'on_the_way'].includes(o.status)).map(o => o.deliveryWorkerId).filter((id): id is string => !!id));
                
                const availableWorkers = allCurrentWorkers.filter(w => w.isOnline && !busyWorkerIds.has(w.id) && !excludedWorkerIds.includes(w.id));

                if (availableWorkers.length === 0) {
                    transaction.update(orderRef, { status: 'unassigned' as OrderStatus, assignedToWorkerId: null, assignmentTimestamp: null, rejectedBy: excludedWorkerIds });
                    return;
                }

                availableWorkers.sort((a,b) => (completedOrdersByWorker[a.id] || 0) - (completedOrdersByWorker[b.id] || 0));
                const nextWorker = availableWorkers[0];
                transaction.update(orderRef, { status: 'pending_assignment' as OrderStatus, assignedToWorkerId: nextWorker.id, assignmentTimestamp: new Date().toISOString(), rejectedBy: excludedWorkerIds });
                
                const workerConfig = telegramConfigs.find(c => c.type === 'worker' && c.workerId === nextWorker.id);
                const orderData = allCurrentOrders.find(o => o.id === orderId); 
                if (workerConfig && orderData) {
                    sendTelegramMessage(workerConfig.chatId, `*لديك طلب جديد في الانتظار* 🛵\n*رقم الطلب:* \`${orderId.substring(0, 6)}\`\n*المنطقة:* ${orderData.address.deliveryZone}\n*ربحك من التوصيل:* ${formatCurrency(orderData.deliveryFee)}`);
                }
            });

            const updatedOrderSnap = await getDoc(doc(db, "orders", orderId));
            if(updatedOrderSnap.exists()){
                const updatedOrder = { id: updatedOrderSnap.id, ...updatedOrderSnap.data() } as Order;
                setAllOrders(prev => prev.map(o => o.id === orderId ? updatedOrder : o));
            }
        } catch (error) {
            console.error("Failed to assign order to next worker:", error);
            toast({title: "فشل تعيين الطلب", description: "حدث خطأ أثناء محاولة تعيين الطلب لعامل آخر.", variant: "destructive"});
        }
    }, [toast, telegramConfigs]);

    const addOrder = useCallback(async (newOrder: Order) => {
        setAllOrders(prev => [newOrder, ...prev]);
        telegramConfigs.filter(c => c.type === 'owner').forEach(c => {
            sendTelegramMessage(c.chatId, `*طلب جديد!* 🎉\n*رقم الطلب:* \`${newOrder.id.substring(0, 6)}\`\n*الزبون:* ${newOrder.address.name}\n*المنطقة:* ${newOrder.address.deliveryZone}\n*المبلغ:* ${formatCurrency(newOrder.total)}`);
        });
        await assignOrderToNextWorker(newOrder.id, []);
    }, [telegramConfigs, assignOrderToNextWorker]);
    
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

                    updateData.deliveryWorkerId = workerId;
                    updateData.deliveryWorker = { id: workerId, name: workerData.name };
                }
                
                if (status === 'unassigned' && workerId) {
                    const newRejectedBy = Array.from(new Set([...(currentOrder.rejectedBy || []), workerId]));
                    updateData.rejectedBy = newRejectedBy;
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
                await assignOrderToNextWorker(orderId, updatedOrder.rejectedBy);
            }
        } catch (error: any) {
            console.error("Failed to update order status:", error);
            toast({title: "فشل تحديث الطلب", description: error.message, variant: "destructive"});
            throw error;
        }

    }, [toast, allOrders, setDeliveryWorkers, assignOrderToNextWorker]);

    const deleteOrder = useCallback(async (orderId: string) => {
        try {
            await deleteDoc(doc(db, "orders", orderId));
            setAllOrders(prev => prev.filter(o => o.id !== orderId));
            toast({ title: "تم حذف الطلب بنجاح" });
        } catch (error) {
            toast({ title: "فشل حذف الطلب", variant: "destructive" });
        }
    }, [toast]);

    return { allOrders, isLoading, addOrder, updateOrderStatus, deleteOrder };
};
