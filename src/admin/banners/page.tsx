
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
import { Loader2 } from 'lucide-react';
import type { Banner } from '@/lib/types';

export default function AdminBannersPage() {
  const context = useContext(AppContext);
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newBanner, setNewBanner] = useState({
      image: '',
      link: '#',
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewBanner({ ...newBanner, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (context && newBanner.image) {
        setIsSaving(true);
        await context.addBanner(newBanner as Omit<Banner, 'id'> & {image: string});
        setIsSaving(false);
        setOpen(false);
        setNewBanner({ image: '', link: '#' });
    }
  };

  if (!context || context.isLoading) return <div>جار التحميل...</div>;

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold">إدارة البنرات</h1>
            <p className="text-muted-foreground">عرض وإضافة بنرات إعلانية جديدة.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>إضافة بنر جديد</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>إضافة بنر جديد</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="image" className="text-right">صورة البنر</Label>
                        <Input id="image" type="file" onChange={handleImageUpload} className="col-span-3" accept="image/*" />
                    </div>
                     {newBanner.image && <Image src={newBanner.image} alt="preview" width={200} height={100} className="col-span-4 justify-self-center object-contain"/>}
                </div>
                <DialogFooter>
                    <Button type="submit" onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="ml-2 h-4 w-4 animate-spin"/>}
                        حفظ البنر
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </header>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>صورة</TableHead>
            <TableHead>رابط</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {context.banners.map((banner) => (
            <TableRow key={banner.id}>
              <TableCell>
                <Image src={banner.image} alt="Banner" width={120} height={60} className="rounded-md object-cover" />
              </TableCell>
              <TableCell>{banner.link}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
