
"use client";

import { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, deleteDoc, onSnapshot, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { TelegramConfig } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export const useTelegramConfigs = () => {
    const [telegramConfigs, setTelegramConfigs] = useState<TelegramConfig[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'telegramConfigs'),
            (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TelegramConfig[];
                setTelegramConfigs(data);
                setIsLoading(false);
            },
            (error) => {
                console.error("Error fetching telegram configs:", error);
                toast({ title: "فشل جلب إعدادات تليجرام", description: "حدث خطأ أثناء تحميل البيانات.", variant: "destructive" });
                setIsLoading(false);
            }
        );
        return () => unsub();
    }, [toast]);

    const addTelegramConfig = useCallback(async (configData: Omit<TelegramConfig, 'id'>) => {
        try {
            await addDoc(collection(db, "telegramConfigs"), configData);
            toast({ title: "تمت إضافة المعرف بنجاح" });
        } catch (error) { 
            console.error("Error adding Telegram config:", error);
            toast({ title: "فشل إضافة المعرف", description: "حدث خطأ ما، يرجى المحاولة مرة أخرى.", variant: "destructive" }); 
        }
    }, [toast]);

    const deleteTelegramConfig = useCallback(async (configId: string) => {
        try {
            await deleteDoc(doc(db, "telegramConfigs", configId));
            toast({ title: "تم حذف المعرف بنجاح" });
        } catch (error) { 
            console.error("Error deleting Telegram config:", error);
            toast({ title: "فشل حذف المعرف", description: "حدث خطأ ما، يرجى المحاولة مرة أخرى.", variant: "destructive" }); 
        }
    }, [toast]);

    return { telegramConfigs, isLoading, addTelegramConfig, deleteTelegramConfig };
};
