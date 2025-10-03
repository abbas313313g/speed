
import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { DeliveryZone } from '@/lib/types';
import { useToast } from './use-toast';

let allDeliveryZones: DeliveryZone[] = [];
let hasFetched = false;
const listeners = new Set<(data: DeliveryZone[]) => void>();

const fetchAllDeliveryZones = async () => {
    if (hasFetched) return allDeliveryZones;
    try {
        const deliveryZonesSnap = await getDocs(collection(db, "deliveryZones"));
        allDeliveryZones = deliveryZonesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as DeliveryZone));
        hasFetched = true;
        listeners.forEach(listener => listener(allDeliveryZones));
        return allDeliveryZones;
    } catch (error) {
        console.error("Error fetching delivery zones:", error);
        return [];
    }
};

export const useDeliveryZones = () => {
    const [deliveryZones, setDeliveryZonesState] = useState<DeliveryZone[]>(allDeliveryZones);
    const [isLoading, setIsLoading] = useState(!hasFetched);
    const { toast } = useToast();

    useEffect(() => {
        const listener = (data: DeliveryZone[]) => setDeliveryZonesState(data);
        listeners.add(listener);

        if (!hasFetched) {
            setIsLoading(true);
            fetchAllDeliveryZones().finally(() => setIsLoading(false));
        }

        return () => {
            listeners.delete(listener);
        };
    }, []);
    
    const setDeliveryZones = useCallback((newDeliveryZones: DeliveryZone[] | ((prev: DeliveryZone[]) => DeliveryZone[])) => {
        if (typeof newDeliveryZones === 'function') {
            allDeliveryZones = newDeliveryZones(allDeliveryZones);
        } else {
            allDeliveryZones = newDeliveryZones;
        }
        listeners.forEach(listener => listener(allDeliveryZones));
    }, []);
    
    const addDeliveryZone = async (zone: Omit<DeliveryZone, 'id'>) => {
        setIsLoading(true);
        try {
            const docRef = await addDoc(collection(db, "deliveryZones"), zone);
            setDeliveryZones(prev => [...prev, { id: docRef.id, ...zone }]);
            toast({ title: "تمت إضافة المنطقة بنجاح" });
        } catch (error) {
            console.error("Failed to add delivery zone:", error);
            toast({ title: "فشل إضافة المنطقة", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const updateDeliveryZone = async (zone: DeliveryZone) => {
        setIsLoading(true);
        try {
            const zoneRef = doc(db, "deliveryZones", zone.id);
            await updateDoc(zoneRef, { name: zone.name, fee: zone.fee });
            setDeliveryZones(prev => prev.map(z => z.id === zone.id ? zone : z));
            toast({ title: "تم تحديث المنطقة بنجاح" });
        } catch (error) {
            console.error("Failed to update delivery zone:", error);
            toast({ title: "فشل تحديث المنطقة", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const deleteDeliveryZone = async (zoneId: string) => {
        setIsLoading(true);
        try {
            const zoneRef = doc(db, "deliveryZones", zoneId);
            await deleteDoc(zoneRef);
            setDeliveryZones(prev => prev.filter(z => z.id !== zoneId));
            toast({ title: "تم حذف المنطقة بنجاح" });
        } catch (error) {
            console.error("Failed to delete delivery zone:", error);
            toast({ title: "فشل حذف المنطقة", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    return { deliveryZones, isLoading, addDeliveryZone, updateDeliveryZone, deleteDeliveryZone };
};
