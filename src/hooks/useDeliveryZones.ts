
"use client";

import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { DeliveryZone } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export const useDeliveryZones = () => {
    const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const fetchZones = async () => {
            setIsLoading(true);
            try {
                const querySnapshot = await getDocs(collection(db, "deliveryZones"));
                const zones = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DeliveryZone));
                setDeliveryZones(zones);
            } catch (error) {
                console.error("Error fetching delivery zones:", error);
                toast({ title: "فشل تحميل مناطق التوصيل", variant: "destructive" });
            } finally {
                setIsLoading(false);
            }
        };
        fetchZones();
    }, [toast]);
    
    const addDeliveryZone = useCallback(async (zone: Omit<DeliveryZone, 'id'>) => {
        try {
            const docRef = await addDoc(collection(db, "deliveryZones"), zone);
            setDeliveryZones(prev => [{id: docRef.id, ...zone}, ...prev]);
            toast({ title: "تمت إضافة المنطقة بنجاح" });
        } catch (error) { toast({ title: "فشل إضافة المنطقة", variant: "destructive" }); }
    }, [toast]);

    const updateDeliveryZone = useCallback(async (zone: DeliveryZone) => {
        try {
            const { id, ...zoneData } = zone;
            await updateDoc(doc(db, "deliveryZones", id), zoneData);
            setDeliveryZones(prev => prev.map(z => z.id === id ? zone : z));
            toast({ title: "تم تحديث المنطقة بنجاح" });
        } catch (error) { toast({ title: "فشل تحديث المنطقة", variant: "destructive" }); }
    }, [toast]);

    const deleteDeliveryZone = useCallback(async (zoneId: string) => {
        try {
            await deleteDoc(doc(db, "deliveryZones", zoneId));
            setDeliveryZones(prev => prev.filter(z => z.id !== zoneId));
            toast({ title: "تم حذف المنطقة بنجاح" });
        } catch (error) { toast({ title: "فشل حذف المنطقة", variant: "destructive" }); }
    }, [toast]);


    return { deliveryZones, isLoading, addDeliveryZone, updateDeliveryZone, deleteDeliveryZone };
};
