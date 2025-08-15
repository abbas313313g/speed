
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Star } from 'lucide-react';

export default function AdminStoresPage() {
  const context = useContext(AppContext);
  const [open, setOpen] = useState(false);
  const [newStore, setNewStore] = useState({
      name: '',
      image: '',
      rating: 0,
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewStore({ ...newStore, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (context && newStore.name) {
        context.addRestaurant({
            ...newStore,
            image: newStore.image || 'https://placehold.co/400x300.png',
        });
        setOpen(false);
        setNewStore({ name: '', image: '', rating: 0 });
    }
  };

  if (!context) return null;

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold">إدارة المتاجر</h1>
            <p className="text-muted-foreground">عرض وإضافة متاجر جديدة.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>إضافة متجر جديد</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>إضافة متجر جديد</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">اسم المتجر</Label>
                        <Input id="name" value={newStore.name} onChange={(e) => setNewStore({...newStore, name: e.target.value})} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="image" className="text-right">صورة</Label>
                        <Input id="image" type="file" onChange={handleImageUpload} className="col-span-3" accept="image/*" />
                    </div>
                     {newStore.image && <Image src={newStore.image} alt="preview" width={100} height={100} className="col-span-4 justify-self-center"/>}
                </div>
                <DialogFooter>
                    <Button type="submit" onClick={handleSave}>حفظ المتجر</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </header>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>صورة</TableHead>
            <TableHead>اسم المتجر</TableHead>
            <TableHead>التقييم</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {context.restaurants.map((store) => (
            <TableRow key={store.id}>
              <TableCell>
                <Image src={store.image} alt={store.name} width={40} height={40} className="rounded-md object-cover" />
              </TableCell>
              <TableCell className="font-medium">{store.name}</TableCell>
              <TableCell className="flex items-center gap-1">
                <Star className="h-5 w-5 fill-amber-500 text-amber-500" />
                {store.rating}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
