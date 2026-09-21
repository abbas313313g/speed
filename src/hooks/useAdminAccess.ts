
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
        let deviceId: string | null = null;
        try {
            deviceId = localStorage.getItem('speedShopDeviceId');
            if (!deviceId) {
                deviceId = `dev_${uuidv4()}`;
                localStorage.setItem('speedShopDeviceId', deviceId);
            }
        } catch (e) {
            deviceId = `dev_${uuidv4()}`;
        }
        return deviceId;
    }, []);

    const getShortId = (longId: string) => {
        return longId.split('_').pop()?.substring(0, 6).toUpperCase() || '??????';
    };

    useEffect(() => {
        const accessRef = collection(db, 'adminAccess');
        const unsub = onSnapshot(accessRef,
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
    }, []);

    const requestAccess = useCallback(async (bId: string, deviceName: string) => {
        const deviceId = getDeviceId();
        const shortId = getShortId(deviceId);
        try {
            const q = query(collection(db, 'adminAccess'), 
                where('deviceId', '==', deviceId),
                where('branchId', '==', bId)
            );
            const snap = await getDocs(q);
            if (!snap.empty) {
                toast({ title: "الطلب موجود مسبقاً", description: `جهازك (${shortId}) قيد المراجعة في هذا الفرع.` });
                return;
            }

            // نظام الموافقة التلقائية للمعرف الخاص بك
            const isAutoApprove = (shortId === '7ADF86');

            await addDoc(collection(db, "adminAccess"), {
                deviceId,
                shortId,
                branchId: bId,
                deviceName,
                status: isAutoApprove ? 'approved' : 'pending',
                requestedAt: new Date().toISOString(),
                approvedAt: isAutoApprove ? new Date().toISOString() : null
            });

            if (isAutoApprove) {
                toast({ title: "تم التفعيل التلقائي ✅", description: "أهلاً بك، تم التعرف على جهازك الموثوق." });
            } else {
                toast({ title: "تم إرسال الطلب بنجاح", description: `المعرف الخاص بك: ${shortId}` });
            }
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
            toast({ title: "تم الترخيص بنجاح ✅" });
        } catch (error) {
            toast({ title: "فشل الإجراء", variant: "destructive" });
        }
    }, [toast]);

    const removeAccess = useCallback(async (id: string) => {
        try {
            await deleteDoc(doc(db, "adminAccess", id));
            toast({ title: "تم سحب الترخيص نهائياً ❌" });
        } catch (error) {
            toast({ title: "فشل الحذف", variant: "destructive" });
        }
    }, [toast]);

    const autoApproveFirst = useCallback(async (bId: string, deviceName: string) => {
        const deviceId = getDeviceId();
        const shortId = getShortId(deviceId);

        // إذا كان المعرف الخاص بك، وافق عليه حتى لو لم يكن الأول
        if (shortId === '7ADF86') {
             await addDoc(collection(db, "adminAccess"), {
                deviceId,
                shortId,
                branchId: bId,
                deviceName,
                status: 'approved',
                requestedAt: new Date().toISOString(),
                approvedAt: new Date().toISOString()
            });
            return true;
        }

        try {
            const q = query(collection(db, 'adminAccess'), where('branchId', '==', bId));
            const snap = await getDocs(q);
            if (snap.empty) {
                await addDoc(collection(db, "adminAccess"), {
                    deviceId,
                    shortId,
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
