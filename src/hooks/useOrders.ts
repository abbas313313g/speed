
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, onSnapshot, doc, runTransaction, getDoc, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Order, OrderStatus, DeliveryWorker } from '@/lib/types';
import { useToast } from './use-toast';
import { sendOrderNotification } from '@/services/onesignal-service';

export const useOrders = (branchId?: string) => {
    const [allOrders, setAllOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    // مرجع لمنع العمليات المتداخلة التي تستهلك الكوتا
    const isAssigning = useRef(false);
    
    const autoAssignOrders = useCallback(async (orders: Order[]) => {
        // حماية: إذا كانت هناك عملية تعيين جارية، لا تبدأ واحدة جديدة
        if (isAssigning.current) return;
        
        const preparingOrders = orders.filter(o => o.status === 'preparing' && !o.deliveryWorkerId);
        if (preparingOrders.length === 0) return;

        isAssigning.current = true;
        try {
            const workersRef = collection(db, "deliveryWorkers");
            // تقنين البحث عن المناديب
            const wQuery = branchId && branchId !== 'all'
                ? query(workersRef, where("isOnline", "==", true), where("branchId", "==", branchId), limit(20))
                : query(workersRef, where("isOnline", "==", true), limit(20));
            
            const workersSnap = await getDocs(wQuery);
            const onlineWorkers = workersSnap.docs.map(d => ({ id: d.id, ...d.data() })) as DeliveryWorker[];

            if (onlineWorkers.length === 0) {
                isAssigning.current = false;
                return;
            }

            // جلب عينة فقط من الطلبات النشطة لحساب الحمل، وليس الكل
            const activeOrdersSnap = await getDocs(query(
                collection(db, "orders"), 
                where("status", "in", ["confirmed", "preparing", "ready_for_pickup", "on_the_way"]),
                limit(50)
            ));
            
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
                    // تحديث الحمل محلياً لمنع تكرار التعيين لنفس المندوب في نفس الحلقة
                    const load = workerLoad.get(bestWorker.id)!;
                    workerLoad.set(bestWorker.id, { ...load, count: load.count + 1, restaurantId: targetRestaurantId });
                    
                    await updateOrderStatus(order.id, 'confirmed', bestWorker.id);
                }
            }
        } catch (e) {
            console.error("Auto-assign process stopped to save quota.");
        } finally {
            isAssigning.current = false;
        }
    }, [branchId]);

    useEffect(() => {
        const ordersRef = collection(db, 'orders');
        // تحديد كمية البيانات المستلمة لتقليل القراءات
        let q = query(ordersRef, limit(100)) as any;
        if (branchId && branchId !== 'all') {
            q = query(ordersRef, where('branchId', '==', branchId), limit(100)) as any;
        }

        const unsub = onSnapshot(q,
            (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Order[];
                data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                setAllOrders(data);
                setIsLoading(false);
                
                // تشغيل التوزيع الآلي فقط في سياق الفرع وبحذر شديد
                if (branchId && branchId !== 'all') {
                    autoAssignOrders(data);
                }
            },
            (error) => {
                console.error("Firestore quota or rules error:", error);
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
                if (!orderDoc.exists()) return;
                
                const updateData: Partial<Order> = { status };
                const currentOrder = orderDoc.data() as Order;

                if (status === 'confirmed' && workerId) {
                    if (currentOrder.deliveryWorkerId) return;
                    const workerDocRef = doc(db, "deliveryWorkers", workerId);
                    const workerDoc = await transaction.get(workerDocRef);
                    if (!workerDoc.exists()) return;
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

            if (status === 'confirmed' && workerId) {
                sendOrderNotification(workerId);
            }
        } catch (error: any) {
            console.error("Transaction failed:", error);
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
