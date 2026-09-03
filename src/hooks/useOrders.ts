
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, onSnapshot, doc, updateDoc, query, where, getDocs, limit, deleteDoc, increment, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Order, OrderStatus, DeliveryWorker } from '@/lib/types';
import { useToast } from './use-toast';
import { sendFcmNotification } from '@/services/fcm-service';

export const useOrders = (branchId?: string) => {
    const [allOrders, setAllOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    const isAssigningRef = useRef(false);

    // نظام تدوير الطلبات: سحب الطلب من المندوب إذا تأخر أكثر من 20 ثانية
    const cleanupTimedOutAssignments = useCallback(async (orders: Order[]) => {
        const now = new Date().getTime();
        const timedOutOrders = orders.filter(o => 
            o.status === 'confirmed' && 
            o.confirmedAt && 
            (now - new Date(o.confirmedAt).getTime() > 20000)
        );

        for (const order of timedOutOrders) {
            try {
                // المندوب لم يوافق خلال 20 ثانية، نعيد الطلب للبحث الآلي
                await updateDoc(doc(db, "orders", order.id), {
                    deliveryWorkerId: null,
                    deliveryWorker: null,
                    status: 'pending_assignment',
                    confirmedAt: null,
                    lastSkippedWorkerId: order.deliveryWorkerId // حظر المندوب الحالي من استلام نفس الطلب فوراً
                });
            } catch (e) {
                console.error("Timeout cleanup failed:", e);
            }
        }
    }, []);

    const autoAssignOrders = useCallback(async (orders: Order[]) => {
        if (isAssigningRef.current) return;
        
        // جلب الطلبات التي وافق عليها المتجر وتنتظر مندوب
        const pendingOrders = orders.filter(o => o.status === 'pending_assignment');
        if (pendingOrders.length === 0) return;

        isAssigningRef.current = true;
        try {
            const workersRef = collection(db, "deliveryWorkers");
            // البحث عن المناديب المتصلين والمفعلين في كل الفروع (توزيع عالمي)
            const wQuery = query(
                workersRef, 
                where("isOnline", "==", true), 
                where("isActive", "==", true),
                limit(100)
            );
            const workersSnap = await getDocs(wQuery);
            let onlineWorkers = workersSnap.docs.map(d => ({ id: d.id, ...d.data() })) as DeliveryWorker[];

            if (onlineWorkers.length > 0) {
                for (const order of pendingOrders) {
                    // تجنب إرسال الطلب لنفس المندوب الذي رفضه أو انتهى وقته مؤخراً
                    const availablePool = onlineWorkers.filter(w => w.id !== (order as any).lastSkippedWorkerId);
                    const finalPool = availablePool.length > 0 ? availablePool : onlineWorkers;
                    
                    // اختيار مندوب عشوائي من المتاحين
                    const shuffled = [...finalPool].sort(() => Math.random() - 0.5);
                    const worker = shuffled[0];
                    
                    if (worker) {
                        // إرسال "عرض" للمندوب - الحالة تصبح confirmed وهي تعني بانتظار موافقته
                        await updateDoc(doc(db, "orders", order.id), {
                            deliveryWorkerId: worker.id,
                            deliveryWorker: { id: worker.id, name: worker.name },
                            status: 'confirmed', 
                            confirmedAt: new Date().toISOString()
                        });
                        
                        sendFcmNotification(worker.id, 'deliveryWorkers', 'طلب جديد بانتظارك! 🚀', `لديك 20 ثانية للموافقة على طلب ${order.restaurant?.name || 'جديد'}`);
                    }
                }
            }
        } catch (e) {
            console.error("Auto-assign failed:", e);
        } finally {
            // منع تنفيذ المحرك بشكل متكرر جداً (Throttling)
            setTimeout(() => { isAssigningRef.current = false; }, 4000);
        }
    }, []);

    useEffect(() => {
        const ordersRef = collection(db, 'orders');
        // جلب آخر 500 طلب لضمان الأداء
        let q = query(ordersRef, orderBy("date", "desc"), limit(500));
        
        // فلترة جغرافية للفروع عند الطلب فقط لضمان العزل
        if (branchId && branchId !== 'all' && branchId !== 'main') {
            q = query(ordersRef, where('branchId', '==', branchId), orderBy("date", "desc"), limit(200));
        }

        const unsub = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Order[];
            // الترتيب في الذاكرة لضمان السرعة وعدم الحاجة لـ Index معقد في كل مرة
            const sortedData = data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            
            setAllOrders(sortedData);
            setIsLoading(false);
            
            // تشغيل محركات التوزيع والتدوير
            cleanupTimedOutAssignments(sortedData);
            autoAssignOrders(sortedData);
        }, (error) => {
            setIsLoading(false);
        });
        return () => unsub();
    }, [branchId, autoAssignOrders, cleanupTimedOutAssignments]);
    
    const updateOrderStatus = useCallback(async (orderId: string, status: OrderStatus, workerId?: string) => {
        try {
            const orderRef = doc(db, "orders", orderId);
            const updateData: any = { status };
            
            // المندوب ضغط "قبول" بنفسه
            if (status === 'preparing' && workerId) {
                updateData.deliveryWorkerId = workerId;
                updateData.confirmedAt = null; // إنهاء عداد الـ 20 ثانية
            }

            // إعادة الطلب للبحث (إلغاء المندوب الحالي)
            if (status === 'unassigned') {
                updateData.deliveryWorkerId = null;
                updateData.deliveryWorker = null;
                updateData.confirmedAt = null;
                updateData.status = 'pending_assignment';
            }

            await updateDoc(orderRef, updateData);
            return true;
        } catch (error: any) {
            return false;
        }
    }, []);

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
