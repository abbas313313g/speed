
"use client";

import { useState, useRef, useMemo } from 'react';
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
  discountPrice: 0, // نستخدم 0 بدلاً من undefined
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isLoading = productsLoading || categoriesLoading || restaurantsLoading;

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
        setCurrentProduct({ ...EMPTY_PRODUCT, branchId: branchId || 'main' });
    }
    setOpen(true);
  }

  const handleSaveProduct = async () => {
    if (!currentProduct.name || !currentProduct.price || !currentProduct.categoryId || !currentProduct.restaurantId) {
        toast({ title: "بيانات غير مكتملة", description: "الرجاء اختيار القسم والمتجر وملء الاسم والسعر.", variant: "destructive" });
        return;
    }
    if (!currentProduct.image) {
        toast({ title: "صورة المنتج مطلوبة", variant: "destructive" });
        return;
    }

    setIsSaving(true);
    try {
        const productToSave: any = { 
            ...currentProduct, 
            image: currentProduct.image!, 
            branchId: branchId || 'main',
            status: isEditing ? (currentProduct.status || 'approved') : 'approved',
            price: Number(currentProduct.price),
            wholesalePrice: Number(currentProduct.wholesalePrice) || 0,
            stock: Number(currentProduct.stock) || 0
        };

        // إزالة حقل الخصم إذا لم تكن هناك قيمة حقيقية لتجنب مشاكل الفايربيس
        if (!productToSave.discountPrice || Number(productToSave.discountPrice) <= 0) {
            delete productToSave.discountPrice;
        } else {
            productToSave.discountPrice = Number(productToSave.discountPrice);
        }
        
        if (isEditing && currentProduct.id) {
            await updateProduct(productToSave);
        } else {
            await addProduct(productToSave);
        }
        setOpen(false);
        setCurrentProduct({ ...EMPTY_PRODUCT });
    } catch (error) {
        toast({ title: "فشل حفظ المنتج", variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center animate-pulse font-black text-primary">جارِ تحميل المنتجات...</div>;

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-black text-primary">إدارة المنتجات</h1>
            <p className="text-muted-foreground font-bold">عرض وتعديل منتجات فرع: {branchId === 'main' ? 'الإدارة الرئيسية' : branchId}</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="rounded-xl h-12 px-6 font-bold shadow-lg">
            إضافة منتج جديد
        </Button>
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
                        <Label className="text-right font-bold">سعر البيع (IQD)</Label>
                        <Input type="number" value={currentProduct.price ?? ''} onChange={(e) => setCurrentProduct({...currentProduct, price: parseFloat(e.target.value) || 0})} className="col-span-3 rounded-xl" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right font-bold">السعر بعد الخصم (اختياري)</Label>
                        <Input type="number" value={currentProduct.discountPrice || ''} onChange={(e) => setCurrentProduct({...currentProduct, discountPrice: parseFloat(e.target.value) || 0})} className="col-span-3 rounded-xl" placeholder="اتركه 0 إذا لا يوجد خصم" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right font-bold">سعر الجملة (IQD)</Label>
                        <Input type="number" value={currentProduct.wholesalePrice ?? ''} onChange={(e) => setCurrentProduct({...currentProduct, wholesalePrice: parseFloat(e.target.value) || 0})} className="col-span-3 rounded-xl" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right font-bold">الكمية في المخزن</Label>
                        <Input type="number" value={currentProduct.stock ?? ''} onChange={(e) => setCurrentProduct({...currentProduct, stock: parseInt(e.target.value) || 0})} className="col-span-3 rounded-xl" />
                    </div>
                    
                    <div className="grid grid-cols-4 items-center gap-4">
                         <Label className="text-right font-bold">القسم</Label>
                         <Select value={currentProduct.categoryId} onValueChange={(value) => setCurrentProduct({...currentProduct, categoryId: value})}>
                            <SelectTrigger className="col-span-3 rounded-xl">
                                <SelectValue placeholder="اختر قسم..." />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                {categories.length === 0 && <div className="p-2 text-xs text-muted-foreground">لا توجد أقسام! أضف قسماً أولاً.</div>}
                            </SelectContent>
                        </Select>
                    </div>
                    
                    <div className="grid grid-cols-4 items-center gap-4">
                         <Label className="text-right font-bold">المتجر</Label>
                         <Select value={currentProduct.restaurantId} onValueChange={(value) => setCurrentProduct({...currentProduct, restaurantId: value})}>
                            <SelectTrigger className="col-span-3 rounded-xl">
                                <SelectValue placeholder="اختر متجر..." />
                            </SelectTrigger>
                            <SelectContent>
                                {restaurants.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                                {restaurants.length === 0 && <div className="p-2 text-xs text-muted-foreground">لا توجد متاجر! أضف متجراً أولاً.</div>}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right font-bold">الوصف</Label>
                        <Input value={currentProduct.description ?? ''} onChange={(e) => setCurrentProduct({...currentProduct, description: e.target.value})} className="col-span-3 rounded-xl" />
                    </div>

                     <div className="grid grid-cols-4 items-center gap-4">
                         <Label className="text-right font-bold">الصورة</Label>
                         <div className="col-span-3 flex gap-2">
                             <Input value={currentProduct.image ?? ''} onChange={(e) => setCurrentProduct({...currentProduct, image: e.target.value})} className="rounded-xl" placeholder="رابط أو ارفع ملف..."/>
                             <Button type="button" variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} className="rounded-xl shrink-0"><Upload className="h-4 w-4"/></Button>
                             <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                         </div>
                    </div>
                    {currentProduct.image && <div className="col-span-4 flex justify-center"><Image src={currentProduct.image} alt="preview" width={100} height={100} className="rounded-xl border object-contain" unoptimized={true}/></div>}
                </div>
                <DialogFooter>
                    <Button onClick={handleSaveProduct} disabled={isSaving} className="w-full h-14 rounded-2xl text-lg font-black shadow-xl">
                        {isSaving ? <Loader2 className="animate-spin h-5 w-5"/> : "حفظ المنتج ونشره"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <div className="bg-white rounded-[1.5rem] border shadow-xl overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>صورة</TableHead>
                <TableHead>المنتج</TableHead>
                <TableHead>السعر</TableHead>
                <TableHead>المخزن</TableHead>
                <TableHead>المتجر</TableHead>
                <TableHead>إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id} className="hover:bg-muted/20">
                  <TableCell>
                    <Image src={product.image || 'https://placehold.co/40x40.png'} alt={product.name} width={40} height={40} className="rounded-lg object-cover" unoptimized={true}/>
                  </TableCell>
                  <TableCell className="font-bold">{product.name}</TableCell>
                  <TableCell className="font-black text-primary">{formatCurrency(product.price)}</TableCell>
                  <TableCell className="font-bold">{product.stock}</TableCell>
                  <TableCell className="text-[10px] font-bold text-muted-foreground">{restaurants.find(r => r.id === product.restaurantId)?.name || '-'}</TableCell>
                  <TableCell>
                      <div className="flex items-center gap-2">
                          <Button variant="outline" size="icon" onClick={() => handleOpenDialog(product)} className="rounded-lg h-8 w-8"><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteProduct(product.id)} className="text-destructive h-8 w-8"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {products.length === 0 && <div className="p-20 text-center text-muted-foreground italic font-bold bg-muted/5">لا توجد منتجات مضافة لهذا الفرع بعد.</div>}
      </div>
    </div>
  );
}
