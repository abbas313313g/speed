
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, onSnapshot, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Category } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { categories as initialCategories } from '@/lib/mock-data';
import { ShoppingBasket } from 'lucide-react';

export const useCategories = () => {
    const [categoriesData, setCategoriesData] = useState<Omit<Category, 'icon'>[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'categories'),
            (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Omit<Category, 'icon'>[];
                setCategoriesData(data);
                setIsLoading(false);
            },
            (error) => {
                console.error("Error fetching categories:", error);
                toast({ title: "Failed to fetch categories", variant: "destructive" });
                setIsLoading(false);
            }
        );
        return () => unsub();
    }, [toast]);

    const categories = useMemo(() => {
        const iconMap = initialCategories.reduce((acc, cat) => {
            acc[cat.iconName] = cat.icon;
            return acc;
        }, {} as {[key: string]: React.ComponentType<{ className?: string }>});
        return categoriesData.map(cat => ({
            ...cat,
            icon: iconMap[cat.iconName] || ShoppingBasket
        }));
    }, [categoriesData]);

    const addCategory = useCallback(async (categoryData: Omit<Category, 'id' | 'icon'>) => {
        try {
            await addDoc(collection(db, "categories"), categoryData);
            toast({ title: "تمت إضافة القسم بنجاح" });
        } catch (error) { toast({ title: "فشل إضافة القسم", variant: "destructive" }); }
    }, [toast]);

    const updateCategory = useCallback(async (category: Omit<Category, 'icon' | 'id'> & {id: string}) => {
        try {
            const { id, ...categoryData } = category;
            await updateDoc(doc(db, "categories", id), categoryData);
            toast({ title: "تم تحديث القسم بنجاح" });
        } catch (error) { toast({ title: "فشل تحديث القسم", variant: "destructive" }); }
    }, [toast]);

    const deleteCategory = useCallback(async (categoryId: string) => {
        try {
            await deleteDoc(doc(db, "categories", categoryId));
            toast({ title: "تم حذف القسم بنجاح" });
        } catch (error) { toast({ title: "فشل حذف القسم", variant: "destructive" }); }
    }, [toast]);

    return { categories, isLoading, addCategory, updateCategory, deleteCategory };
};

    