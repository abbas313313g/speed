
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
import { Star, Edit, Trash2, Loader2, MapPin, Upload, Percent, Clock, LayoutGrid, Tags } from 'lucide-react';
import type { Restaurant } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import React from 'react';
import { useRestaurants } from '@/hooks/useRestaurants';
import { useCategories } from '@/hooks/useCategories';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const EMPTY_STORE: Omit<Restaurant, 'id'> & {image: string} = {
    restaurantNumber: '',
    name: '',
    image: '',
    rating: 5,
    latitude: 32.3333,
    longitude: 44.6500,
    openTime: '09:00',
    closeTime: '23:00',
    loginCode: '',
    commissionRate: 10,
    branchId: 'main',
    categoryId: '',
    menuSections: []
};

export default function AdminStoresPage({ branchId }: { branchId: string }) {
  const { restaurants, isLoading, addRestaurant, updateRestaurant, deleteRestaurant } = useRestaurants(branchId);
  const { categories } = useCategories();
  const { toast } = useToast();
  
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentStore, setCurrentStore] = useState<Partial<Restaurant> & {image?:string, sectionsText?: string}>({ ...EMPTY_STORE });
  const [isSaving, setIsSaving] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenDialog = (store?: Restaurant) => {
      if (store) {
          setIsEditing(true);
          setCurrentStore({ 
              ...store, 
              sectionsText: store.menuSections?.join(', ') || '' 
          });
      } else {
          setIsEditing(false);
          setCurrentStore({ ...EMPTY_STORE, branchId, sectionsText: '' });
      }
      setOpen(true);
  };

  const handleSave = async () => {
    if (!currentStore.name || !currentStore.image || !currentStore.loginCode || !currentStore.restaurantNumber || !currentStore.categoryId) {
        toast({ title: "بيانات ناقصة", description: "الرجاء اختيار فئة المتجر وإكمال الحقول المطلوبة.", variant: "destructive" }); 
        return;
    }
    
    setIsSaving(true);
    try {
        const sections = currentStore.sectionsText 
            ? currentStore.sectionsText.split(',').map(s => s.trim()).filter(s => s !== '') 
            : [];

        const storeToSave = { 
            ...currentStore, 
            branchId: branchId || 'main',
            rating: Number(currentStore.rating) || 5,
            commissionRate: Number(currentStore.commissionRate) || 10,
            latitude: Number(currentStore.latitude),
            longitude: Number(currentStore.longitude),
            menuSections: sections
        };
        
        delete (storeToSave as any).sectionsText;

        if (isEditing && currentStore.id) {
            await updateRestaurant(storeToSave as any);
        } else {
            await addRestaurant(storeToSave as any);
        }
        setOpen(false);
    } catch (e: any) { 
        console.error("Save store error:", e);
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
            <p className="text-muted-foreground font-bold">تخصيص الفئات والأقسام الداخلية لكل متجر.</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="rounded-xl h-12 px-6 font-bold shadow-lg">
            إضافة متجر جديد
        </Button>
      </header>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl rounded-[2.5rem] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle className="text-2xl font-black">{isEditing ? 'تعديل بيانات المتجر' : 'إنشاء حساب متجر جديد'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4 text-right">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <Label className="font-bold">اسم المتجر</Label>
                        <Input value={currentStore.name ?? ''} onChange={(e) => setCurrentStore({ ...currentStore, name: e.target.value })} className="rounded-xl h-12" />
                    </div>
                    <div className="space-y-1">
                        <Label className="font-bold">الفئة العامة</Label>
                        <Select value={currentStore.categoryId} onValueChange={(val) => setCurrentStore({...currentStore, categoryId: val})}>
                            <SelectTrigger className="h-12 rounded-xl">
                                <SelectValue placeholder="اختر فئة (ماركت، مطعم...)" />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-1 bg-muted/20 p-4 rounded-2xl border-2 border-dashed">
                    <Label className="font-black flex items-center gap-2"><Tags className="h-4 w-4 text-primary"/> أقسام المنيو الداخلية</Label>
                    <Textarea 
                        value={currentStore.sectionsText} 
                        onChange={(e) => setCurrentStore({...currentStore, sectionsText: e.target.value})}
                        placeholder="مثال: بيتزا، برجر، مقبلات، مشروبات (افصل بينهم بفاصلة)"
                        className="rounded-xl mt-2 font-bold"
                    />
                    <p className="text-[10px] text-muted-foreground font-bold italic mt-1">هذه الأقسام ستظهر للمستخدم داخل المتجر لتصفية المنتجات.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <Label className="font-bold">الرمز السري</Label>
                        <Input value={currentStore.loginCode ?? ''} onChange={(e) => setCurrentStore({ ...currentStore, loginCode: e.target.value })} className="rounded-xl h-12 text-center font-black" dir="ltr" />
                    </div>
                    <div className="space-y-1">
                        <Label className="font-bold">رقم المتجر (ID)</Label>
                        <Input value={currentStore.restaurantNumber ?? ''} onChange={(e) => setCurrentStore({ ...currentStore, restaurantNumber: e.target.value })} className="rounded-xl h-12 text-center" dir="ltr" />
                    </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <Label className="font-bold">نسبة الشركة (%)</Label>
                        <Input type="number" value={currentStore.commissionRate ?? ''} onChange={(e) => setCurrentStore({ ...currentStore, commissionRate: parseFloat(e.target.value) || 0 })} className="rounded-xl h-12 text-center font-black" />
                    </div>
                     <div className="space-y-1">
                        <Label className="font-bold">وقت العمل (من - إلى)</Label>
                        <div className="flex gap-2">
                             <Input type="time" value={currentStore.openTime} onChange={(e) => setCurrentStore({...currentStore, openTime: e.target.value})} className="h-12 rounded-xl font-bold" />
                             <Input type="time" value={currentStore.closeTime} onChange={(e) => setCurrentStore({...currentStore, closeTime: e.target.value})} className="h-12 rounded-xl font-bold" />
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
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
                    <TableHead className="font-black">الاسم والفئة</TableHead>
                    <TableHead className="font-black">الأقسام الداخلية</TableHead>
                    <TableHead className="font-black">إجراءات</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {restaurants.map((store) => (
                    <TableRow key={store.id}>
                        <TableCell>
                            <div className="relative h-10 w-10">
                                <Image src={store.image || 'https://placehold.co/40x40.png'} fill className="rounded-lg object-cover border" alt={store.name} unoptimized={true} />
                            </div>
                        </TableCell>
                        <TableCell className="font-bold">
                            {store.name}
                            <div className="text-[9px] text-primary font-black uppercase tracking-wider">
                                {categories.find(c => c.id === store.categoryId)?.name || 'بدون فئة'}
                            </div>
                        </TableCell>
                        <TableCell>
                            <div className="flex flex-wrap gap-1">
                                {store.menuSections?.map(s => <Badge key={s} variant="outline" className="text-[8px] px-1.5 py-0">{s}</Badge>) || '-'}
                            </div>
                        </TableCell>
                        <TableCell>
                            <div className="flex gap-2">
                                <Button variant="outline" size="icon" className="rounded-lg h-9 w-9" onClick={() => handleOpenDialog(store)}>
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="text-destructive h-9 w-9">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="rounded-[2rem]">
                                        <AlertDialogHeader>
                                            <AlertDialogTitle className="text-right">حذف المتجر؟</AlertDialogTitle>
                                            <AlertDialogDescription className="text-right font-bold">
                                                سيتم حذف المتجر نهائياً من سجلات الفرع.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter className="flex-row gap-2">
                                            <AlertDialogCancel className="flex-1 rounded-xl">تراجع</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => deleteRestaurant(store.id)} className="bg-destructive hover:bg-destructive/90 flex-1 rounded-xl">حذف</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
      </Card>
    </div>
  );
}
