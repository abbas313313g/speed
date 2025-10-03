
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { SupportTicket, Message } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useAddresses } from './useAddresses';
import { v4 as uuidv4 } from 'uuid';
import { sendTelegramMessage } from '@/lib/telegram';
import { useTelegramConfigs } from './useTelegramConfigs';


export const useSupportTickets = () => {
    const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    const { addresses } = useAddresses();
    const { telegramConfigs } = useTelegramConfigs();
    const [userId, setUserId] = useState<string|null>(null);

    const [myCurrentSupportTicket, setMySupportTicket] = useState<SupportTicket|null>(null);

    useEffect(() => {
        let id = localStorage.getItem('speedShopUserId');
        if (!id) {
            id = uuidv4();
            localStorage.setItem('speedShopUserId', id);
        }
        setUserId(id);
    }, []);

    useEffect(() => {
        const fetchTickets = async () => {
            setIsLoading(true);
            try {
                const querySnapshot = await getDocs(collection(db, "supportTickets"));
                const tickets = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupportTicket));
                setSupportTickets(tickets);
            } catch (error) {
                console.error("Error fetching support tickets:", error);
                toast({ title: "فشل تحميل تذاكر الدعم", variant: "destructive" });
            } finally {
                setIsLoading(false);
            }
        };
        fetchTickets();
    }, [toast]);
    
    const mySupportTicket = useMemo(() => {
        if (myCurrentSupportTicket) return myCurrentSupportTicket;
        if (!userId) return null;
        const userTickets = supportTickets.filter(t => t.userId === userId);
        if (userTickets.length === 0) return null;
        const unresolved = userTickets.find(t => !t.isResolved);
        if (unresolved) return unresolved;
        return userTickets.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    }, [userId, supportTickets, myCurrentSupportTicket]);
    
    const startNewTicketClient = () => setMySupportTicket(null);

    const createSupportTicket = useCallback(async (firstMessage: Message) => {
        if (!userId) return;
        const activeTicket = mySupportTicket;
        if (activeTicket && !activeTicket.isResolved) {
             await addMessageToTicket(activeTicket.id, firstMessage);
             return;
        }
        const userName = addresses[0]?.name || `مستخدم ${userId.substring(0, 4)}`;
        const newTicket: Omit<SupportTicket, 'id'> = { userId, userName, createdAt: new Date().toISOString(), isResolved: false, history: [firstMessage] };
        const docRef = await addDoc(collection(db, "supportTickets"), newTicket);
        const finalTicket = {id: docRef.id, ...newTicket};
        setSupportTickets(prev => [...prev, finalTicket]);
        setMySupportTicket(finalTicket);
        telegramConfigs.filter(c => c.type === 'owner').forEach(c => sendTelegramMessage(c.chatId, `*تذكرة دعم جديدة* 📩\n*من:* ${userName}\n*الرسالة:* ${firstMessage.content}`));
    }, [userId, mySupportTicket, addresses, telegramConfigs, addMessageToTicket]);

    const addMessageToTicket = useCallback(async (ticketId: string, message: Message) => {
        await updateDoc(doc(db, "supportTickets", ticketId), { history: arrayUnion(message) });
        setSupportTickets(prev => prev.map(t => t.id === ticketId ? {...t, history: [...t.history, message]} : t));
    }, []);

    const resolveSupportTicket = useCallback(async (ticketId: string) => {
        await updateDoc(doc(db, "supportTickets", ticketId), { isResolved: true });
        setSupportTickets(prev => prev.map(t => t.id === ticketId ? {...t, isResolved: true} : t));
    }, []);

    return { 
        supportTickets, 
        isLoading, 
        mySupportTicket, 
        createSupportTicket, 
        addMessageToTicket, 
        resolveSupportTicket, 
        startNewTicketClient 
    };
};
