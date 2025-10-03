
import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, addDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { TelegramConfig } from '@/lib/types';
import { useToast } from './use-toast';

let allTelegramConfigs: TelegramConfig[] = [];
let hasFetched = false;
const listeners = new Set<(data: TelegramConfig[]) => void>();

const fetchAllTelegramConfigs = async () => {
    if (hasFetched) return allTelegramConfigs;
    try {
        const configsSnap = await getDocs(collection(db, "telegramConfigs"));
        allTelegramConfigs = configsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TelegramConfig));
        hasFetched = true;
        listeners.forEach(listener => listener(allTelegramConfigs));
        return allTelegramConfigs;
    } catch (error) {
        console.error("Error fetching telegram configs:", error);
        return [];
    }
};

export const useTelegram = () => {
    const [telegramConfigs, setTelegramConfigsState] = useState<TelegramConfig[]>(allTelegramConfigs);
    const [isLoading, setIsLoading] = useState(!hasFetched);
    const { toast } = useToast();

    useEffect(() => {
        const listener = (data: TelegramConfig[]) => setTelegramConfigsState(data);
        listeners.add(listener);

        if (!hasFetched) {
            setIsLoading(true);
            fetchAllTelegramConfigs().finally(() => setIsLoading(false));
        }

        return () => {
            listeners.delete(listener);
        };
    }, []);

    const setTelegramConfigs = useCallback((newConfigs: TelegramConfig[] | ((prev: TelegramConfig[]) => TelegramConfig[])) => {
        if (typeof newConfigs === 'function') {
            allTelegramConfigs = newConfigs(allTelegramConfigs);
        } else {
            allTelegramConfigs = newConfigs;
        }
        listeners.forEach(listener => listener(allTelegramConfigs));
    }, []);

    const addTelegramConfig = async (configData: Omit<TelegramConfig, 'id'>) => {
        setIsLoading(true);
        try {
            const docRef = await addDoc(collection(db, "telegramConfigs"), configData);
            setTelegramConfigs(prev => [...prev, { id: docRef.id, ...configData }]);
            toast({ title: "تمت إضافة معرف تليجرام بنجاح" });
        } catch (error) {
            console.error("Failed to add telegram config:", error);
            toast({ title: "فشل إضافة المعرف", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const deleteTelegramConfig = async (configId: string) => {
        setIsLoading(true);
        try {
            await deleteDoc(doc(db, "telegramConfigs", configId));
            setTelegramConfigs(prev => prev.filter(c => c.id !== configId));
            toast({ title: "تم حذف معرف تليجرام بنجاح" });
        } catch (error) {
            console.error("Failed to delete telegram config:", error);
            toast({ title: "فشل حذف المعرف", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };
    
    const sendTelegramMessage = async (chatId: string, message: string) => {
        try {
            const botToken = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;
            if (!botToken || !chatId) return;

            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'Markdown' }),
            });
        } catch (error) {
            console.error(`Failed to send Telegram message to ${chatId}:`, error);
        }
    };

    return { telegramConfigs, isLoading, addTelegramConfig, deleteTelegramConfig, sendTelegramMessage };
};
