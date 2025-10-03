
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
import { Star, Edit, Trash2, Loader2, MapPin, Upload } from 'lucide-react';
import type { Restaurant } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import React from 'react';
import { useRestaurants } from '@/hooks/useRestaurants';

const EMPTY_STORE: Omit<Restaurant, 'id'> & {image: string} = {
    name: '',
    image: '',
    rating: 0,
    latitude: undefined,
    longitude: undefined,
};

export default function AdminStoresPage() {
  const { restaurants, isLoading, addRestaurant, updateRestaurant, deleteRestaurant } = useRestaurants();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentStore, setCurrentStore] = useState<Partial<Restaurant> & {image?:string}>({ ...EMPTY_STORE });
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  if (isLoading) return <div>جار التحميل...</div>;
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCurrentStore({ ...currentStore, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenDialog = (store?: Restaurant) => {
    if (store) {
        setIsEditing(true);
        setCurrentStore(store);
    } else {
        setIsEditing(false);
        setCurrentStore({ ...EMPTY_STORE });
    }
    setOpen(true);
  };

  const handleSave = async () => {
    if (!currentStore.name || !currentStore.image) {
        toast({ title: "بيانات غير مكتملة", description: "اسم المتجر وصورته مطلوبان.", variant: "destructive" });
        return;
    }

    setIsSaving(true);
    try {
        if (isEditing && currentStore.id) {
            await updateRestaurant(currentStore as Partial<Restaurant> & {id: string});
        } else {
            await addRestaurant(currentStore as Omit<Restaurant, 'id'> & {image: string});
        }
        setOpen(false);
    } catch (error) {
        console.error("Failed to save store:", error);
        toast({ title: "فشل حفظ المتجر", description: "حدث خطأ أثناء محاولة حفظ المتجر.", variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };

  const handleFetchLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentStore({
            ...currentStore,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          toast({ title: "تم تحديد الموقع بنجاح!" });
        },
        () => {
          toast({
            title: "فشل تحديد الموقع",
            description: "الرجاء التأكد من تفعيل خدمة تحديد المواقع.",
            variant: "destructive",
          });
        }
      );
    }
  }

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold">إدارة المتاجر</h1>
            <p className="text-muted-foreground">عرض، إضافة، تعديل، وحذف المتاجر.</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>إضافة متجر جديد</Button>
      </header>

      <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'تعديل المتجر' : 'إضافة متجر جديد'}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">اسم المتجر</Label>
                        <Input id="name" value={currentStore.name} onChange={(e) => setCurrentStore({...currentStore, name: e.target.value})} className="col-span-3" />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="rating" className="text-right">التقييم</Label>
                        <Input id="rating" type="text" inputMode="decimal" step="0.1" value={currentStore.rating || ''} onChange={(e) => setCurrentStore({...currentStore, rating: parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0})} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                         <Label htmlFor="imageUrl" className="text-right">الصورة</Label>
                         <div className="col-span-3 flex gap-2">
                             <Input id="imageUrl" value={currentStore.image} onChange={(e) => setCurrentStore({...currentStore, image: e.target.value})} placeholder="أدخل رابط صورة أو ارفع ملفًا"/>
                             <Button type="button" variant="outline" size="icon" onClick={() => fileInputRef.current?.click()}><Upload className="h-4 w-4"/></Button>
                             <Input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                         </div>
                    </div>
                     {currentStore.image && <Image src={currentStore.image} alt="preview" width={100} height={100} className="col-span-4 justify-self-center object-contain" unoptimized={true} />}

                    <div className="col-span-4 space-y-2">
                        <Label>موقع المتجر (خط العرض والطول)</Label>
                        <div className="grid grid-cols-2 gap-2">
                            <Input placeholder="Latitude" type="number" value={currentStore.latitude || ''} onChange={(e) => setCurrentStore({...currentStore, latitude: parseFloat(e.target.value) || undefined})} />
                            <Input placeholder="Longitude" type="number" value={currentStore.longitude || ''} onChange={(e) => setCurrentStore({...currentStore, longitude: parseFloat(e.target.value) || undefined})} />
                        </div>
                        <Button variant="outline" className="w-full" onClick={handleFetchLocation}><MapPin className="ml-2 h-4 w-4"/>تحديد الموقع الحالي</Button>
                    </div>

                </div>
                <DialogFooter>
                    <Button type="submit" onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="ml-2 h-4 w-4 animate-spin"/>}
                        حفظ المتجر
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        {restaurants.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>صورة</TableHead>
                <TableHead>اسم المتجر</TableHead>
                <TableHead>التقييم</TableHead>
                <TableHead>إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {restaurants.map((store) => {
                const imageUrl = store.image && (store.image.startsWith('http') || store.image.startsWith('data:')) ? store.image : 'https://placehold.co/40x40.png';
                return (
                    <TableRow key={store.id}>
                    <TableCell>
                        <Image src={imageUrl} alt={store.name} width={40} height={40} className="rounded-md object-cover" unoptimized={true} />
                    </TableCell>
                    <TableCell className="font-medium">{store.name}</TableCell>
                    <TableCell>
                        <div className="flex items-center gap-1">
                            <Star className="h-5 w-5 fill-amber-500 text-amber-500" />
                            {store.rating.toFixed(1)}
                        </div>
                    </TableCell>
                    <TableCell>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="icon" onClick={() => handleOpenDialog(store)}>
                                <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="icon">
                                        <Trash2 className="h-4 w-4" />
                                </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            هذا الإجراء سيقوم بحذف المتجر "{store.name}" بشكل نهائي.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => deleteRestaurant(store.id)}>حذف</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </TableCell>
                    </TableRow>
                )
              })}
            </TableBody>
          </Table>
        ) : (
            <p className="text-center text-muted-foreground py-8">لا توجد متاجر لعرضها.</p>
        )}
    </div>
  );
}
