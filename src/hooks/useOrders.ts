
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, onSnapshot, doc, updateDoc, query, where, getDocs, limit, deleteDoc, increment, orderBy, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Order, OrderStatus, DeliveryWorker } from '@/lib/types';
import { useToast } from './use-toast';
import { sendFcmNotification } from '@/services/fcm-service';
import { calculateDistance, formatCurrency } from '@/lib/utils';
import { useTelegramConfigs } from './useTelegramConfigs';
import { sendTelegramMessage } from '@/lib/telegram';

export const useOrders = (branchId?: string, fetchLimit: number = 500, refreshKey?: number) => {
    const [allOrders, setAllOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    const { telegramConfigs } = useTelegramConfigs();
    
    const isAssigningRef = useRef(false);
    const lastCleanupTimeRef = useRef(0);
    const onlineWorkersRef = useRef<DeliveryWorker[]>([]);

    useEffect(() => {
        const workersRef = collection(db, "deliveryWorkers");
        const wQuery = query(workersRef, where("isOnline", "==", true), where("isActive", "==", true));
        const unsub = onSnapshot(wQuery, (snap) => {
            onlineWorkersRef.current = snap.docs.map(d => ({ id: d.id, ...d.data() })) as DeliveryWorker[];
        });
        return () => unsub();
    }, []);

    const cleanupTimedOutAssignments = useCallback(async (orders: Order[]) => {
        const now = Date.now();
        if (now - lastCleanupTimeRef.current < 10000) return;
        lastCleanupTimeRef.current = now;

        const timedOutOrders = orders.filter(o => 
            o.status === 'confirmed' && 
            o.confirmedAt && 
            (now - new Date(o.confirmedAt).getTime() > 20000)
        );

        for (const order of timedOutOrders) {
            try {
                await updateDoc(doc(db, "orders", order.id), {
                    deliveryWorkerId: null,
                    deliveryWorker: null,
                    status: 'pending_assignment',
                    confirmedAt: null,
                    lastSkippedWorkerId: order.deliveryWorkerId
                });
            } catch (e) {}
        }
    }, []);

    const autoAssignOrders = useCallback(async (orders: Order[]) => {
        if (isAssigningRef.current) return;
        
        const pendingOrders = orders.filter(o => o.status === 'pending_assignment');
        if (pendingOrders.length === 0) return;

        isAssigningRef.current = true;

        try {
            const onlineWorkers = onlineWorkersRef.current;

            if (onlineWorkers.length > 0) {
                for (const order of pendingOrders) {
                    const lastSkipped = (order as any).lastSkippedWorkerId;
                    let candidates = onlineWorkers.filter(w => w.branchId === order.branchId && w.id !== lastSkipped);
                    
                    if (candidates.length === 0) {
                        candidates = onlineWorkers.filter(w => 
                            w.id !== lastSkipped &&
                            w.latitude && w.longitude && order.restaurant?.latitude && order.restaurant?.longitude &&
                            calculateDistance(order.restaurant.latitude, order.restaurant.longitude, w.latitude, w.longitude) < 18
                        );
                    }

                    if (candidates.length > 0) {
                        const worker = [...candidates].sort(() => Math.random() - 0.5)[0];
                        
                        await updateDoc(doc(db, "orders", order.id), {
                            deliveryWorkerId: worker.id,
                            deliveryWorker: { id: worker.id, name: worker.name },
                            status: 'confirmed', 
                            confirmedAt: new Date().toISOString()
                        });
                        
                        sendFcmNotification(worker.id, 'deliveryWorkers', 'طلب جديد بانتظارك! 🚀', `لديك 20 ثانية لقبول طلب ${order.restaurant?.name || 'جديد'}`);
                        break; 
                    }
                }
            }
        } catch (e) {
            console.error("Auto-assign failed:", e);
        } finally {
            setTimeout(() => { isAssigningRef.current = false; }, 3000);
        }
    }, []);

    // المستمع الرئيسي للطلبات مع نظام التحديث المستمر والفوري
    useEffect(() => {
        setIsLoading(true);
        const ordersRef = collection(db, 'orders');
        
        let q;
        if (branchId && branchId !== 'all') {
            q = query(ordersRef, where("branchId", "==", branchId), orderBy("date", "desc"), limit(fetchLimit));
        } else {
            q = query(ordersRef, orderBy("date", "desc"), limit(fetchLimit));
        }

        // استخدام نظام Snapshot المستمر لضمان التحديث اللحظي بدون استهلاك انترنت كبير
        const unsub = onSnapshot(q, { includeMetadataChanges: false }, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Order[];
            setAllOrders(data);
            setIsLoading(false);
            
            if (!snapshot.metadata.fromCache) {
                cleanupTimedOutAssignments(data);
                autoAssignOrders(data);
            }
        }, (error) => {
            console.error("Orders Sync Error:", error);
            setIsLoading(false);
        });

        return () => unsub();
    }, [branchId, fetchLimit, refreshKey, autoAssignOrders, cleanupTimedOutAssignments]);
    
    const updateOrderStatus = useCallback(async (orderId: string, status: OrderStatus, workerId?: string) => {
        try {
            const orderRef = doc(db, "orders", orderId);
            const orderSnap = await getDoc(orderRef);
            if (!orderSnap.exists()) return false;
            const currentOrder = { id: orderSnap.id, ...orderSnap.data() } as Order;
            
            if (status === 'delivered' && currentOrder.status === 'delivered') return true; 

            const updateData: any = { status };
            
            if (status === 'preparing' && workerId) {
                updateData.deliveryWorkerId = workerId;
                updateData.confirmedAt = null; 
            }

            if (status === 'unassigned') {
                updateData.deliveryWorkerId = null;
                updateData.deliveryWorker = null;
                updateData.confirmedAt = null;
                updateData.status = 'pending_assignment'; 
                if (workerId) updateData.lastSkippedWorkerId = workerId; 
            }

            if (status === 'delivered' && currentOrder.status !== 'delivered') {
                const itemsPrice = currentOrder.items.reduce((sum, item) => {
                    const price = item.selectedSize?.price || item.product.price || 0;
                    return sum + (price * item.quantity);
                }, 0);
                const rate = currentOrder.restaurant?.commissionRate || 10;
                const storeIncome = itemsPrice * (1 - rate / 100);

                await updateDoc(doc(db, "restaurants", currentOrder.restaurant!.id), {
                    balanceAdjustment: increment(storeIncome)
                });

                if (currentOrder.deliveryWorkerId) {
                    await updateDoc(doc(db, "deliveryWorkers", currentOrder.deliveryWorkerId), {
                        balanceAdjustment: increment(currentOrder.deliveryFee || 0),
                        debtAdjustment: increment(currentOrder.total || 0)
                    });
                }
            }

            await updateDoc(orderRef, updateData);

            if (status === 'cancelled' && currentOrder) {
                const cancelMsg = `❌ *تم إلغاء الطلب!*
📌 *رقم القائمة:* #${currentOrder.orderNumber}
🏠 *المتجر:* ${currentOrder.restaurant?.name || 'غير معروف'}
📍 *المنطقة:* ${currentOrder.address.deliveryZone}
💰 *المبلغ:* ${formatCurrency(currentOrder.total)}
🏙️ *الفرع:* ${currentOrder.branchId === 'main' ? 'المركز الرئيسي' : currentOrder.branchId}
📞 *هاتف الزبون:* ${currentOrder.address.phone}`;

                telegramConfigs.filter(c => c.type === 'admin_orders').forEach(config => {
                    if (config.targetBranchId === 'all' || config.targetBranchId === currentOrder.branchId) {
                        sendTelegramMessage(config.chatId, cancelMsg).catch(() => {});
                    }
                });
            }

            return true;
        } catch (error: any) {
            return false;
        }
    }, [telegramConfigs]);

    const deleteOrder = useCallback(async (orderId: string) => {
        try {
            await deleteDoc(doc(db, "orders", orderId));
            toast({ title: "تم حذف الطلب نهائياً ✅" });
        } catch(e) {
            toast({ title: "فشل حذف الطلب", variant: "destructive" });
        }
    }, [toast]);

    return { allOrders, isLoading, updateOrderStatus, deleteOrder };
};
