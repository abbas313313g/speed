
import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Category } from '@/lib/types';
import { useToast } from './use-toast';
import { categories as initialCategoriesData } from '@/lib/mock-data';
import { ShoppingBasket } from 'lucide-react';

let allCategories: Category[] = [];
let hasFetched = false;
const listeners = new Set<(data: Category[]) => void>();

const fetchAllCategories = async () => {
    if (hasFetched) return allCategories;
    try {
        const categoriesSnap = await getDocs(collection(db, "categories"));
        allCategories = categoriesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
        hasFetched = true;
        listeners.forEach(listener => listener(allCategories));
        return allCategories;
    } catch (error) {
        console.error("Error fetching categories:", error);
        return [];
    }
};

const iconMap = initialCategoriesData.reduce((acc, cat) => {
    acc[cat.iconName] = cat.icon;
    return acc;
}, {} as {[key: string]: React.ComponentType<{ className?: string }>});


export const useCategories = () => {
    const [categories, setCategoriesState] = useState<Category[]>(allCategories);
    const [isLoading, setIsLoading] = useState(!hasFetched);
    const { toast } = useToast();

    useEffect(() => {
        const listener = (data: Category[]) => setCategoriesState(data);
        listeners.add(listener);

        if (!hasFetched) {
            setIsLoading(true);
            fetchAllCategories().finally(() => setIsLoading(false));
        }

        return () => {
            listeners.delete(listener);
        };
    }, []);

    const setCategories = useCallback((newCategories: Category[] | ((prev: Category[]) => Category[])) => {
        if (typeof newCategories === 'function') {
            allCategories = newCategories(allCategories);
        } else {
            allCategories = newCategories;
        }
        listeners.forEach(listener => listener(allCategories));
    }, []);

    const dynamicCategories = useMemo(() => {
        return categories.map(cat => ({
            ...cat,
            icon: iconMap[cat.iconName] || ShoppingBasket
        }));
    }, [categories]);

    const addCategory = async (categoryData: Omit<Category, 'id' | 'icon'>) => {
        setIsLoading(true);
        try {
            const docRef = await addDoc(collection(db, "categories"), categoryData);
            const newCategory = { id: docRef.id, ...categoryData };
            setCategories(prev => [...prev, newCategory]);
            toast({ title: "تمت إضافة القسم بنجاح" });
        } catch (error) {
            console.error("Failed to add category:", error);
            toast({ title: "فشل إضافة القسم", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const updateCategory = async (updatedCategory: Omit<Category, 'icon' | 'id'> & { id: string }) => {
        setIsLoading(true);
        try {
            const { id, ...categoryData } = updatedCategory;
            const categoryDocRef = doc(db, "categories", id);
            await updateDoc(categoryDocRef, categoryData);
            setCategories(prev => prev.map(c => c.id === id ? { ...c, ...categoryData } : c));
            toast({ title: "تم تحديث القسم بنجاح" });
        } catch (error) {
            console.error("Failed to update category:", error);
            toast({ title: "فشل تحديث القسم", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const deleteCategory = async (categoryId: string) => {
        setIsLoading(true);
        try {
            await deleteDoc(doc(db, "categories", categoryId));
            setCategories(prev => prev.filter(c => c.id !== categoryId));
            toast({ title: "تم حذف القسم بنجاح" });
        } catch (error) {
            console.error("Failed to delete category:", error);
            toast({ title: "فشل حذف القسم", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };
    
    return { categories: dynamicCategories, isLoading, addCategory, updateCategory, deleteCategory };
};

