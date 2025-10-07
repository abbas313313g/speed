
"use client";

import { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AppSettings } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

const SETTINGS_DOC_ID = "main_settings";

export const useAppSettings = () => {
    const [settings, setSettingsState] = useState<AppSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const docRef = doc(db, 'settings', SETTINGS_DOC_ID);
        const unsub = onSnapshot(docRef,
            (docSnap) => {
                if (docSnap.exists()) {
                    setSettingsState(docSnap.data() as AppSettings);
                } else {
                    // Initialize with default settings if document doesn't exist
                    setSettingsState({ isMaintenanceMode: false });
                }
                setIsLoading(false);
            },
            (error) => {
                console.error("Error fetching app settings:", error);
                toast({ title: "Failed to fetch app settings", variant: "destructive" });
                setIsLoading(false);
            }
        );
        return () => unsub();
    }, [toast]);

    const setSettings = useCallback(async (newSettings: Partial<AppSettings>) => {
        setIsSaving(true);
        try {
            const docRef = doc(db, 'settings', SETTINGS_DOC_ID);
            // Use setDoc with merge to create or update the document
            await setDoc(docRef, newSettings, { merge: true });
            toast({ title: "تم حفظ الإعدادات بنجاح" });
        } catch (error) {
            console.error("Error saving settings:", error);
            toast({ title: "فشل حفظ الإعدادات", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    }, [toast]);

    return { settings, isLoading, isSaving, setSettings };
};
