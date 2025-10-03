
import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc, runTransaction, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Order, OrderStatus, Product, DeliveryWorker } from '@/lib/types';
import { useToast } from './use-toast';
import { useDeliveryWorkers } from './useDeliveryWorkers';
import { useTelegram } from './useTelegram';

let allOrders: Order[] = [];
let hasFetched = false;
const listeners = new Set<(data: Order[]) => void>();

const fetchAllOrders = async () => {
    if (hasFetched) return allOrders;
    try {
        const ordersSnap = await getDocs(collection(db, "orders"));
        allOrders = ordersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        hasFetched = true;
        listeners.forEach(listener => listener(allOrders));
        return allOrders;
    } catch (error) {
        console.error("Error fetching orders:", error);
        return [];
    }
};

const ASSIGNMENT_TIMEOUT = 120000; // 2 minutes

export const useOrders = () => {
    const [orders, setOrdersState] = useState<Order[]>(allOrders);
    const [isLoading, setIsLoading] = useState(!hasFetched);
    const { toast } = useToast();
    const { deliveryWorkers } = useDeliveryWorkers();
    const { sendTelegramMessage, telegramConfigs } = useTelegram();

    const setAllOrders = useCallback((newOrders: Order[] | ((prev: Order[]) => Order[])) => {
        if (typeof newOrders === 'function') {
            allOrders = newOrders(allOrders);
        } else {
            allOrders = newOrders;
        }
        allOrders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        listeners.forEach(listener => listener(allOrders));
    }, []);

    const assignOrderToNextWorker = useCallback(async (orderId: string, excludedWorkerIds: string[] = []) => {
        const currentWorkers = deliveryWorkers;
        
        const completedOrdersByWorker: {[workerId: string]: number} = {};
        allOrders.forEach(o => {
            if (o.status === 'delivered' && o.deliveryWorkerId) {
                completedOrdersByWorker[o.deliveryWorkerId] = (completedOrdersByWorker[o.deliveryWorkerId] || 0) + 1;
            }
        });

        const busyWorkerIds = new Set(
            allOrders
                .filter(o => ['confirmed', 'preparing', 'on_the_way'].includes(o.status))
                .map(o => o.deliveryWorkerId)
                .filter((id): id is string => !!id)
        );

        const availableWorkers = currentWorkers.filter(
            w => w.isOnline && !busyWorkerIds.has(w.id) && !excludedWorkerIds.includes(w.id)
        );

        if (availableWorkers.length === 0) {
            console.log("No available workers to assign the order to.");
            await updateDoc(doc(db, "orders", orderId), { status: 'unassigned', assignedToWorkerId: null, assignmentTimestamp: null, rejectedBy: excludedWorkerIds });
            setAllOrders(prev => prev.map(o => o.id === orderId ? {...o, status: 'unassigned', assignedToWorkerId: null, assignmentTimestamp: null, rejectedBy: excludedWorkerIds} : o));
            return;
        }

        availableWorkers.sort((a,b) => (completedOrdersByWorker[a.id] || 0) - (completedOrdersByWorker[b.id] || 0));
        
        const nextWorker = availableWorkers[0];

        const updateData = {
            status: 'pending_assignment' as OrderStatus,
            assignedToWorkerId: nextWorker.id,
            assignmentTimestamp: new Date().toISOString()
        };
        await updateDoc(doc(db, "orders", orderId), updateData);
        setAllOrders(prev => prev.map(o => o.id === orderId ? {...o, ...updateData} : o));
        console.log(`Order ${orderId} assigned to ${nextWorker.name}`);

        const workerConfig = telegramConfigs.find(c => c.type === 'worker' && c.workerId === nextWorker.id);
        const orderData = allOrders.find(o => o.id === orderId); 
        if (workerConfig && orderData) {
            const message = `
*لديك طلب جديد في الانتظار* 🛵
*رقم الطلب:* \`${orderId.substring(0, 6)}\`
*المنطقة:* ${orderData.address.deliveryZone}
*ربحك من التوصيل:* ${new Intl.NumberFormat('ar-IQ', { style: 'currency', currency: 'IQD' }).format(orderData.deliveryFee)}

الرجاء مراجعة التطبيق لقبول أو رفض الطلب.
            `;
            sendTelegramMessage(workerConfig.chatId, message);
        }
    }, [allOrders, deliveryWorkers, setAllOrders, telegramConfigs, sendTelegramMessage]);

    useEffect(() => {
        const listener = (data: Order[]) => setOrdersState(data);
        listeners.add(listener);

        if (!hasFetched) {
            setIsLoading(true);
            fetchAllOrders().finally(() => setIsLoading(false));
        }

        return () => {
            listeners.delete(listener);
        };
    }, []);

    useEffect(() => {
        const unassignedOrders = orders.filter(o => o.status === 'unassigned');
        unassignedOrders.forEach(order => {
            const excludedIds = order.rejectedBy || [];
            assignOrderToNextWorker(order.id, excludedIds);
        });

        const interval = setInterval(() => {
            const pendingOrders = orders.filter(o => o.status === 'pending_assignment');
            pendingOrders.forEach(order => {
                if (!order.assignmentTimestamp || !order.assignedToWorkerId) return;
                const timestamp = new Date(order.assignmentTimestamp).getTime();
                if (Date.now() - timestamp > ASSIGNMENT_TIMEOUT) {
                    console.log(`Order ${order.id} timed out for worker ${order.assignedToWorkerId}. Reassigning...`);
                    const newRejectedBy = Array.from(new Set([...(order.rejectedBy || []), order.assignedToWorkerId]));
                    assignOrderToNextWorker(order.id, newRejectedBy);
                }
            });
        }, 10000); // Check every 10 seconds

        return () => clearInterval(interval);
    }, [orders, assignOrderToNextWorker]);

    const updateOrderStatus = async (orderId: string, status: OrderStatus, workerId?: string) => {
        const orderDocRef = doc(db, "orders", orderId);
        const currentOrder = allOrders.find(o => o.id === orderId);
        if (!currentOrder) return;

        const updateData: any = { status };
        let localWorkerData: { id: string, name: string } | null = null;

        if (status === 'confirmed' && workerId) {
            let worker = deliveryWorkers.find(w => w.id === workerId);
            if (!worker) {
                const workerSnap = await getDoc(doc(db, "deliveryWorkers", workerId));
                if (workerSnap.exists()) {
                    worker = { id: workerSnap.id, ...workerSnap.data() } as DeliveryWorker;
                }
            }
            if (!worker?.name) {
                console.error(`Worker name for ${workerId} is undefined.`);
                updateData.deliveryWorker = { id: workerId, name: "عامل غير معروف" };
            } else {
                 updateData.deliveryWorker = { id: workerId, name: worker.name };
            }
            updateData.deliveryWorkerId = workerId;
            localWorkerData = updateData.deliveryWorker;
        }

        if (status === 'unassigned' && workerId) {
            updateData.assignedToWorkerId = null;
            updateData.assignmentTimestamp = null;
            const newRejectedBy = Array.from(new Set([...(currentOrder.rejectedBy || []), workerId]));
            updateData.rejectedBy = newRejectedBy;
            await updateDoc(orderDocRef, updateData);
            setAllOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'unassigned', assignedToWorkerId: null, assignmentTimestamp: null, rejectedBy: newRejectedBy } : o));
            await assignOrderToNextWorker(orderId, newRejectedBy);
            return;
        } else if (status !== 'unassigned') {
            updateData.assignedToWorkerId = null;
            updateData.assignmentTimestamp = null;
            updateData.rejectedBy = [];
        }

        if (status === 'cancelled') {
            try {
                await runTransaction(db, async (transaction) => {
                    for (const item of currentOrder.items) {
                        const productRef = doc(db, "products", item.product.id);
                        const productDoc = await transaction.get(productRef);
                        if (productDoc.exists()) {
                            const productData = productDoc.data() as Product;
                            if (item.selectedSize) {
                                const newSizes = productData.sizes?.map(s =>
                                    s.name === item.selectedSize!.name
                                        ? { ...s, stock: s.stock + item.quantity }
                                        : s
                                ) ?? [];
                                transaction.update(productRef, { sizes: newSizes });
                            } else {
                                transaction.update(productRef, { stock: (productData.stock || 0) + item.quantity });
                            }
                        }
                    }
                    transaction.update(orderDocRef, updateData);
                });
                setAllOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updateData } : o));
            } catch (e) {
                console.error("Transaction failed: ", e);
                toast({ title: "فشل إلغاء الطلب", description: "حدث خطأ أثناء إعادة المنتجات للمخزون.", variant: "destructive" });
                return;
            }
        } else {
            await updateDoc(orderDocRef, updateData);
            setAllOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updateData, deliveryWorker: localWorkerData !== undefined ? localWorkerData : o.deliveryWorker } : o));
        }

        if (status === 'delivered' && workerId) {
             try {
                const workerDocRef = doc(db, "deliveryWorkers", workerId);
                const worker = deliveryWorkers.find(w => w.id === workerId);
                const now = new Date();
                let unfreezeProgress = worker?.unfreezeProgress || 0;
                const lastDeliveredDate = worker?.lastDeliveredAt ? new Date(worker.lastDeliveredAt) : null;
                let isFrozen = false;
                if (lastDeliveredDate) {
                    const hoursSinceLastDelivery = (now.getTime() - lastDeliveredDate.getTime()) / (1000 * 60 * 60);
                    if (hoursSinceLastDelivery > 48) {
                        isFrozen = true;
                    }
                }
                let workerUpdate: Partial<DeliveryWorker> = {};
                if (isFrozen) {
                    unfreezeProgress += 1;
                    if (unfreezeProgress >= 10) {
                        workerUpdate = { lastDeliveredAt: now.toISOString(), unfreezeProgress: 0 };
                    } else {
                        workerUpdate = { unfreezeProgress };
                    }
                } else {
                    workerUpdate = { lastDeliveredAt: now.toISOString(), unfreezeProgress: 0 };
                }
                await updateDoc(workerDocRef, workerUpdate);
             } catch (error) {
                console.error("Failed to update worker stats on delivery", error);
             }
        }
    };
    
    const deleteOrder = async (orderId: string) => {
        setIsLoading(true);
        try {
            await deleteDoc(doc(db, "orders", orderId));
            setAllOrders(prev => prev.filter(o => o.id !== orderId));
            toast({ title: "تم حذف الطلب بنجاح", variant: "destructive" });
        } catch (error) {
            console.error("Failed to delete order:", error);
            toast({ title: "فشل حذف الطلب", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };
    
    return { allOrders: orders, isLoading, updateOrderStatus, deleteOrder, setAllOrders };
};
