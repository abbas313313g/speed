
"use client";

import { useState, useRef, useMemo } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Loader2, MapPin, Upload, X, Tags } from 'lucide-react';
import type { Restaurant } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import React from 'react';
import { useRestaurants } from '@/hooks/useRestaurants';
import { useCategories } from '@/hooks/useCategories';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  const [currentStore, setCurrentStore] = useState<Partial<Restaurant> & {image?:string}>({ ...EMPTY_STORE });
  const [isSaving, setIsSaving] = useState(false);
  const [newSection, setNewSection] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenDialog = (store?: Restaurant) => {
      if (store) {
          setIsEditing(true);
          setCurrentStore({ ...store });
      } else {
          setIsEditing(false);
          setCurrentStore({ ...EMPTY_STORE, branchId, menuSections: [] });
      }
      setNewSection('');
      setOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800000) {
          toast({ title: "الصورة كبيرة", description: "يرجى اختيار صورة أصغر من 800 كيلوبايت.", variant: "destructive" });
          return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setCurrentStore({ ...currentStore, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!currentStore.name || !currentStore.image || !currentStore.loginCode || !currentStore.restaurantNumber || !currentStore.categoryId) {
        toast({ title: "بيانات ناقصة", variant: "destructive" }); 
        return;
    }
    
    setIsSaving(true);
    try {
        if (isEditing && currentStore.id) {
            await updateRestaurant(currentStore as any);
        } else {
            await addRestaurant(currentStore as any);
        }
        setOpen(false);
    } catch (e) {} finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-black text-primary">إدارة المتاجر</h1>
            <p className="text-muted-foreground font-bold">تحويل الصور إلى نصوص Data URI لضمان عملها عالمياً.</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="rounded-xl h-12 px-6 font-bold shadow-lg">
            إضافة متجر جديد
        </Button>
      </header>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl rounded-[2.5rem] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle className="text-2xl font-black">{isEditing ? 'تعديل المتجر' : 'إنشاء متجر جديد'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4 text-right">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <Label className="font-bold">اسم المتجر</Label>
                        <Input value={currentStore.name ?? ''} onChange={(e) => setCurrentStore({ ...currentStore, name: e.target.value })} className="rounded-xl h-12" />
                    </div>
                    <div className="space-y-1">
                        <Label className="font-bold">الفئة</Label>
                        <Select value={currentStore.categoryId} onValueChange={(val) => setCurrentStore({...currentStore, categoryId: val})}>
                            <SelectTrigger className="h-12 rounded-xl">
                                <SelectValue placeholder="اختر فئة" />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="font-bold">لوغو المتجر (رفع مباشر)</Label>
                    <Button type="button" variant="outline" className="w-full h-14 rounded-xl font-black gap-2 border-primary/40 text-primary" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="h-5 w-5" /> اختيار لوغو المتجر
                    </Button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                    {currentStore.image && (
                        <div className="relative h-32 w-32 mx-auto rounded-full overflow-hidden border-4 border-primary/20 mt-4">
                            <Image src={currentStore.image} fill className="object-cover" alt="preview" unoptimized={true}/>
                        </div>
                    )}
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
            </div>
            <DialogFooter>
                <Button onClick={handleSave} className="w-full h-14 rounded-2xl text-lg font-black shadow-xl" disabled={isSaving}>
                    {isSaving ? <Loader2 className="animate-spin h-6 w-6" /> : "حفظ المتجر"}
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
                    <TableHead className="font-black">إجراءات</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {restaurants.map((store) => (
                    <TableRow key={store.id}>
                        <TableCell>
                            <div className="relative h-10 w-10">
                                <Image src={store.image} fill className="rounded-lg object-cover border" alt="" unoptimized={true} />
                            </div>
                        </TableCell>
                        <TableCell className="font-bold">{store.name}</TableCell>
                        <TableCell>
                            <div className="flex gap-2">
                                <Button variant="outline" size="icon" className="rounded-lg h-9 w-9" onClick={() => handleOpenDialog(store)}>
                                    <Edit className="h-4 w-4" />
                                </Button>
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
