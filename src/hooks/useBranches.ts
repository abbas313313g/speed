
"use client";

import { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, onSnapshot, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Branch } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export const useBranches = () => {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'branches'),
            (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Branch[];
                setBranches(data);
                setIsLoading(false);
            },
            (error) => {
                console.error("Error fetching branches:", error);
                setIsLoading(false);
            }
        );
        return () => unsub();
    }, []);

    const addBranch = useCallback(async (name: string, locationName: string) => {
        try {
            await addDoc(collection(db, "branches"), {
                name,
                locationName,
                createdAt: new Date().toISOString()
            });
            toast({ title: "تم إنشاء الفرع بنجاح" });
        } catch (e) {
            toast({ title: "فشل إنشاء الفرع", variant: "destructive" });
        }
    }, [toast]);

    const deleteBranch = useCallback(async (id: string) => {
        try {
            await deleteDoc(doc(db, "branches", id));
            toast({ title: "تم حذف الفرع" });
        } catch (e) {
            toast({ title: "فشل الحذف", variant: "destructive" });
        }
    }, [toast]);

    return { branches, isLoading, addBranch, deleteBranch };
};
