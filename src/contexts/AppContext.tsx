
"use client";

import React, { createContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useAddresses } from '@/hooks/useAddresses';
import { useCart } from '@/hooks/useCart';
import { useData } from '@/hooks/useData'; // Changed
import type { Order, OrderStatus, SupportTicket, Message, TelegramConfig, DeliveryWorker, Coupon, Product } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc, deleteDoc, addDoc, collection, runTransaction, getDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { calculateDeliveryFee, calculateDistance } from '@/lib/utils';
import { getWorkerLevel } from '@/lib/workerLevels';

// This is a simplified, more stable context.

type AppContextType = 
    & ReturnType<typeof useAddresses>
    & ReturnType<typeof useCart>
    & ReturnType<typeof useData>
    & {
        userId: string | null;
        allUsers: any[]; 
        isLoading: boolean;
        // Orders
        allOrders: Order[];
        updateOrderStatus: (orderId: string, status: OrderStatus, workerId?: string) => Promise<void>;
        deleteOrder: (orderId: string) => Promise<void>;
        // Support Tickets
        supportTickets: SupportTicket[];
        mySupportTicket: SupportTicket | null;
        createSupportTicket: (firstMessage: Message) => Promise<void>;
        addMessageToTicket: (ticketId: string, message: Message) => Promise<void>;
        resolveSupportTicket: (ticketId: string) => Promise<void>;
        startNewTicketClient: () => void;
        // Telegram
        telegramConfigs: TelegramConfig[];
        addTelegramConfig: (config: Omit<TelegramConfig, 'id'>) => Promise<void>;
        deleteTelegramConfig: (configId: string) => Promise<void>;
        sendTelegramMessage: (chatId: string, message: string) => Promise<void>;
        // Delivery Workers
        deliveryWorkers: DeliveryWorker[];
        addDeliveryWorker: (workerData: Pick<DeliveryWorker, 'id' | 'name'>) => Promise<void>;
        updateWorkerStatus: (workerId: string, isOnline: boolean) => Promise<void>;
    };


export const AppContext = createContext<AppContextType | null>(null);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
    const addresses = useAddresses();
    const data = useData(); // USE THE NEW STABLE HOOK
    const { toast } = useToast();
    const [userId, setUserId] = useState<string|null>(null);

    const [allOrders, setAllOrders] = useState<Order[]>([]);
    const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
    const [telegramConfigs, setTelegramConfigs] = useState<TelegramConfig[]>([]);
    const [deliveryWorkers, setDeliveryWorkers] = useState<DeliveryWorker[]>([]);
    
    const [isFetching, setIsFetching] = useState(true);

    const mySupportTicket = useMemo(() => {
        if (!userId) return null;
        const userTickets = supportTickets.filter(t => t.userId === userId);
        if (userTickets.length > 0) {
            const unresolvedTicket = userTickets.find(t => !t.isResolved);
            if (unresolvedTicket) return unresolvedTicket;
            const sortedTickets = userTickets.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            return sortedTickets[0];
        }
        return null;
    }, [userId, supportTickets]);

    // This now only runs ONCE. No dependencies.
    useEffect(() => {
        const getUserId = () => {
            let id = localStorage.getItem('speedShopUserId');
            if (!id) {
                id = uuidv4();
                localStorage.setItem('speedShopUserId', id);
            }
            return id;
        };
        setUserId(getUserId());
        setIsFetching(false); // Data is static, so fetching is instant.
    }, []);

    const isLoading = isFetching || data.isLoading;

    const cart = useCart(data.products, data.restaurants, data.coupons, setAllOrders, data.setProducts, data.setCoupons);


    // All state modification functions are now here, centralized.
    // START: WORKER-RELATED FUNCTIONS
    const addDeliveryWorker = async (workerData: Pick<DeliveryWorker, 'id' | 'name'>) => {
        const workerRef = doc(db, 'deliveryWorkers', workerData.id);
        const newWorkerData = { name: workerData.name, isOnline: true, unfreezeProgress: 0, lastDeliveredAt: new Date().toISOString() };
        await addDoc(collection(db, "deliveryWorkers"), newWorkerData);
        setDeliveryWorkers(prev => [...prev, { ...workerData, ...newWorkerData }]);
    };
    const updateWorkerStatus = async (workerId: string, isOnline: boolean) => {
        const worker = deliveryWorkers.find(w => w.id === workerId);
        if (worker && worker.isOnline === isOnline) return;

        const workerRef = doc(db, 'deliveryWorkers', workerId);
        await updateDoc(workerRef, { isOnline });
        setDeliveryWorkers(prev => prev.map(w => w.id === workerId ? { ...w, isOnline } : w));
    };
    // END: WORKER-RELATED FUNCTIONS

    // START: TELEGRAM FUNCTIONS
    const addTelegramConfig = async (configData: Omit<TelegramConfig, 'id'>) => {
        const docRef = await addDoc(collection(db, "telegramConfigs"), configData);
        setTelegramConfigs(prev => [...prev, { id: docRef.id, ...configData }]);
    };
    const deleteTelegramConfig = async (configId: string) => {
        await deleteDoc(doc(db, "telegramConfigs", configId));
        setTelegramConfigs(prev => prev.filter(c => c.id !== configId));
    };
    const sendTelegramMessage = async (chatId: string, message: string) => {
        const botToken = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;
        if (!botToken || !chatId) return;
        try {
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'Markdown' }),
            });
        } catch (error) { console.error(`Failed to send Telegram message to ${chatId}:`, error); }
    };
    // END: TELEGRAM FUNCTIONS

    // START: SUPPORT TICKET FUNCTIONS
    const startNewTicketClient = () => setMySupportTicket(null);
    const addMessageToTicket = async (ticketId: string, message: Message) => {
        const ticketRef = doc(db, "supportTickets", ticketId);
        await updateDoc(ticketRef, { history: arrayUnion(message) });
        setSupportTickets(prev => prev.map(t => t.id === ticketId ? {...t, history: [...t.history, message]} : t));
        if (message.role === 'user') {
            const ownerConfigs = telegramConfigs.filter(c => c.type === 'owner');
             if (ownerConfigs.length > 0) {
                 const ticket = supportTickets.find(t => t.id === ticketId);
                 const notificationMsg = `*رد جديد على تذكرة دعم* 💬\n*من:* ${ticket?.userName || 'غير معروف'}\n*الرسالة:* ${message.content}`;
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
            userId, userName, createdAt: new Date().toISOString(), isResolved: false, history: [firstMessage],
        };
        const docRef = await addDoc(collection(db, "supportTickets"), newTicket);
        setSupportTickets(prev => [...prev, {id: docRef.id, ...newTicket}]);
        const ownerConfigs = telegramConfigs.filter(c => c.type === 'owner');
        if (ownerConfigs.length > 0) {
            const notificationMsg = `*تذكرة دعم جديدة* 📩\n*من:* ${userName} (${userId.substring(0,4)})\n*المشكلة:* ${firstMessage.content}\n\nالرجاء المتابعة من لوحة التحكم.`;
            ownerConfigs.forEach(config => sendTelegramMessage(config.chatId, notificationMsg));
        }
    };
    const resolveSupportTicket = async (ticketId: string) => {
        await updateDoc(doc(db, "supportTickets", ticketId), { isResolved: true });
        setSupportTickets(prev => prev.map(t => t.id === ticketId ? {...t, isResolved: true} : t));
    }
    // END: SUPPORT TICKET FUNCTIONS

    // START: ORDER FUNCTIONS
    const assignOrderToNextWorker = useCallback(async (orderId: string, excludedWorkerIds: string[] = []) => {
        const currentWorkers = deliveryWorkers;
        const completedOrdersByWorker: {[workerId: string]: number} = {};
        allOrders.forEach(o => {
            if (o.status === 'delivered' && o.deliveryWorkerId) {
                completedOrdersByWorker[o.deliveryWorkerId] = (completedOrdersByWorker[o.deliveryWorkerId] || 0) + 1;
            }
        });
        const busyWorkerIds = new Set(allOrders.filter(o => ['confirmed', 'preparing', 'on_the_way'].includes(o.status)).map(o => o.deliveryWorkerId).filter((id): id is string => !!id));
        const availableWorkers = currentWorkers.filter(w => w.isOnline && !busyWorkerIds.has(w.id) && !excludedWorkerIds.includes(w.id));

        if (availableWorkers.length === 0) {
            await updateDoc(doc(db, "orders", orderId), { status: 'unassigned', assignedToWorkerId: null, assignmentTimestamp: null, rejectedBy: excludedWorkerIds });
            setAllOrders(prev => prev.map(o => o.id === orderId ? {...o, status: 'unassigned', assignedToWorkerId: null, assignmentTimestamp: null, rejectedBy: excludedWorkerIds} : o));
            return;
        }
        availableWorkers.sort((a,b) => (completedOrdersByWorker[a.id] || 0) - (completedOrdersByWorker[b.id] || 0));
        const nextWorker = availableWorkers[0];
        const updateData = { status: 'pending_assignment' as OrderStatus, assignedToWorkerId: nextWorker.id, assignmentTimestamp: new Date().toISOString() };
        await updateDoc(doc(db, "orders", orderId), updateData);
        setAllOrders(prev => prev.map(o => o.id === orderId ? {...o, ...updateData} : o));
        const workerConfig = telegramConfigs.find(c => c.type === 'worker' && c.workerId === nextWorker.id);
        const orderData = allOrders.find(o => o.id === orderId); 
        if (workerConfig && orderData) {
            const message = `*لديك طلب جديد في الانتظار* 🛵\n*رقم الطلب:* \`${orderId.substring(0, 6)}\`\n*المنطقة:* ${orderData.address.deliveryZone}\n*ربحك من التوصيل:* ${new Intl.NumberFormat('ar-IQ', { style: 'currency', currency: 'IQD' }).format(orderData.deliveryFee)}\n\nالرجاء مراجعة التطبيق لقبول أو رفض الطلب.`;
            sendTelegramMessage(workerConfig.chatId, message);
        }
    }, [allOrders, deliveryWorkers, telegramConfigs, sendTelegramMessage]);

    const updateOrderStatus = async (orderId: string, status: OrderStatus, workerId?: string) => {
        const orderDocRef = doc(db, "orders", orderId);
        const currentOrder = allOrders.find(o => o.id === orderId);
        if (!currentOrder) return;
        const updateData: any = { status };
        let localWorkerData: { id: string, name: string } | null = null;
        if (status === 'confirmed' && workerId) {
            let worker = deliveryWorkers.find(w => w.id === workerId);
            if (!worker) {
                const workerSnap = await getDoc(doc(db, "deliveryWorkers", workerId));
                if (workerSnap.exists()) {
                    worker = { id: workerSnap.id, ...workerSnap.data() } as DeliveryWorker;
                }
            }
            updateData.deliveryWorker = { id: workerId, name: worker?.name || "عامل غير معروف" };
            updateData.deliveryWorkerId = workerId;
            localWorkerData = updateData.deliveryWorker;
        }

        if (status === 'unassigned' && workerId) {
            const newRejectedBy = Array.from(new Set([...(currentOrder.rejectedBy || []), workerId]));
            setAllOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'unassigned', assignedToWorkerId: null, assignmentTimestamp: null, rejectedBy: newRejectedBy } : o));
            await assignOrderToNextWorker(orderId, newRejectedBy); // This is now the main path for rejection
            return;
        } else if (status !== 'unassigned') {
            updateData.assignedToWorkerId = null;
            updateData.assignmentTimestamp = null;
            updateData.rejectedBy = [];
        }

        if (status === 'cancelled') {
            try {
                await runTransaction(db, async (transaction) => {
                    for (const item of currentOrder.items) {
                        const productRef = doc(db, "products", item.product.id);
                        const productDoc = await transaction.get(productRef);
                        if (productDoc.exists()) {
                            const productData = productDoc.data() as Product;
                            if (item.selectedSize) {
                                const newSizes = productData.sizes?.map(s => s.name === item.selectedSize!.name ? { ...s, stock: s.stock + item.quantity } : s) ?? [];
                                transaction.update(productRef, { sizes: newSizes });
                            } else {
                                transaction.update(productRef, { stock: (productData.stock || 0) + item.quantity });
                            }
                        }
                    }
                    transaction.update(orderDocRef, updateData);
                });
                setAllOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updateData } : o));
            } catch (e) { console.error("Transaction failed: ", e); toast({ title: "فشل إلغاء الطلب", variant: "destructive" }); return; }
        } else {
            await updateDoc(orderDocRef, updateData);
            setAllOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updateData, deliveryWorker: localWorkerData !== undefined ? localWorkerData : o.deliveryWorker } : o));
        }

        if (status === 'delivered' && workerId) {
             try {
                const workerDocRef = doc(db, "deliveryWorkers", workerId);
                const worker = deliveryWorkers.find(w => w.id === workerId);
                const now = new Date();
                const { isFrozen } = getWorkerLevel(worker!, 0, now); // delivered count doesn't matter here
                let workerUpdate: Partial<DeliveryWorker> = {};
                if (isFrozen) {
                    const unfreezeProgress = (worker?.unfreezeProgress || 0) + 1;
                    if (unfreezeProgress >= 10) workerUpdate = { lastDeliveredAt: now.toISOString(), unfreezeProgress: 0 };
                    else workerUpdate = { unfreezeProgress };
                } else {
                    workerUpdate = { lastDeliveredAt: now.toISOString(), unfreezeProgress: 0 };
                }
                await updateDoc(workerDocRef, workerUpdate);
             } catch (error) { console.error("Failed to update worker stats on delivery", error); }
        }
    };
    const deleteOrder = async (orderId: string) => {
        await deleteDoc(doc(db, "orders", orderId));
        setAllOrders(prev => prev.filter(o => o.id !== orderId));
    };
    // END: ORDER FUNCTIONS

    const value: AppContextType = {
        ...addresses,
        ...data,
        ...cart,
        userId,
        allUsers: [], 
        isLoading,
        allOrders,
        updateOrderStatus,
        deleteOrder,
        supportTickets,
        mySupportTicket,
        createSupportTicket,
        addMessageToTicket,
        resolveSupportTicket,
        startNewTicketClient,
        telegramConfigs,
        addTelegramConfig,
        deleteTelegramConfig,
        sendTelegramMessage,
        deliveryWorkers,
        addDeliveryWorker,
        updateWorkerStatus,
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};

    