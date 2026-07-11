
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
    commissionRate: 10, // القيمة الافتراضية
};

export default function AdminStoresPage() {
  const { restaurants, isLoading, addRestaurant, updateRestaurant, deleteRestaurant } = useRestaurants();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentStore, setCurrentStore] = useState<Partial<Restaurant> & {image?:string}>({ ...EMPTY_STORE });
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    if (!currentStore.name || !currentStore.image || !currentStore.loginCode) {
        toast({ title: "بيانات ناقصة", variant: "destructive" }); return;
    }
    setIsSaving(true);
    try {
        if (isEditing && currentStore.id) await updateRestaurant(currentStore as any);
        else await addRestaurant(currentStore as any);
        setOpen(false);
    } catch (e) { toast({ title: "فشل الحفظ", variant: "destructive" }); }
    setIsSaving(false);
  };

  if (isLoading) return <div className="p-8 text-center">جار التحميل...</div>;

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div><h1 className="text-3xl font-black text-primary">إدارة المتاجر</h1><p className="text-muted-foreground">إضافة المطاعم وتحديد نسب العمولة.</p></div>
        <Button onClick={()=>{setIsEditing(false); setCurrentStore({...EMPTY_STORE}); setOpen(true)}} className="rounded-xl">إضافة متجر</Button>
      </header>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg rounded-[2.5rem] max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="text-2xl font-black">{isEditing ? 'تعديل المتجر' : 'إضافة متجر'}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4 text-right">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><Label className="font-bold">اسم المتجر</Label><Input value={currentStore.name} onChange={(e)=>setCurrentStore({...currentStore, name: e.target.value})} className="rounded-xl"/></div>
                    <div className="space-y-1"><Label className="font-bold">رقم المتجر</Label><Input value={currentStore.restaurantNumber} onChange={(e)=>setCurrentStore({...currentStore, restaurantNumber: e.target.value})} className="rounded-xl"/></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><Label className="font-bold">رمز الدخول</Label><Input value={currentStore.loginCode} onChange={(e)=>setCurrentStore({...currentStore, loginCode: e.target.value})} className="rounded-xl"/></div>
                    <div className="space-y-1"><Label className="font-bold">نسبة الشركة (%)</Label><div className="relative"><Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary"/><Input type="number" value={currentStore.commissionRate} onChange={(e)=>setCurrentStore({...currentStore, commissionRate: parseFloat(e.target.value) || 0})} className="rounded-xl pl-10"/></div></div>
                </div>
                <div className="space-y-1"><Label className="font-bold">رابط الصورة أو ارفع ملف</Label><div className="flex gap-2"><Input value={currentStore.image} onChange={(e)=>setCurrentStore({...currentStore, image: e.target.value})} className="rounded-xl"/><Button variant="outline" size="icon" className="rounded-xl h-10 w-10" onClick={()=>fileInputRef.current?.click()}><Upload className="h-4 w-4"/></Button></div><input type="file" ref={fileInputRef} className="hidden" onChange={(e)=>{const f=e.target.files?.[0]; if(f){const r=new FileReader(); r.onloadend=()=>setCurrentStore({...currentStore, image: r.result as string}); r.readAsDataURL(f);}}} /></div>
                <div className="space-y-1"><Label className="font-bold">الموقع (Lat, Lng)</Label><div className="flex gap-2"><Input placeholder="Lat" type="number" value={currentStore.latitude || ''} onChange={(e)=>setCurrentStore({...currentStore, latitude: parseFloat(e.target.value)})}/><Input placeholder="Lng" type="number" value={currentStore.longitude || ''} onChange={(e)=>setCurrentStore({...currentStore, longitude: parseFloat(e.target.value)})}/></div></div>
            </div>
            <DialogFooter><Button onClick={handleSave} className="w-full h-14 rounded-2xl text-lg font-black shadow-xl" disabled={isSaving}>{isSaving ? <Loader2 className="animate-spin h-5 w-5"/> : "حفظ بيانات المتجر"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="rounded-[1.5rem] border-none shadow-xl overflow-hidden">
        <Table>
            <TableHeader className="bg-muted/50"><TableRow><TableHead>صورة</TableHead><TableHead>الاسم</TableHead><TableHead>النسبة</TableHead><TableHead>التقييم</TableHead><TableHead>إجراءات</TableHead></TableRow></TableHeader>
            <TableBody>
                {restaurants.map(s => (
                    <TableRow key={s.id}>
                        <TableCell><Image src={s.image} width={40} height={40} className="rounded-lg object-cover" alt={s.name} unoptimized={true}/></TableCell>
                        <TableCell className="font-bold">{s.name}</TableCell>
                        <TableCell className="font-black text-primary">{s.commissionRate}%</TableCell>
                        <TableCell><div className="flex items-center gap-1 text-amber-500"><Star className="h-4 w-4 fill-current"/>{s.rating}</div></TableCell>
                        <TableCell><div className="flex gap-2"><Button variant="outline" size="icon" className="rounded-lg" onClick={()=>{setIsEditing(true); setCurrentStore(s); setOpen(true)}}><Edit className="h-4 w-4"/></Button><Button variant="ghost" size="icon" className="text-destructive" onClick={()=>deleteRestaurant(s.id)}><Trash2 className="h-4 w-4"/></Button></div></TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
      </Card>
    </div>
  );
}
