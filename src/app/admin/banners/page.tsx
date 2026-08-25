
"use client";

import React, { useState, useRef } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Edit, Trash2, Upload } from 'lucide-react';
import type { Banner } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
} from "@/components/ui/alert-dialog";
import { useBanners } from '@/hooks/useBanners';
import { useProducts } from '@/hooks/useProducts';
import { useRestaurants } from '@/hooks/useRestaurants';
import { compressImage } from '@/lib/utils';


const EMPTY_BANNER: Partial<Banner> & { image: string } = {
  image: '',
  linkType: 'none',
  link: '#',
};

export default function AdminBannersPage() {
  const { banners, isLoading: bannersLoading, addBanner, updateBanner, deleteBanner } = useBanners();
  const { toast } = useToast();
  
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentBanner, setCurrentBanner] = useState<Partial<Banner> & { image?: string }>({ ...EMPTY_BANNER });
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleOpenDialog = (banner?: Banner) => {
    if (banner) {
      setIsEditing(true);
      setCurrentBanner(banner);
    } else {
      setIsEditing(false);
      setCurrentBanner({ ...EMPTY_BANNER });
    }
    setOpen(true);
  };
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsCompressing(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string, 1200, 0.6); // ضغط أكبر للبنرات لأنها عريضة
        setCurrentBanner({ ...currentBanner, image: compressed });
        setIsCompressing(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!currentBanner.image) {
      toast({ title: "صورة البنر مطلوبة", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      if (isEditing && currentBanner.id) {
        await updateBanner(currentBanner as Banner);
      } else {
        await addBanner(currentBanner as Omit<Banner, 'id'> & { image: string });
      }
      setOpen(false);
    } catch (error) {
    } finally {
      setIsSaving(false);
    }
  };

  if (bannersLoading) return <div className="p-8 text-center animate-pulse">جارِ تحميل البنرات...</div>;

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">إدارة البنرات</h1>
          <p className="text-muted-foreground">البنرات تُضغط تلقائياً لتقليل استهلاك مساحة قاعدة البيانات.</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>إضافة بنر</Button>
      </header>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-[2rem]">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'تعديل البنر' : 'إضافة بنر جديد'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 text-right">
             <div className="space-y-2">
              <Label>صورة الإعلان (ضغط تلقائي ⚡)</Label>
              <Button type="button" variant="outline" className="w-full h-14 rounded-xl border-dashed" onClick={() => fileInputRef.current?.click()} disabled={isCompressing}>
                  {isCompressing ? <Loader2 className="animate-spin h-4 w-4 ml-2"/> : <Upload className="ml-2 h-4 w-4"/>}
                  {isCompressing ? "جاري ضغط الصورة..." : "اختر من الملفات"}
              </Button>
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
            </div>

            {currentBanner.image && <div className="relative aspect-video rounded-2xl overflow-hidden border-2 border-primary/10"><Image src={currentBanner.image} alt="preview" fill className="object-cover" unoptimized={true}/></div>}

            <div className="space-y-2">
              <Label>نوع الربط</Label>
              <Select value={currentBanner.linkType} onValueChange={(value: 'none' | 'product' | 'restaurant') => setCurrentBanner({ ...currentBanner, linkType: value, link: '#' })}>
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue placeholder="اختر النوع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون رابط</SelectItem>
                  <SelectItem value="product">منتج</SelectItem>
                  <SelectItem value="restaurant">متجر</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} disabled={isSaving || isCompressing} className="w-full h-14 rounded-2xl text-lg font-black shadow-xl">
              {isSaving ? <Loader2 className="animate-spin h-5 w-5" /> : 'حفظ البنر'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="bg-white rounded-[1.5rem] border shadow-xl overflow-hidden">
        <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>صورة</TableHead>
                <TableHead>الرابط</TableHead>
                <TableHead>إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {banners.map((banner) => (
                <TableRow key={banner.id}>
                  <TableCell>
                    <div className="relative h-14 w-28"><Image src={banner.image} alt="" fill className="rounded-lg object-cover" unoptimized={true}/></div>
                  </TableCell>
                  <TableCell className="text-xs font-bold">{banner.link}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                        <Button variant="outline" size="icon" onClick={() => handleOpenDialog(banner)} className="rounded-lg h-9 w-9"><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteBanner(banner.id)} className="text-destructive h-9 w-9"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
      </div>
    </div>
  );
}
