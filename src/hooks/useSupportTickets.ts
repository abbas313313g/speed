
"use client";

import { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, updateDoc, onSnapshot, doc, arrayUnion, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Message, SupportTicket } from '@/lib/types';
import { useToast } from './use-toast';
import { useTelegramConfigs } from './useTelegramConfigs';
import { sendTelegramMessage } from '@/lib/telegram';

export const useSupportTickets = (branchId?: string, currentUserId?: string) => {
    const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    const { telegramConfigs } = useTelegramConfigs();

    useEffect(() => {
        const ticketsRef = collection(db, 'supportTickets');
        let q = query(ticketsRef);
        
        // إذا كان الطلب من لوحة الأدمن (حسب الفرع)
        if (branchId && branchId !== 'all') {
            q = query(ticketsRef, where('branchId', '==', branchId));
        } 
        // إذا كان الطلب من تطبيق الزبون (جلب محادثاته فقط للخصوصية والسرعة)
        else if (currentUserId) {
            q = query(ticketsRef, where('userId', '==', currentUserId));
        }

        const unsub = onSnapshot(q,
            (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SupportTicket[];
                setSupportTickets(data);
                setIsLoading(false);
            },
            (error) => {
                console.error("Support Tickets Fetch Error:", error);
                setIsLoading(false);
            }
        );
        return () => unsub();
    }, [branchId, currentUserId]);

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

        let assignedBranchId = 'main';
        
        // نظام التوجيه الجغرافي الذكي لفرع القاسم
        if (userZone) {
            try {
                // البحث في مناطق التوصيل لمعرفة الفرع المسؤول عن هذه المنطقة
                const zonesRef = collection(db, "deliveryZones");
                const qz = query(zonesRef, where("name", "==", userZone));
                const zSnap = await getDocs(qz);
                
                if (!zSnap.empty) {
                    assignedBranchId = zSnap.docs[0].data().branchId || 'main';
                } else if (userZone.includes("القاسم")) {
                     // بحث احتياطي بالاسم
                     const branchesRef = collection(db, "branches");
                     const qb = query(branchesRef, where("locationName", "==", "القاسم"));
                     const bSnap = await getDocs(qb);
                     if(!bSnap.empty) assignedBranchId = bSnap.docs[0].id;
                }
            } catch (e) {
                console.error("Support Routing Logic Error:", e);
            }
        }

        try {
            const newTicket: Omit<SupportTicket, 'id'> = { 
                userId, 
                userName: userName || 'زبون سبيد', 
                createdAt: new Date().toISOString(), 
                isResolved: false, 
                history: [firstMessage],
                branchId: assignedBranchId
            };
            await addDoc(collection(db, "supportTickets"), newTicket);
            
            // إرسال تنبيه تليجرام للأدمن العام
            if (telegramConfigs.length > 0) {
                telegramConfigs.filter(c => c.type === 'owner').forEach(c => 
                    sendTelegramMessage(c.chatId, `*تذكرة دعم جديدة (${userZone || 'عام'})* 📩\n*من:* ${userName}\n*الرسالة:* ${firstMessage.content}`)
                );
            }
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
