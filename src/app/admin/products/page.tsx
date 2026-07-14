
"use client";

import { useState, useRef } from 'react';
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
  DialogDescription,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import Image from 'next/image';
import { Edit, Trash2, PlusCircle, X, Upload } from 'lucide-react';
import type { Product, ProductSize } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import React from 'react';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { useRestaurants } from '@/hooks/useRestaurants';

const EMPTY_PRODUCT: Omit<Product, 'id'> & {image: string} = {
  name: '',
  price: 0,
  wholesalePrice: 0,
  discountPrice: undefined,
  sizes: [],
  stock: 0,
  description: '',
  image: '',
  categoryId: '',
  restaurantId: '',
  status: 'approved',
  branchId: 'main'
};

export default function AdminProductsPage({ branchId }: { branchId: string }) {
  const { products, isLoading: productsLoading, addProduct, updateProduct, deleteProduct } = useProducts(branchId);
  const { categories, isLoading: categoriesLoading } = useCategories();
  const { restaurants, isLoading: restaurantsLoading } = useRestaurants(branchId);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<Product> & {image?: string}>({ ...EMPTY_PRODUCT });
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const isLoading = productsLoading || categoriesLoading || restaurantsLoading;
  
  if (isLoading) return <div className="p-8 text-center animate-pulse">جار التحميل...</div>;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCurrentProduct({ ...currentProduct, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenDialog = (product?: Product) => {
    if (product) {
        setIsEditing(true);
        setCurrentProduct(product);
    } else {
        setIsEditing(false);
        setCurrentProduct({ ...EMPTY_PRODUCT, branchId });
    }
    setOpen(true);
  }

  const handleSaveProduct = async () => {
    if (!currentProduct.name || !currentProduct.price || !currentProduct.categoryId || !currentProduct.restaurantId) {
        toast({ title: "بيانات غير مكتملة", description: "الرجاء ملء جميع الحقول المطلوبة.", variant: "destructive" });
        return;
    }
    if (!currentProduct.image) {
        toast({ title: "صورة المنتج مطلوبة", description: "الرجاء رفع صورة للمنتج.", variant: "destructive" });
        return;
    }

    const productToSave: Partial<Product> & {image: string} = {
        ...currentProduct,
        image: currentProduct.image!,
        branchId: branchId,
        sizes: currentProduct.sizes?.filter(s => s.name && s.price > 0) || [],
        stock: currentProduct.stock || 0,
    }

    if (!productToSave.discountPrice || productToSave.discountPrice <= 0) {
        delete productToSave.discountPrice;
    }

    setIsSaving(true);
    try {
        if (isEditing && currentProduct.id) {
            await updateProduct(productToSave as any);
        } else {
            await addProduct(productToSave as any);
        }
        setOpen(false);
    } catch (error) {
        toast({ title: "فشل حفظ المنتج", variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-black text-primary">إدارة المنتجات</h1>
            <p className="text-muted-foreground font-bold">عرض وتعديل منتجات الفرع الحالي فقط.</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="rounded-xl">إضافة منتج جديد</Button>
      </header>

      <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2.5rem]">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black">{isEditing ? 'تعديل المنتج' : 'إضافة منتج جديد'}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4 text-right">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right font-bold">الاسم</Label>
                        <Input value={currentProduct.name ?? ''} onChange={(e) => setCurrentProduct({...currentProduct, name: e.target.value})} className="col-span-3 rounded-xl" />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right font-bold">سعر البيع</Label>
                        <Input type="number" value={currentProduct.price ?? ''} onChange={(e) => setCurrentProduct({...currentProduct, price: parseFloat(e.target.value) || 0})} className="col-span-3 rounded-xl" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right font-bold">سعر الجملة</Label>
                        <Input type="number" value={currentProduct.wholesalePrice ?? ''} onChange={(e) => setCurrentProduct({...currentProduct, wholesalePrice: parseFloat(e.target.value) || 0})} className="col-span-3 rounded-xl" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right font-bold">الكمية</Label>
                        <Input type="number" value={currentProduct.stock ?? ''} onChange={(e) => setCurrentProduct({...currentProduct, stock: parseInt(e.target.value) || 0})} className="col-span-3 rounded-xl" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right font-bold">الوصف</Label>
                        <Input value={currentProduct.description ?? ''} onChange={(e) => setCurrentProduct({...currentProduct, description: e.target.value})} className="col-span-3 rounded-xl" />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                         <Label className="text-right font-bold">الصورة</Label>
                         <div className="col-span-3 flex gap-2">
                             <Input value={currentProduct.image ?? ''} onChange={(e) => setCurrentProduct({...currentProduct, image: e.target.value})} className="rounded-xl"/>
                             <Button type="button" variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} className="rounded-xl"><Upload className="h-4 w-4"/></Button>
                             <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                         </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                         <Label className="text-right font-bold">القسم</Label>
                         <Select value={currentProduct.categoryId} onValueChange={(value) => setCurrentProduct({...currentProduct, categoryId: value})}>
                            <SelectTrigger className="col-span-3 rounded-xl">
                                <SelectValue placeholder="اختر قسم" />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                         <Label className="text-right font-bold">المتجر</Label>
                         <Select value={currentProduct.restaurantId} onValueChange={(value) => setCurrentProduct({...currentProduct, restaurantId: value})}>
                            <SelectTrigger className="col-span-3 rounded-xl">
                                <SelectValue placeholder="اختر المتجر" />
                            </SelectTrigger>
                            <SelectContent>
                                {restaurants.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleSaveProduct} disabled={isSaving} className="w-full h-14 rounded-2xl text-lg font-black">
                        {isSaving ? <Loader2 className="animate-spin h-5 w-5"/> : "حفظ المنتج"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <div className="bg-white rounded-[1.5rem] border shadow-xl overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>صورة</TableHead>
                <TableHead>اسم المنتج</TableHead>
                <TableHead>السعر</TableHead>
                <TableHead>المخزن</TableHead>
                <TableHead>المتجر</TableHead>
                <TableHead>إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <Image src={product.image || 'https://placehold.co/40x40.png'} alt={product.name} width={40} height={40} className="rounded-lg object-cover" unoptimized={true}/>
                  </TableCell>
                  <TableCell className="font-bold">{product.name}</TableCell>
                  <TableCell className="font-black text-primary">{formatCurrency(product.price)}</TableCell>
                  <TableCell className="font-bold">{product.stock}</TableCell>
                  <TableCell className="text-xs font-bold">{restaurants.find(r => r.id === product.restaurantId)?.name || '-'}</TableCell>
                  <TableCell>
                      <div className="flex items-center gap-2">
                          <Button variant="outline" size="icon" onClick={() => handleOpenDialog(product)} className="rounded-lg"><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteProduct(product.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {products.length === 0 && <div className="p-20 text-center text-muted-foreground italic font-bold">لا توجد منتجات لهذا الفرع.</div>}
      </div>
    </div>
  );
}
