

"use client";

import { useContext, useState, useEffect } from 'react';
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
import { Loader2, Edit, Trash2 } from 'lucide-react';
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

const EMPTY_BANNER: Partial<Banner> & { image: string } = {
  image: '',
  linkType: 'none',
  link: '#',
};

export default function AdminBannersPage() {
  const context = useContext(AppContext);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentBanner, setCurrentBanner] = useState<Partial<Banner> & { image?: string }>({ ...EMPTY_BANNER });

  if (!context || context.isLoading) return <div>جار التحميل...</div>;
  const { banners, addBanner, updateBanner, deleteBanner, products, restaurants } = context;

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
      const reader = new FileReader();
      reader.onloadend = () => {
        setCurrentBanner({ ...currentBanner, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!currentBanner.image) {
      toast({ title: "صورة البنر مطلوبة", description: "الرجاء رفع صورة للبنر.", variant: "destructive" });
      return;
    }
    if (currentBanner.linkType !== 'none' && (!currentBanner.link || currentBanner.link === '#')) {
        toast({ title: "الرابط مطلوب", description: "الرجاء اختيار منتج أو متجر للربط.", variant: "destructive" });
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
      console.error("Failed to save banner:", error);
      toast({ title: "فشل حفظ البنر", description: "حدث خطأ أثناء محاولة حفظ البنر.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">إدارة البنرات</h1>
          <p className="text-muted-foreground">عرض وإضافة بنرات إعلانية جديدة.</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>إضافة بنر جديد</Button>
      </header>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'تعديل البنر' : 'إضافة بنر جديد'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="image" className="text-right">صورة البنر</Label>
              <Input id="image" type="file" onChange={handleImageUpload} className="col-span-3" accept="image/*" />
            </div>
            {currentBanner.image && <Image src={currentBanner.image} alt="preview" width={200} height={100} className="col-span-4 justify-self-center object-contain" unoptimized={true}/>}

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="linkType" className="text-right">نوع الرابط</Label>
              <Select value={currentBanner.linkType} onValueChange={(value: 'none' | 'product' | 'restaurant') => setCurrentBanner({ ...currentBanner, linkType: value, link: '#' })}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="اختر نوع الرابط" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون رابط</SelectItem>
                  <SelectItem value="product">منتج</SelectItem>
                  <SelectItem value="restaurant">متجر</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {currentBanner.linkType === 'product' && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="productLink" className="text-right">المنتج</Label>
                <Select value={currentBanner.link?.split('/')[2]} onValueChange={(value) => setCurrentBanner({ ...currentBanner, link: `/products/${value}` })}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="اختر منتجًا..." />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {currentBanner.linkType === 'restaurant' && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="restaurantLink" className="text-right">المتجر</Label>
                <Select value={currentBanner.link?.split('/')[2]} onValueChange={(value) => setCurrentBanner({ ...currentBanner, link: `/restaurants/${value}` })}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="اختر متجرًا..." />
                  </SelectTrigger>
                  <SelectContent>
                    {restaurants.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'حفظ التعديلات' : 'حفظ البنر'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Table>
        <TableHeader>
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
                <Image src={banner.image} alt="Banner" width={120} height={60} className="rounded-md object-cover" unoptimized={true}/>
              </TableCell>
              <TableCell>{banner.link}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => handleOpenDialog(banner)}>
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
                                    هذا الإجراء سيقوم بحذف البنر بشكل نهائي.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteBanner(banner.id)}>حذف</AlertDialogAction>
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
