
"use client";

import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { TelegramConfig } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export const useTelegramConfigs = () => {
    const [telegramConfigs, setTelegramConfigs] = useState<TelegramConfig[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const fetchConfigs = async () => {
            setIsLoading(true);
            try {
                const querySnapshot = await getDocs(collection(db, "telegramConfigs"));
                const configs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TelegramConfig));
                setTelegramConfigs(configs);
            } catch (error) {
                console.error("Error fetching telegram configs:", error);
                toast({ title: "فشل تحميل إعدادات تليجرام", variant: "destructive" });
            } finally {
                setIsLoading(false);
            }
        };
        fetchConfigs();
    }, [toast]);
    
    const addTelegramConfig = useCallback(async (configData: Omit<TelegramConfig, 'id'>) => {
        try {
            const docRef = await addDoc(collection(db, "telegramConfigs"), configData);
            setTelegramConfigs(prev => [...prev, {id: docRef.id, ...configData} as TelegramConfig]);
            toast({ title: "تمت إضافة المعرف بنجاح" });
        } catch (error) {
            toast({ title: "فشل إضافة المعرف", variant: "destructive" });
        }
    }, [toast]);

    const deleteTelegramConfig = useCallback(async (configId: string) => {
        try {
            await deleteDoc(doc(db, "telegramConfigs", configId));
            setTelegramConfigs(prev => prev.filter(c => c.id !== configId));
            toast({ title: "تم حذف المعرف بنجاح" });
        } catch (error) {
            toast({ title: "فشل حذف المعرف", variant: "destructive" });
        }
    }, [toast]);


    return { telegramConfigs, isLoading, addTelegramConfig, deleteTelegramConfig };
};
