
"use client";

import { useState, useRef } from 'react';
import Image from 'next/image';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Star, Edit, Trash2, Loader2, MapPin, Upload, Percent } from 'lucide-react';
import type { Restaurant } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import React from 'react';
import { useRestaurants } from '@/hooks/useRestaurants';

const EMPTY_STORE: Omit<Restaurant, 'id'> & {image: string} = {
    restaurantNumber: '',
    name: '',
    image: '',
    rating: 0,
    latitude: undefined,
    longitude: undefined,
    openTime: '09:00',
    closeTime: '23:00',
    loginCode: '',
    commissionRate: 10,
    branchId: 'main'
};

export default function AdminStoresPage({ branchId }: { branchId: string }) {
  const { restaurants, isLoading, addRestaurant, updateRestaurant, deleteRestaurant } = useRestaurants(branchId);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentStore, setCurrentStore] = useState<Partial<Restaurant> & {image?:string}>({ ...EMPTY_STORE });
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    if (!currentStore.name || !currentStore.image || !currentStore.loginCode || !currentStore.restaurantNumber) {
        toast({ title: "بيانات ناقصة", description: "الرجاء إكمال كافة الحقول المطلوبة بما في ذلك رقم المتجر.", variant: "destructive" }); 
        return;
    }
    setIsSaving(true);
    try {
        const storeToSave = { ...currentStore, branchId: branchId || 'main' };
        if (isEditing && currentStore.id) {
            await updateRestaurant(storeToSave as any);
        } else {
            await addRestaurant(storeToSave as any);
        }
        setOpen(false);
        setCurrentStore({ ...EMPTY_STORE });
    } catch (e) { 
        toast({ title: "فشل الحفظ", variant: "destructive" }); 
    } finally {
        setIsSaving(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center animate-pulse font-black text-primary">جارِ جلب بيانات المتاجر...</div>;

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-black text-primary">إدارة المتاجر</h1>
            <p className="text-muted-foreground font-bold">عرض المتاجر التابعة لفرع: {branchId === 'main' ? 'الإدارة الرئيسية' : branchId}</p>
        </div>
        <Button onClick={() => { setIsEditing(false); setCurrentStore({ ...EMPTY_STORE, branchId }); setOpen(true); }} className="rounded-xl h-12 px-6 font-bold shadow-lg">
            إضافة متجر جديد
        </Button>
      </header>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg rounded-[2.5rem] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle className="text-2xl font-black">{isEditing ? 'تعديل بيانات المتجر' : 'إنشاء حساب متجر'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4 text-right">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <Label className="font-bold">اسم المتجر</Label>
                        <Input value={currentStore.name ?? ''} onChange={(e) => setCurrentStore({ ...currentStore, name: e.target.value })} className="rounded-xl h-12" placeholder="مثال: مطعم النور" />
                    </div>
                    <div className="space-y-1">
                        <Label className="font-bold">رقم المتجر (للدخول)</Label>
                        <Input value={currentStore.restaurantNumber ?? ''} onChange={(e) => setCurrentStore({ ...currentStore, restaurantNumber: e.target.value })} className="rounded-xl h-12 text-center font-bold" dir="ltr" placeholder="1001" />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <Label className="font-bold">الرمز السري (Login Code)</Label>
                        <Input value={currentStore.loginCode ?? ''} onChange={(e) => setCurrentStore({ ...currentStore, loginCode: e.target.value })} className="rounded-xl h-12 text-center font-black" dir="ltr" />
                    </div>
                    <div className="space-y-1">
                        <Label className="font-bold">نسبة الشركة (%)</Label>
                        <div className="relative">
                            <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                            <Input type="number" value={currentStore.commissionRate ?? ''} onChange={(e) => setCurrentStore({ ...currentStore, commissionRate: parseFloat(e.target.value) || 0 })} className="rounded-xl h-12 pl-10 text-center font-black" />
                        </div>
                    </div>
                </div>
                <div className="space-y-1">
                    <Label className="font-bold">صورة المتجر</Label>
                    <div className="flex gap-2">
                        <Input value={currentStore.image ?? ''} onChange={(e) => setCurrentStore({ ...currentStore, image: e.target.value })} className="rounded-xl h-12" placeholder="رابط الصورة أو ارفع ملف..." />
                        <Button variant="outline" size="icon" className="rounded-xl h-12 w-12 shrink-0" onClick={() => fileInputRef.current?.click()}>
                            <Upload className="h-5 w-5" />
                        </Button>
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => setCurrentStore({ ...currentStore, image: reader.result as string });
                            reader.readAsDataURL(file);
                        }
                    }} />
                </div>
                {currentStore.image && <div className="flex justify-center"><Image src={currentStore.image} alt="preview" width={80} height={80} className="rounded-xl border object-cover" unoptimized={true} /></div>}
            </div>
            <DialogFooter>
                <Button onClick={handleSave} className="w-full h-14 rounded-2xl text-lg font-black shadow-xl" disabled={isSaving}>
                    {isSaving ? <Loader2 className="animate-spin h-6 w-6" /> : "حفظ بيانات المتجر"}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="rounded-[1.5rem] border-none shadow-xl overflow-hidden bg-white">
        <Table>
            <TableHeader className="bg-muted/50">
                <TableRow>
                    <TableHead className="font-black">صورة</TableHead>
                    <TableHead className="font-black">الاسم</TableHead>
                    <TableHead className="font-black">نسبة الشركة</TableHead>
                    <TableHead className="font-black">إجراءات</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {restaurants.map((store) => (
                    <TableRow key={store.id} className="hover:bg-muted/20">
                        <TableCell>
                            <div className="relative h-10 w-10">
                                <Image src={store.image || 'https://placehold.co/40x40.png'} fill className="rounded-lg object-cover" alt={store.name} unoptimized={true} />
                            </div>
                        </TableCell>
                        <TableCell className="font-bold">
                            {store.name}
                            <div className="text-[10px] text-muted-foreground font-mono">#{store.restaurantNumber}</div>
                        </TableCell>
                        <TableCell>
                            <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-black">{store.commissionRate}%</span>
                        </TableCell>
                        <TableCell>
                            <div className="flex gap-2">
                                <Button variant="outline" size="icon" className="rounded-lg h-9 w-9" onClick={() => { setIsEditing(true); setCurrentStore(store); setOpen(true); }}>
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="text-destructive h-9 w-9 hover:bg-destructive/10">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="rounded-[2rem]">
                                        <AlertDialogHeader>
                                            <AlertDialogTitle className="text-right">حذف المتجر؟</AlertDialogTitle>
                                            <AlertDialogDescription className="text-right font-bold">
                                                هل أنت متأكد من حذف "{store.name}"؟ سيتم مسح بياناته من هذا الفرع.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter className="flex-row gap-2">
                                            <AlertDialogCancel className="flex-1 rounded-xl">تراجع</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => deleteRestaurant(store.id)} className="bg-destructive hover:bg-destructive/90 flex-1 rounded-xl">نعم، حذف</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
        {restaurants.length === 0 && (
            <div className="text-center py-20 bg-muted/5">
                <p className="text-muted-foreground font-bold italic">لا توجد متاجر مضافة لهذا الفرع حتى الآن.</p>
            </div>
        )}
      </Card>
    </div>
  );
}
