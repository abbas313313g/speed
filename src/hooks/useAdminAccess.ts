
"use client";

import { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, onSnapshot, doc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { v4 as uuidv4 } from 'uuid';
import type { AdminAccess } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export const useAdminAccess = (branchId?: string) => {
    const [accessList, setAccessList] = useState<AdminAccess[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    const getDeviceId = useCallback(() => {
        let deviceId = localStorage.getItem('speedShopDeviceId');
        if (!deviceId) {
            deviceId = `dev_${uuidv4()}`;
            localStorage.setItem('speedShopDeviceId', deviceId);
        }
        return deviceId;
    }, []);

    useEffect(() => {
        const accessRef = collection(db, 'adminAccess');
        // فلترة سجلات الوصول بناءً على الفرع لضمان استقلال الأذونات
        let q = query(accessRef);
        if (branchId && branchId !== 'all') {
            q = query(accessRef, where('branchId', '==', branchId));
        }

        const unsub = onSnapshot(q,
            (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AdminAccess[];
                setAccessList(data);
                setIsLoading(false);
            },
            (error) => {
                console.error("Error fetching access list:", error);
                setIsLoading(false);
            }
        );
        return () => unsub();
    }, [branchId]);

    const requestAccess = useCallback(async (bId: string, deviceName: string) => {
        const deviceId = getDeviceId();
        try {
            const q = query(collection(db, 'adminAccess'), 
                where('deviceId', '==', deviceId),
                where('branchId', '==', bId)
            );
            const snap = await getDocs(q);
            if (!snap.empty) {
                toast({ title: "الطلب موجود مسبقاً", description: "جهازك قيد المراجعة لهذا الفرع." });
                return;
            }
            await addDoc(collection(db, "adminAccess"), {
                deviceId,
                branchId: bId,
                deviceName,
                status: 'pending',
                requestedAt: new Date().toISOString()
            });
            toast({ title: "تم إرسال الطلب", description: "بانتظار موافقة أدمن هذا الفرع." });
        } catch (error) {
            toast({ title: "فشل إرسال الطلب", variant: "destructive" });
        }
    }, [getDeviceId, toast]);

    const approveAccess = useCallback(async (id: string) => {
        try {
            await updateDoc(doc(db, "adminAccess", id), {
                status: 'approved',
                approvedAt: new Date().toISOString()
            });
            toast({ title: "تم الترخيص بنجاح" });
        } catch (error) {
            toast({ title: "فشل الإجراء", variant: "destructive" });
        }
    }, [toast]);

    const removeAccess = useCallback(async (id: string) => {
        try {
            await deleteDoc(doc(db, "adminAccess", id));
            toast({ title: "تم سحب الترخيص" });
        } catch (error) {
            toast({ title: "فشل الحذف", variant: "destructive" });
        }
    }, [toast]);

    const autoApproveFirst = useCallback(async (bId: string, deviceName: string) => {
        const deviceId = getDeviceId();
        try {
            const q = query(collection(db, 'adminAccess'), where('branchId', '==', bId));
            const snap = await getDocs(q);
            // إذا كان هذا أول جهاز يطلب الدخول لهذا الفرع تحديداً، يتم اعتماده تلقائياً
            if (snap.empty) {
                await addDoc(collection(db, "adminAccess"), {
                    deviceId,
                    branchId: bId,
                    deviceName,
                    status: 'approved',
                    requestedAt: new Date().toISOString(),
                    approvedAt: new Date().toISOString()
                });
                return true;
            }
            return false;
        } catch (e) { return false; }
    }, [getDeviceId]);

    return { accessList, isLoading, getDeviceId, requestAccess, approveAccess, removeAccess, autoApproveFirst };
};
