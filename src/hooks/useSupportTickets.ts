
"use client";

import { useContext } from 'react';
import { AppContext } from '@/contexts/AppContext';
import type { Message } from '@/lib/types';
import { useToast } from './use-toast';

export const useSupportTickets = () => {
    const context = useContext(AppContext);
    const {toast} = useToast();

    if (!context) {
        throw new Error('useSupportTickets must be used within an AppProvider');
    }

    const handleCreateSupportTicket = async (firstMessage: Message) => {
        try {
            await context.createSupportTicket(firstMessage);
            toast({ title: "تم إرسال رسالتك", description: "سيقوم فريق الدعم بالرد عليك قريبًا." });
        } catch (error) {
            toast({
                title: "فشل إرسال الرسالة",
                description: "حدث خطأ ما. الرجاء المحاولة مرة أخرى.",
                variant: "destructive"
            });
        }
    };


    return { 
        supportTickets: context.supportTickets, 
        isLoading: context.isLoading, 
        mySupportTicket: context.mySupportTicket, 
        createSupportTicket: handleCreateSupportTicket, 
        addMessageToTicket: context.addMessageToTicket, 
        resolveSupportTicket: context.resolveSupportTicket, 
        startNewTicketClient: context.startNewTicketClient,
    };
};
