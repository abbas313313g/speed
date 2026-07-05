
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
                if (!orderDoc.exists()) throw new Error("USER_ERROR: عذراً، لم نتمكن من العثور على بيانات هذا الطلب.");
                
                const updateData: Partial<Order> = { status };
                const currentOrder = orderDoc.data() as Order;

                if (status === 'confirmed' && workerId) {
                    if (currentOrder.deliveryWorkerId) throw new Error("USER_ERROR: نعتذر، لقد تم استلام هذا الطلب من قبل سائق آخر بالفعل.");
                    const workerDocRef = doc(db, "deliveryWorkers", workerId);
                    const workerDoc = await transaction.get(workerDocRef);
                    if (!workerDoc.exists()) throw new Error("USER_ERROR: عذراً، لم نتمكن من التحقق من هويتك كعامل توصيل.");
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

            const updatedOrderSnap = await getDoc(doc(db, "orders", orderId));
            if(!updatedOrderSnap.exists()) return;
            const updatedOrder = updatedOrderSnap.data() as Order;

            if (status === 'preparing') {
                telegramConfigs.filter(c => c.type === 'owner').forEach(c => {
                    sendTelegramMessage(c.chatId, `✅ تم قبول الطلب \`${orderId.substring(0, 6)}\` من قبل مطعم *${updatedOrder.restaurant?.name}*.\nالطلب الآن متاح للسائقين.`);
                });
            }

            if (status === 'confirmed' && updatedOrder.deliveryWorker) {
                 const restaurantTelegramConfig = telegramConfigs.find(c => c.type === 'restaurant' && c.restaurantId === updatedOrder.restaurant?.id);
                 if (restaurantTelegramConfig) {
                     sendTelegramMessage(restaurantTelegramConfig.chatId, `🚴 الطلب \`${orderId.substring(0, 6)}\` تم قبوله من قبل السائق *${updatedOrder.deliveryWorker.name}*.`);
                 }
            }

        } catch (error: any) {
            let friendlyMessage = "عذراً، فشل تحديث حالة الطلب. يرجى المحاولة مرة أخرى.";
            if (error.message?.includes("USER_ERROR:")) {
                friendlyMessage = error.message.replace("USER_ERROR: ", "");
            }
            toast({title: "لم يتم التحديث", description: friendlyMessage, variant: "destructive"});
            throw error;
        }
    }, [toast, telegramConfigs]);

    const deleteOrder = useCallback(async (orderId: string) => {
        try {
            const orderRef = doc(db, "orders", orderId);
            await runTransaction(db, async (transaction) => {
                const snap = await transaction.get(orderRef);
                if (snap.exists()) {
                    transaction.delete(orderRef);
                }
            });
            toast({ title: "تم حذف الطلب بنجاح" });
        } catch(e) {
            toast({title: "فشل الحذف", description: "حدث خطأ بسيط، يرجى إعادة المحاولة.", variant: "destructive"})
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
            toast({ title: "تمت تسوية حسابات المتجر بنجاح" });
        } catch (e) {
            toast({ title: "فشل التسوية", description: "حدث خطأ غير متوقع، حاول مجدداً.", variant: "destructive" });
        }
    }, [toast]);
    
    const markDeliveryFeesAsPaid = useCallback(async (orderIds: string[]) => {
        try {
            const batch = writeBatch(db);
            orderIds.forEach(id => {
                const orderRef = doc(db, "orders", id);
                batch.update(orderRef, { isFeePaid: true });
            });
            await batch.commit();
            toast({ title: "تمت تسوية أجور السائق بنجاح" });
        } catch (e) {
            toast({ title: "فشل التسوية", description: "حدث خطأ ما، يرجى المحاولة لاحقاً.", variant: "destructive" });
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
