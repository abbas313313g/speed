
"use client";

import { useContext, useState } from 'react';
import Image from 'next/image';
import { AppContext } from '@/contexts/AppContext';
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
import { Star, Edit, Trash2, Loader2 } from 'lucide-react';
import type { Restaurant } from '@/lib/types';

const EMPTY_STORE: Omit<Restaurant, 'id'> & {image: string} = {
    name: '',
    image: '',
    rating: 0,
};

export default function AdminStoresPage() {
  const context = useContext(AppContext);
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentStore, setCurrentStore] = useState<Partial<Restaurant> & {image?:string}>({ ...EMPTY_STORE });
  const [isSaving, setIsSaving] = useState(false);

  if (!context || context.isLoading) return <div>جار التحميل...</div>;
  const { restaurants, addRestaurant, updateRestaurant, deleteRestaurant } = context;

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
    if (currentStore.name && currentStore.image) {
        setIsSaving(true);
        if (isEditing && currentStore.id) {
            await updateRestaurant(currentStore as Partial<Restaurant> & {id: string, image: string});
        } else if (!isEditing) {
            await addRestaurant({
                ...currentStore,
                image: currentStore.image,
            } as Omit<Restaurant, 'id'> & {image: string});
        }
        setIsSaving(false);
        setOpen(false);
    }
  };

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
            <DialogContent className="sm:max-w-[425px]">
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
                        <Input id="rating" type="number" step="0.1" value={currentStore.rating} onChange={(e) => setCurrentStore({...currentStore, rating: parseFloat(e.target.value) || 0})} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="image" className="text-right">صورة</Label>
                        <Input id="image" type="file" onChange={handleImageUpload} className="col-span-3" accept="image/*" />
                    </div>
                     {currentStore.image && <Image src={currentStore.image} alt="preview" width={100} height={100} className="col-span-4 justify-self-center object-contain"/>}
                </div>
                <DialogFooter>
                    <Button type="submit" onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="ml-2 h-4 w-4 animate-spin"/>}
                        حفظ المتجر
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

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
          {restaurants.map((store) => (
            <TableRow key={store.id}>
              <TableCell>
                <Image src={store.image} alt={store.name} width={40} height={40} className="rounded-md object-cover" />
              </TableCell>
              <TableCell className="font-medium">{store.name}</TableCell>
              <TableCell className="flex items-center gap-1">
                <Star className="h-5 w-5 fill-amber-500 text-amber-500" />
                {store.rating.toFixed(1)}
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
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
