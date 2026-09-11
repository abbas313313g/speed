
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
import { Loader2, Edit, Trash2, Upload, Store } from 'lucide-react';
import type { Banner } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  const { restaurants } = useRestaurants();
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
        const compressed = await compressImage(reader.result as string, 1200, 0.6); 
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
          <h1 className="text-3xl font-bold text-primary">إدارة البنرات</h1>
          <p className="text-muted-foreground font-bold">يمكنك ربط البنر بمتجر معين ليفتحه الزبون بضغطة واحدة.</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="rounded-xl h-12 px-6">إضافة بنر</Button>
      </header>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-right">{isEditing ? 'تعديل البنر' : 'إضافة بنر جديد'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 text-right">
             <div className="space-y-2">
              <Label className="font-bold">صورة الإعلان (ضغط تلقائي ⚡)</Label>
              <Button type="button" variant="outline" className="w-full h-14 rounded-xl border-dashed border-2" onClick={() => fileInputRef.current?.click()} disabled={isCompressing}>
                  {isCompressing ? <Loader2 className="animate-spin h-4 w-4 ml-2"/> : <Upload className="ml-2 h-4 w-4"/>}
                  {isCompressing ? "جاري تحسين الصورة..." : "اختر من الملفات"}
              </Button>
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
            </div>

            {currentBanner.image && <div className="relative aspect-video rounded-2xl overflow-hidden border-2 border-primary/10 shadow-sm"><Image src={currentBanner.image} alt="preview" fill className="object-cover" unoptimized={true}/></div>}

            <div className="space-y-4 pt-2">
              <div className="space-y-1">
                <Label className="font-bold">نوع الربط</Label>
                <Select value={currentBanner.linkType} onValueChange={(value: any) => setCurrentBanner({ ...currentBanner, linkType: value, link: '#' })}>
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue placeholder="اختر ماذا يفتح البنر" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">مجرد صورة (بدون رابط)</SelectItem>
                    <SelectItem value="restaurant">يفتح متجر محدد</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {currentBanner.linkType === 'restaurant' && (
                <div className="space-y-1 p-4 bg-primary/5 rounded-2xl border-2 border-dashed border-primary/20 animate-in zoom-in">
                    <Label className="font-black text-primary flex items-center gap-1 justify-end">اختر المتجر <Store className="h-3 w-3"/></Label>
                    <Select value={currentBanner.link} onValueChange={(val) => setCurrentBanner({...currentBanner, link: val})}>
                        <SelectTrigger className="h-11 rounded-xl bg-white border-primary/20 font-bold">
                            <SelectValue placeholder="اختر من القائمة..." />
                        </SelectTrigger>
                        <SelectContent>
                            {restaurants.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="bg-slate-50 p-4 border-t sticky bottom-0">
            <Button onClick={handleSave} disabled={isSaving || isCompressing} className="w-full h-14 rounded-2xl text-xl font-black shadow-xl">
              {isSaving ? <Loader2 className="animate-spin h-5 w-5" /> : 'حفظ البنر ونشره'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="bg-white rounded-[2rem] border-none shadow-xl overflow-hidden">
        <Table>
            <TableHeader className="bg-muted/50 h-14">
              <TableRow>
                <TableHead className="font-black text-right">صورة الإعلان</TableHead>
                <TableHead className="font-black text-right">الرابط / الوجهة</TableHead>
                <TableHead className="font-black text-center">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {banners.map((banner) => (
                <TableRow key={banner.id} className="h-20">
                  <TableCell>
                    <div className="relative h-14 w-28 rounded-xl overflow-hidden border shadow-sm"><Image src={banner.image} alt="" fill className="object-cover" unoptimized={true}/></div>
                  </TableCell>
                  <TableCell>
                    {banner.linkType === 'restaurant' ? (
                        <Badge className="bg-primary/10 text-primary border-none gap-1 font-black">
                            <Store className="h-3 w-3"/>
                            {restaurants.find(r => r.id === banner.link)?.name || 'متجر'}
                        </Badge>
                    ) : <span className="text-[10px] text-muted-foreground font-bold">لا يوجد رابط</span>}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center gap-2">
                        <Button variant="outline" size="icon" onClick={() => handleOpenDialog(banner)} className="rounded-xl h-10 w-10 border-2"><Edit className="h-4 w-4 text-primary" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteBanner(banner.id)} className="text-destructive h-10 w-10 bg-destructive/5"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {banners.length === 0 && <TableRow><TableCell colSpan={3} className="py-20 text-center text-muted-foreground font-bold italic">لا توجد بنرات إعلانية حالياً.</TableCell></TableRow>}
            </TableBody>
          </Table>
      </div>
    </div>
  );
}
