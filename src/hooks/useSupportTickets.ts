
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, addDoc, updateDoc, onSnapshot, doc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Message, SupportTicket } from '@/lib/types';
import { useToast } from './use-toast';
import { useTelegramConfigs } from './useTelegramConfigs';
import { sendTelegramMessage } from '@/lib/telegram';

export const useSupportTickets = () => {
    const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    const { telegramConfigs } = useTelegramConfigs();

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'supportTickets'),
            (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SupportTicket[];
                setSupportTickets(data);
                setIsLoading(false);
            },
            (error) => {
                console.error("Error fetching support tickets:", error);
                toast({ title: "Failed to fetch support tickets", variant: "destructive" });
                setIsLoading(false);
            }
        );
        return () => unsub();
    }, []);

    const addMessageToTicket = useCallback(async (ticketId: string, message: Message) => {
        await updateDoc(doc(db, "supportTickets", ticketId), { history: arrayUnion(message) });
    }, []);
    
    const resolveSupportTicket = useCallback(async (ticketId: string) => {
        await updateDoc(doc(db, "supportTickets", ticketId), { isResolved: true });
    }, []);
    
    const createSupportTicket = useCallback(async (firstMessage: Message, userId: string, userName: string) => {
        if (!userId) return;

        const newTicket: Omit<SupportTicket, 'id'> = { userId, userName, createdAt: new Date().toISOString(), isResolved: false, history: [firstMessage] };
        await addDoc(collection(db, "supportTickets"), newTicket);
        
        telegramConfigs.filter(c => c.type === 'owner').forEach(c => sendTelegramMessage(c.chatId, `*تذكرة دعم جديدة* 📩\n*من:* ${userName}\n*الرسالة:* ${firstMessage.content}`));

    }, [telegramConfigs]);

    return { 
        supportTickets, 
        isLoading, 
        addMessageToTicket, 
        resolveSupportTicket,
        createSupportTicket,
    };
};
