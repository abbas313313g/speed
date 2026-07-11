
"use client";

import { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, onSnapshot, doc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AdminAccess } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export const useAdminAccess = () => {
    const [accessList, setAccessList] = useState<AdminAccess[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'adminAccess'),
            (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AdminAccess[];
                setAccessList(data);
                setIsLoading(false);
            },
            (error) => {
                console.error("Error fetching admin access list:", error);
                setIsLoading(false);
            }
        );
        return () => unsub();
    }, []);

    const requestAccess = useCallback(async (ip: string, deviceName: string) => {
        try {
            const q = query(collection(db, 'adminAccess'), where('ip', '==', ip));
            const snap = await getDocs(q);
            if (!snap.empty) {
                toast({ title: "الطلب موجود مسبقاً", description: "جهازك مسجل بالفعل، بانتظار الموافقة." });
                return;
            }
            await addDoc(collection(db, "adminAccess"), {
                ip,
                deviceName,
                status: 'pending',
                requestedAt: new Date().toISOString()
            });
            toast({ title: "تم إرسال الطلب بنجاح", description: "يرجى الطلب من الأدمن الموافقة على جهازك." });
        } catch (error) {
            toast({ title: "فشل إرسال الطلب", variant: "destructive" });
        }
    }, [toast]);

    const approveAccess = useCallback(async (id: string) => {
        try {
            await updateDoc(doc(db, "adminAccess", id), {
                status: 'approved',
                approvedAt: new Date().toISOString()
            });
            toast({ title: "تمت الموافقة بنجاح" });
        } catch (error) {
            toast({ title: "فشل الإجراء", variant: "destructive" });
        }
    }, [toast]);

    const removeAccess = useCallback(async (id: string) => {
        try {
            await deleteDoc(doc(db, "adminAccess", id));
            toast({ title: "تم حذف التراخيص" });
        } catch (error) {
            toast({ title: "فشل الحذف", variant: "destructive" });
        }
    }, [toast]);

    const autoApproveFirst = useCallback(async (ip: string, deviceName: string) => {
        try {
            const snap = await getDocs(collection(db, 'adminAccess'));
            if (snap.empty) {
                await addDoc(collection(db, "adminAccess"), {
                    ip,
                    deviceName,
                    status: 'approved',
                    requestedAt: new Date().toISOString(),
                    approvedAt: new Date().toISOString()
                });
                return true;
            }
            return false;
        } catch (e) { return false; }
    }, []);

    return { accessList, isLoading, requestAccess, approveAccess, removeAccess, autoApproveFirst };
};
