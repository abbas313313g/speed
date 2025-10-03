
import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, addDoc, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { SupportTicket, Message } from '@/lib/types';
import { useToast } from './use-toast';
import { v4 as uuidv4 } from 'uuid';
import { useTelegram } from './useTelegram';

let allSupportTickets: SupportTicket[] = [];
let hasFetched = false;
const listeners = new Set<(data: SupportTicket[]) => void>();
const userId = typeof window !== 'undefined' ? (localStorage.getItem('speedShopUserId') || (() => { const id = uuidv4(); localStorage.setItem('speedShopUserId', id); return id; })()) : '';

const fetchAllSupportTickets = async () => {
    if (hasFetched) return allSupportTickets;
    try {
        const ticketsSnap = await getDocs(collection(db, "supportTickets"));
        allSupportTickets = ticketsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupportTicket));
        hasFetched = true;
        listeners.forEach(listener => listener(allSupportTickets));
        return allSupportTickets;
    } catch (error) {
        console.error("Error fetching support tickets:", error);
        return [];
    }
};

export const useSupportTickets = () => {
    const [supportTickets, setSupportTicketsState] = useState<SupportTicket[]>(allSupportTickets);
    const [mySupportTicket, setMySupportTicket] = useState<SupportTicket | null>(null);
    const [isLoading, setIsLoading] = useState(!hasFetched);
    const { toast } = useToast();
    const { telegramConfigs, sendTelegramMessage } = useTelegram();

    useEffect(() => {
        const listener = (data: SupportTicket[]) => {
            setSupportTicketsState(data);
            const userTickets = data.filter(t => t.userId === userId);
            if (userTickets.length > 0) {
                const unresolvedTicket = userTickets.find(t => !t.isResolved);
                if (unresolvedTicket) {
                    setMySupportTicket(unresolvedTicket);
                } else {
                    const sortedTickets = userTickets.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                    setMySupportTicket(sortedTickets[0]);
                }
            } else {
                setMySupportTicket(null);
            }
        };
        listeners.add(listener);

        if (!hasFetched) {
            setIsLoading(true);
            fetchAllSupportTickets().finally(() => setIsLoading(false));
        } else {
            listener(allSupportTickets); // Initialize with current data
        }

        return () => {
            listeners.delete(listener);
        };
    }, []);

    const setSupportTickets = useCallback((newTickets: SupportTicket[] | ((prev: SupportTicket[]) => SupportTicket[])) => {
        if (typeof newTickets === 'function') {
            allSupportTickets = newTickets(allSupportTickets);
        } else {
            allSupportTickets = newTickets;
        }
        listeners.forEach(listener => listener(allSupportTickets));
    }, []);

    const startNewTicketClient = () => {
        setMySupportTicket(null);
    }
    
    const addMessageToTicket = async (ticketId: string, message: Message) => {
        const ticketRef = doc(db, "supportTickets", ticketId);
        await updateDoc(ticketRef, {
            history: arrayUnion(message)
        });
        setSupportTickets(prev => prev.map(t => t.id === ticketId ? {...t, history: [...t.history, message]} : t));

        if (message.role === 'user') {
            const ownerConfigs = telegramConfigs.filter(c => c.type === 'owner');
             if (ownerConfigs.length > 0) {
                 const ticket = supportTickets.find(t => t.id === ticketId);
                 const notificationMsg = `
*رد جديد على تذكرة دعم* 💬
*من:* ${ticket?.userName || 'غير معروف'}
*الرسالة:* ${message.content}
`;
                 ownerConfigs.forEach(config => sendTelegramMessage(config.chatId, notificationMsg));
             }
        }
    };

    const createSupportTicket = async (firstMessage: Message) => {
        if (!userId) return;
        if (mySupportTicket && !mySupportTicket.isResolved) {
             await addMessageToTicket(mySupportTicket.id, firstMessage);
             return;
        }
        const addresses = JSON.parse(localStorage.getItem('speedShopAddresses') || '[]');
        const userName = addresses[0]?.name || `مستخدم ${userId.substring(0, 4)}`;
        const newTicket: Omit<SupportTicket, 'id'> = {
            userId,
            userName,
            createdAt: new Date().toISOString(),
            isResolved: false,
            history: [firstMessage],
        };
        const docRef = await addDoc(collection(db, "supportTickets"), newTicket);
        setSupportTickets(prev => [...prev, {id: docRef.id, ...newTicket}]);
        
        const ownerConfigs = telegramConfigs.filter(c => c.type === 'owner');
        if (ownerConfigs.length > 0) {
            const notificationMsg = `
*تذكرة دعم جديدة* 📩
*من:* ${userName} (${userId.substring(0,4)})
*المشكلة:* ${firstMessage.content}

الرجاء المتابعة من لوحة التحكم.
`;
            ownerConfigs.forEach(config => sendTelegramMessage(config.chatId, notificationMsg));
        }
    };

    const resolveSupportTicket = async (ticketId: string) => {
        await updateDoc(doc(db, "supportTickets", ticketId), { isResolved: true });
        setSupportTickets(prev => prev.map(t => t.id === ticketId ? {...t, isResolved: true} : t));
    }

    return { supportTickets, mySupportTicket, isLoading, createSupportTicket, addMessageToTicket, resolveSupportTicket, startNewTicketClient };
};
