
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
                toast({ title: "عذراً، فشل جلب الرسائل", description: "يرجى التحقق من جودة الإنترنت", variant: "destructive" });
                setIsLoading(false);
            }
        );
        return () => unsub();
    }, [toast]);

    const addMessageToTicket = useCallback(async (ticketId: string, message: Message) => {
        try {
            await updateDoc(doc(db, "supportTickets", ticketId), { history: arrayUnion(message) });
        } catch (error) {
            console.error("Error adding message to ticket:", error);
            toast({ title: "فشل إرسال الرسالة", description: "يرجى المحاولة مرة أخرى لاحقاً", variant: "destructive" });
            throw error;
        }
    }, [toast]);
    
    const resolveSupportTicket = useCallback(async (ticketId: string) => {
        try {
            await updateDoc(doc(db, "supportTickets", ticketId), { isResolved: true });
        } catch (error) {
            console.error("Error resolving ticket:", error);
            toast({ title: "فشل إغلاق التذكرة", variant: "destructive" });
            throw error;
        }
    }, [toast]);
    
    const createSupportTicket = useCallback(async (firstMessage: Message, userId: string, userName: string) => {
        if (!userId) return;

        try {
            const newTicket: Omit<SupportTicket, 'id'> = { 
                userId, 
                userName: userName || 'زبون جديد', 
                createdAt: new Date().toISOString(), 
                isResolved: false, 
                history: [firstMessage] 
            };
            await addDoc(collection(db, "supportTickets"), newTicket);
            
            // إشعار للأدمن عبر تليجرام
            telegramConfigs.filter(c => c.type === 'owner').forEach(c => 
                sendTelegramMessage(c.chatId, `*تذكرة دعم جديدة* 📩\n*من:* ${userName}\n*الرسالة:* ${firstMessage.content}`)
            );
        } catch (error) {
             console.error("Error creating support ticket:", error);
             toast({ title: "فشل بدء المحادثة", description: "يرجى إعادة المحاولة", variant: "destructive" });
             throw error;
        }

    }, [telegramConfigs, toast]);

    return { 
        supportTickets, 
        isLoading, 
        addMessageToTicket, 
        resolveSupportTicket,
        createSupportTicket,
    };
};
