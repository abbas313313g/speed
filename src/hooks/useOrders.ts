"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, onSnapshot, doc, updateDoc, query, where, getDocs, limit, deleteDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Order, OrderStatus, DeliveryWorker } from '@/lib/types';
import { useToast } from './use-toast';

const ASSIGNMENT_TIMEOUT_MS = 20000; // 20 ثانية لموافقة المندوب

export const useOrders = (branchId?: string) => {
    const [allOrders, setAllOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    const isAssigningRef = useRef(false);

    // عقوبة المندوب عند تجاهل 3 طلبات
    const penalizeWorker = useCallback(async (workerId: string) => {
        try {
            const workerRef = doc(db, "deliveryWorkers", workerId);
            const workerSnap = await getDocs(query(collection(db, "deliveryWorkers"), where("__name__", "==", workerId)));
            if (workerSnap.empty) return;
            
            const workerData = workerSnap.docs[0].data();
            const currentIdle = (workerData.idleCount || 0) + 1;
            
            if (currentIdle >= 3) {
                await updateDoc(workerRef, { isOnline: false, idleCount: 0 });
                // التنبيه يظهر فقط للمندوب المعني إذا كان فاتح التطبيق
                if (typeof window !== 'undefined' && localStorage.getItem('deliveryWorkerId') === workerId) {
                    toast({ 
                        title: "تم إيقاف نشاطك تلقائياً", 
                        description: "بسبب تجاهل 3 طلبات متتالية. يرجى تفعيل الحالة عند الاستعداد.", 
                        variant: "destructive" 
                    });
                }
            } else {
                await updateDoc(workerRef, { idleCount: increment(1) });
            }
        } catch (e) {
            console.error("Penalize error:", e);
        }
    }, [toast]);

    // نظام التوزيع الآلي: يبدأ فقط بعد موافقة المتجر (حالة pending_assignment)
    const autoAssignOrders = useCallback(async (orders: Order[]) => {
        if (isAssigningRef.current) return;
        
        const pendingOrders = orders.filter(o => o.status === 'pending_assignment');
        if (pendingOrders.length === 0) return;

        isAssigningRef.current = true;
        try {
            const workersRef = collection(db, "deliveryWorkers");
            // جلب المناديب المتصلين والنشطين فقط
            const wQuery = query(
                workersRef, 
                where("isOnline", "==", true), 
                where("isActive", "==", true),
                limit(50)
            );
            const workersSnap = await getDocs(wQuery);
            let onlineWorkers = workersSnap.docs.map(d => ({ id: d.id, ...d.data() })) as DeliveryWorker[];

            if (onlineWorkers.length > 0) {
                for (const order of pendingOrders) {
                    // فرز المناديب حسب ضغط العمل (توزيع عادل)
                    const activeWorkersIds = orders
                        .filter(o => ['preparing', 'confirmed', 'ready_for_pickup', 'on_the_way'].includes(o.status))
                        .map(o => o.deliveryWorkerId);
                    
                    const workerLoadMap = new Map();
                    activeWorkersIds.forEach(id => {
                        if(id) workerLoadMap.set(id, (workerLoadMap.get(id) || 0) + 1);
                    });

                    // اختيار من لديهم أقل من 3 طلبات نشطة
                    const targetWorkers = onlineWorkers.filter(w => (workerLoadMap.get(w.id) || 0) < 3);
                    const finalPool = targetWorkers.length > 0 ? targetWorkers : onlineWorkers;
                    
                    const shuffled = [...finalPool].sort(() => Math.random() - 0.5);
                    const worker = shuffled[0];
                    
                    if (worker) {
                        await updateDoc(doc(db, "orders", order.id), {
                            deliveryWorkerId: worker.id,
                            deliveryWorker: { id: worker.id, name: worker.name },
                            status: 'confirmed', // إرسال عرض للمندوب
                            confirmedAt: new Date().toISOString()
                        });
                    }
                }
            }
        } catch (e) {
            console.error("Auto-assign failed:", e);
        } finally {
            setTimeout(() => { isAssigningRef.current = false; }, 3000);
        }
    }, []);

    // مراقبة توقيت موافقة المندوب
    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date().getTime();
            allOrders.forEach(async (order) => {
                if (order.status === 'confirmed' && order.deliveryWorkerId && order.confirmedAt) {
                    const confirmedTime = new Date(order.confirmedAt).getTime();
                    if (now - confirmedTime > ASSIGNMENT_TIMEOUT_MS) {
                        const wId = order.deliveryWorkerId;
                        // إعادة الطلب لدوامة البحث
                        await updateDoc(doc(db, "orders", order.id), {
                            deliveryWorkerId: null,
                            deliveryWorker: null,
                            status: 'pending_assignment',
                            confirmedAt: null
                        });
                        await penalizeWorker(wId);
                    }
                }
            });
        }, 5000);
        return () => clearInterval(interval);
    }, [allOrders, penalizeWorker]);

    // جلب الطلبات حسب الفرع
    useEffect(() => {
        const ordersRef = collection(db, 'orders');
        let q = query(ordersRef, limit(150));
        
        if (branchId && branchId !== 'all') {
            q = query(ordersRef, where('branchId', '==', branchId), limit(150));
        }

        const unsub = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Order[];
            const sortedData = data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setAllOrders(sortedData);
            setIsLoading(false);
            autoAssignOrders(data);
        }, (error) => {
            setIsLoading(false);
        });
        return () => unsub();
    }, [branchId, autoAssignOrders]);
    
    // تحديث حالة الطلب
    const updateOrderStatus = useCallback(async (orderId: string, status: OrderStatus, workerId?: string) => {
        try {
            const orderRef = doc(db, "orders", orderId);
            const updateData: any = { status };
            
            // المندوب قبل الطلب
            if (status === 'preparing' && workerId) {
                const workerRef = doc(db, "deliveryWorkers", workerId);
                await updateDoc(workerRef, { idleCount: 0 });
                updateData.deliveryWorkerId = workerId;
                updateData.confirmedAt = null; 
            }

            // إعادة تعيين الطلب (من الأدمن أو عند رفض المندوب)
            if (status === 'unassigned') {
                updateData.deliveryWorkerId = null;
                updateData.deliveryWorker = null;
                updateData.confirmedAt = null;
                updateData.status = 'pending_assignment'; // يعود فوراً للبحث عن مندوب جديد
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
