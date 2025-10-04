
"use client";

import { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, onSnapshot, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { DeliveryZone } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export const useDeliveryZones = () => {
    const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'deliveryZones'),
            (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as DeliveryZone[];
                setDeliveryZones(data);
                setIsLoading(false);
            },
            (error) => {
                console.error("Error fetching delivery zones:", error);
                toast({ title: "Failed to fetch delivery zones", variant: "destructive" });
                setIsLoading(false);
            }
        );
        return () => unsub();
    }, []);

    const addDeliveryZone = useCallback(async (zoneData: Omit<DeliveryZone, 'id'>) => {
        try {
            await addDoc(collection(db, "deliveryZones"), zoneData);
            toast({ title: "تمت إضافة المنطقة بنجاح" });
        } catch (error) { toast({ title: "فشل إضافة المنطقة", variant: "destructive" }); }
    }, [toast]);

    const updateDeliveryZone = useCallback(async (zone: DeliveryZone) => {
        try {
            const { id, ...zoneData } = zone;
            await updateDoc(doc(db, "deliveryZones", id), zoneData);
            toast({ title: "تم تحديث المنطقة بنجاح" });
        } catch (error) { toast({ title: "فشل تحديث المنطقة", variant: "destructive" }); }
    }, [toast]);

    const deleteDeliveryZone = useCallback(async (zoneId: string) => {
        try {
            await deleteDoc(doc(db, "deliveryZones", zoneId));
            toast({ title: "تم حذف المنطقة بنجاح" });
        } catch (error) { toast({ title: "فشل حذف المنطقة", variant: "destructive" }); }
    }, [toast]);

    return { deliveryZones, isLoading, addDeliveryZone, updateDeliveryZone, deleteDeliveryZone };
};
