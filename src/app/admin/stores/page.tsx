
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
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Edit, Trash2, Loader2, MapPin, Upload, Clock, Power, PowerOff, Plus, X } from 'lucide-react';
import type { Restaurant } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import React from 'react';
import { useRestaurants } from '@/hooks/useRestaurants';
import { useCategories } from '@/hooks/useCategories';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { compressImage, cn } from '@/lib/utils';

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
    menuSections: [],
    isManualClosed: false
};

export default function AdminStoresPage({ branchId }: { branchId: string }) {
  const { restaurants, isLoading, addRestaurant, updateRestaurant, deleteRestaurant } = useRestaurants(branchId);
  const { categories } = useCategories();
  const { toast } = useToast();
  
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentStore, setCurrentStore] = useState<Partial<Restaurant> & {image?:string}>({ ...EMPTY_STORE });
  const [isSaving, setIsSaving] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [newSection, setNewSection] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenDialog = (store?: Restaurant) => {
      if (store) {
          setIsEditing(true);
          setCurrentStore({ ...store, menuSections: store.menuSections || [] });
      } else {
          setIsEditing(false);
          setCurrentStore({ ...EMPTY_STORE, branchId, menuSections: [] });
      }
      setNewSection('');
      setOpen(true);
  };

  const addMenuSection = () => {
      if (!newSection.trim()) return;
      const sections = currentStore.menuSections || [];
      if (sections.includes(newSection.trim())) {
          toast({ title: "هذا القسم موجود مسبقاً", variant: "destructive" });
          return;
      }
      setCurrentStore({ ...currentStore, menuSections: [...sections, newSection.trim()] });
      setNewSection('');
  };

  const removeMenuSection = (section: string) => {
      setCurrentStore({
          ...currentStore,
          menuSections: (currentStore.menuSections || []).filter(s => s !== section)
      });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsCompressing(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string);
        setCurrentStore({ ...currentStore, image: compressed });
        setIsCompressing(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFetchLocation = () => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentStore({
            ...currentStore,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          toast({ title: "تم تحديد الموقع بنجاح! 🛰️" });
        },
        () => {
          toast({
            title: "فشل تحديد الموقع",
            variant: "destructive",
          });
        }
      );
    }
  };

  const handleSave = async () => {
    if (!currentStore.name || !currentStore.image || !currentStore.loginCode || !currentStore.restaurantNumber || !currentStore.categoryId) {
        toast({ title: "بيانات ناقصة", description: "يرجى إكمال الاسم، الصورة، الفئة، والرمز السري.", variant: "destructive" }); 
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

  if (isLoading) return <div className="p-20 text-center animate-pulse"><Loader2 className="h-10 w-10 animate-spin text-primary mx-auto"/></div>;

  return (
    <div className="space-y-8 text-right" dir="rtl">
      <header className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-black text-primary">إدارة المتاجر</h1>
            <p className="text-muted-foreground font-bold italic">تحكم في الموقع الجغرافي، الفئات، وحالة المتاجر.</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="rounded-xl h-12 px-6 font-bold shadow-lg">
            إضافة متجر جديد
        </Button>
      </header>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl rounded-[2.5rem] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle className="text-2xl font-black text-right">{isEditing ? 'تعديل المتجر' : 'إنشاء متجر جديد'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4 text-right">
                <div className="flex items-center justify-between p-4 bg-orange-50 border-2 border-dashed border-orange-200 rounded-2xl">
                    <div className="space-y-0.5 text-right">
                        <Label className="font-black text-orange-800">إغلاق يدوي للمتجر</Label>
                        <p className="text-[10px] text-orange-600 font-bold">عند التفعيل، سيظهر المتجر "مغلق" دائماً للزبائن.</p>
                    </div>
                    <Switch checked={currentStore.isManualClosed || false} onCheckedChange={(v) => setCurrentStore({...currentStore, isManualClosed: v})} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <Label className="font-bold">اسم المتجر</Label>
                        <Input value={currentStore.name ?? ''} onChange={(e) => setCurrentStore({ ...currentStore, name: e.target.value })} className="rounded-xl h-12 font-bold" />
                    </div>
                    <div className="space-y-1">
                        <Label className="font-bold">الفئة الرئيسية</Label>
                        <Select value={currentStore.categoryId} onValueChange={(val) => setCurrentStore({...currentStore, categoryId: val})}>
                            <SelectTrigger className="h-12 rounded-xl font-bold">
                                <SelectValue placeholder="اختر الفئة..." />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-4 border-t pt-4">
                    <Label className="font-black text-lg">أقسام المنيو (فئات المنتجات داخل المتجر)</Label>
                    <div className="flex gap-2">
                        <Input 
                            placeholder="مثال: بيتزا، مشويات، مقبلات..." 
                            value={newSection} 
                            onChange={(e) => setNewSection(e.target.value)}
                            className="h-11 rounded-xl font-bold"
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addMenuSection())}
                        />
                        <Button type="button" onClick={addMenuSection} className="rounded-xl h-11 px-4"><Plus className="h-5 w-5"/></Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {currentStore.menuSections?.map((section) => (
                            <Badge key={section} className="h-9 px-4 rounded-xl gap-2 bg-primary/10 text-primary border-none font-bold">
                                {section}
                                <button type="button" onClick={() => removeMenuSection(section)} className="hover:text-destructive">
                                    <X className="h-3.5 w-3.5"/>
                                </button>
                            </Badge>
                        ))}
                        {(!currentStore.menuSections || currentStore.menuSections.length === 0) && (
                            <p className="text-[10px] text-muted-foreground font-bold italic">لا توجد فئات مضافة. أضف فئة لتنظيم وجبات المتجر.</p>
                        )}
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="font-bold">الموقع الجغرافي (لحساب أجور التوصيل)</Label>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <Label className="text-[10px]">خط العرض (Lat)</Label>
                            <Input type="number" step="any" value={currentStore.latitude ?? ''} onChange={(e) => setCurrentStore({...currentStore, latitude: parseFloat(e.target.value)})} className="h-10 rounded-lg font-mono text-xs" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px]">خط الطول (Lng)</Label>
                            <Input type="number" step="any" value={currentStore.longitude ?? ''} onChange={(e) => setCurrentStore({...currentStore, longitude: parseFloat(e.target.value)})} className="h-10 rounded-lg font-mono text-xs" />
                        </div>
                    </div>
                    <Button variant="outline" className="w-full gap-2 rounded-xl h-11 text-xs font-bold" onClick={handleFetchLocation}>
                        <MapPin className="h-4 w-4 text-primary" /> تحديد الموقع من مكاني الحالي
                    </Button>
                </div>

                <div className="space-y-2">
                    <Label className="font-bold">لوغو المتجر</Label>
                    <Button type="button" variant="outline" className="w-full h-14 rounded-xl font-black gap-2 border-dashed border-2" onClick={() => fileInputRef.current?.click()} disabled={isCompressing}>
                        {isCompressing ? <Loader2 className="animate-spin h-5 w-5 ml-2"/> : <Upload className="h-5 w-5" />}
                        {isCompressing ? "جاري تحسين الصورة..." : "اختيار صورة المتجر"}
                    </Button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                    {currentStore.image && (
                        <div className="relative w-24 h-24 mx-auto rounded-full overflow-hidden border-4 border-primary/10 shadow-lg mt-2">
                            <Image src={currentStore.image} fill className="object-cover" alt="preview" unoptimized={true} />
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-2xl border">
                    <div className="space-y-1 text-right">
                        <Label className="font-bold flex items-center gap-1 justify-end"><Clock className="h-3 w-3"/> وقت الفتح</Label>
                        <Input type="time" value={currentStore.openTime} onChange={(e)=>setCurrentStore({...currentStore, openTime: e.target.value})} className="h-11 rounded-xl" />
                    </div>
                    <div className="space-y-1 text-right">
                        <Label className="font-bold flex items-center gap-1 justify-end"><Clock className="h-3 w-3"/> وقت الإغلاق</Label>
                        <Input type="time" value={currentStore.closeTime} onChange={(e)=>setCurrentStore({...currentStore, closeTime: e.target.value})} className="h-11 rounded-xl" />
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                        <Label className="font-bold">الرمز السري</Label>
                        <Input value={currentStore.loginCode ?? ''} onChange={(e) => setCurrentStore({ ...currentStore, loginCode: e.target.value })} className="rounded-xl h-11 text-center font-black" dir="ltr" />
                    </div>
                    <div className="space-y-1">
                        <Label className="font-bold">رقم المتجر</Label>
                        <Input value={currentStore.restaurantNumber ?? ''} onChange={(e) => setCurrentStore({ ...currentStore, restaurantNumber: e.target.value })} className="rounded-xl h-11 text-center" dir="ltr" />
                    </div>
                    <div className="space-y-1">
                        <Label className="font-bold">العمولة %</Label>
                        <Input type="number" value={currentStore.commissionRate || ''} onChange={(e) => setCurrentStore({ ...currentStore, commissionRate: parseInt(e.target.value) })} className="rounded-xl h-11 text-center" />
                    </div>
                </div>
            </div>
            <DialogFooter className="p-4 bg-slate-50 border-t sticky bottom-0">
                <Button onClick={handleSave} className="w-full h-14 rounded-2xl text-lg font-black shadow-xl" disabled={isSaving || isCompressing}>
                    {isSaving ? <Loader2 className="animate-spin h-6 w-6" /> : "حفظ بيانات المتجر"}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="rounded-[1.5rem] border-none shadow-xl overflow-hidden bg-white">
        <Table>
            <TableHeader className="bg-muted/50">
                <TableRow>
                    <TableHead className="font-black text-right">الحالة</TableHead>
                    <TableHead className="font-black text-right">الاسم</TableHead>
                    <TableHead className="font-black text-right">العمولة</TableHead>
                    <TableHead className="font-black text-center">إجراءات</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {restaurants.map((store) => (
                    <TableRow key={store.id}>
                        <TableCell>
                            <Badge variant="outline" className={cn("gap-1 font-black", store.isStoreOpen ? "text-green-600 border-green-200 bg-green-50" : "text-destructive border-destructive/20 bg-red-50")}>
                                {store.isStoreOpen ? <><Power className="h-3 w-3"/> متاح</> : <><PowerOff className="h-3 w-3"/> مغلق</>}
                            </Badge>
                        </TableCell>
                        <TableCell className="font-bold text-right">
                            <div className="flex items-center gap-3 justify-end">
                                <span>{store.name}</span>
                                <div className="relative h-8 w-8 shrink-0"><Image src={store.image} fill className="rounded-full object-cover border shadow-sm" alt="" unoptimized={true} /></div>
                            </div>
                        </TableCell>
                        <TableCell className="font-bold text-primary text-right">{store.commissionRate}%</TableCell>
                        <TableCell>
                            <div className="flex justify-center gap-1">
                                <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-2" onClick={() => handleOpenDialog(store)}><Edit className="h-4 w-4" /></Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive h-9 w-9"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                                    <AlertDialogContent className="rounded-[2.5rem]">
                                        <AlertDialogHeader><AlertDialogTitle className="text-right font-black">حذف المتجر؟</AlertDialogTitle></AlertDialogHeader>
                                        <AlertDialogFooter className="flex-row gap-2">
                                            <AlertDialogCancel className="flex-1 rounded-xl">تراجع</AlertDialogCancel>
                                            <AlertDialogAction onClick={()=>deleteRestaurant(store.id)} className="flex-1 bg-destructive rounded-xl">حذف نهائي</AlertDialogAction>
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
