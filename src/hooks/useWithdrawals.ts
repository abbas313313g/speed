
"use client";

import { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, updateDoc, onSnapshot, doc, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { WithdrawRequest } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export const useWithdrawals = (branchId?: string, targetId?: string) => {
    const [requests, setRequests] = useState<WithdrawRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const ref = collection(db, 'withdrawals');
        let q = query(ref);
        
        if (targetId) {
            q = query(ref, where('targetId', '==', targetId));
        } else if (branchId && branchId !== 'all') {
            q = query(ref, where('branchId', '==', branchId));
        }

        const unsub = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as WithdrawRequest[];
            const sorted = data.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
            setRequests(sorted);
            setIsLoading(false);
        }, (error) => {
            console.error("Withdrawals fetch error:", error);
            setIsLoading(false);
        });
        return () => unsub();
    }, [branchId, targetId]);

    const requestWithdraw = useCallback(async (data: Omit<WithdrawRequest, 'id' | 'status' | 'requestedAt'>) => {
        try {
            await addDoc(collection(db, "withdrawals"), {
                ...data,
                status: 'pending',
                requestedAt: new Date().toISOString()
            });
            toast({ title: "تم إرسال طلب السحب بنجاح ✅" });
            return true;
        } catch (e) {
            toast({ title: "فشل إرسال الطلب، حاول مرة أخرى", variant: "destructive" });
            return false;
        }
    }, [toast]);

    const updateRequestStatus = useCallback(async (id: string, status: 'completed' | 'rejected') => {
        try {
            await updateDoc(doc(db, "withdrawals", id), { status });
            toast({ title: "تم تحديث حالة التسوية بنجاح" });
        } catch (e) {
            toast({ title: "عذراً، حدث خطأ أثناء التحديث", variant: "destructive" });
        }
    }, [toast]);

    return { requests, isLoading, requestWithdraw, updateRequestStatus };
};
