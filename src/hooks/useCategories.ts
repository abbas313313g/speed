
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
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
        const fetchCategories = async () => {
            setIsLoading(true);
            try {
                const querySnapshot = await getDocs(collection(db, "categories"));
                const fetchedCategories = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Omit<Category, 'icon'>));
                setCategoriesData(fetchedCategories);
            } catch (error) {
                console.error("Error fetching categories:", error);
                toast({ title: "فشل تحميل الأقسام", variant: "destructive" });
            } finally {
                setIsLoading(false);
            }
        };
        fetchCategories();
    }, [toast]);
    
    const iconMap = useMemo(() => initialCategories.reduce((acc, cat) => {
        acc[cat.iconName] = cat.icon;
        return acc;
    }, {} as {[key: string]: React.ComponentType<{ className?: string }>}), []);

    const categories = useMemo(() => {
        return categoriesData.map(cat => ({
            ...cat,
            icon: iconMap[cat.iconName] || ShoppingBasket
        }));
    }, [categoriesData, iconMap]);

    const addCategory = useCallback(async (categoryData: Omit<Category, 'id'|'icon'>) => {
        try {
            const docRef = await addDoc(collection(db, "categories"), categoryData);
            setCategoriesData(prev => [{id: docRef.id, ...categoryData}, ...prev]);
            toast({ title: "تمت إضافة القسم بنجاح" });
        } catch (error) { toast({ title: "فشل إضافة القسم", variant: "destructive" }); }
    }, [toast]);

    const updateCategory = useCallback(async (updatedCategory: Omit<Category, 'icon'|'id'> & { id: string }) => {
        try {
            const { id, ...categoryData } = updatedCategory;
            await updateDoc(doc(db, "categories", id), categoryData);
            setCategoriesData(prev => prev.map(c => c.id === id ? {...c, ...categoryData} : c));
            toast({ title: "تم تحديث القسم بنجاح" });
        } catch (error) { toast({ title: "فشل تحديث القسم", variant: "destructive" }); }
    }, [toast]);

    const deleteCategory = useCallback(async (categoryId: string) => {
        try {
            await deleteDoc(doc(db, "categories", categoryId));
            setCategoriesData(prev => prev.filter(c => c.id !== categoryId));
            toast({ title: "تم حذف القسم بنجاح" });
        } catch (error) { toast({ title: "فشل حذف القسم", variant: "destructive" }); }
    }, [toast]);

    return { categories, isLoading, addCategory, updateCategory, deleteCategory };
};
