
"use client";

import { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, updateDoc, onSnapshot, doc, arrayUnion, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Message, SupportTicket } from '@/lib/types';
import { useToast } from './use-toast';
import { useTelegramConfigs } from './useTelegramConfigs';
import { sendTelegramMessage } from '@/lib/telegram';

export const useSupportTickets = (branchId?: string) => {
    const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    const { telegramConfigs } = useTelegramConfigs();

    useEffect(() => {
        const ticketsRef = collection(db, 'supportTickets');
        let q = query(ticketsRef);
        
        if (branchId && branchId !== 'all') {
            q = query(ticketsRef, where('branchId', '==', branchId));
        }

        const unsub = onSnapshot(q,
            (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SupportTicket[];
                setSupportTickets(data);
                setIsLoading(false);
            },
            (error) => {
                console.error("Error fetching support tickets:", error);
                setIsLoading(false);
            }
        );
        return () => unsub();
    }, [branchId]);

    const addMessageToTicket = useCallback(async (ticketId: string, message: Message) => {
        try {
            await updateDoc(doc(db, "supportTickets", ticketId), { history: arrayUnion(message) });
        } catch (error) {
            toast({ title: "فشل إرسال الرسالة", variant: "destructive" });
            throw error;
        }
    }, [toast]);
    
    const resolveSupportTicket = useCallback(async (ticketId: string) => {
        try {
            await updateDoc(doc(db, "supportTickets", ticketId), { isResolved: true });
        } catch (error) {
            toast({ title: "فشل إغلاق التذكرة", variant: "destructive" });
            throw error;
        }
    }, [toast]);
    
    const createSupportTicket = useCallback(async (firstMessage: Message, userId: string, userName: string, userZone?: string) => {
        if (!userId) return;

        // التوزيع الجغرافي الذكي للدعم
        // الافتراضي هو الرئيسية (main)
        let assignedBranchId = 'main';
        if (userZone === "القاسم") {
            assignedBranchId = 'qasim'; // نفترض أن كود فرع القاسم هو qasim
        }

        try {
            const newTicket: Omit<SupportTicket, 'id'> = { 
                userId, 
                userName: userName || 'زبون جديد', 
                createdAt: new Date().toISOString(), 
                isResolved: false, 
                history: [firstMessage],
                branchId: assignedBranchId
            };
            await addDoc(collection(db, "supportTickets"), newTicket);
            
            telegramConfigs.filter(c => c.type === 'owner').forEach(c => 
                sendTelegramMessage(c.chatId, `*تذكرة دعم جديدة (${userZone || 'عام'})* 📩\n*من:* ${userName}\n*الرسالة:* ${firstMessage.content}`)
            );
        } catch (error) {
             toast({ title: "فشل بدء المحادثة", variant: "destructive" });
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
