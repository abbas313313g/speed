
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
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency, cn } from '@/lib/utils';
import Image from 'next/image';
import { Edit, Trash2, PlusCircle, X, Upload, Eye, EyeOff, Plus, Tag } from 'lucide-react';
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
  discountPrice: 0,
  sizes: [],
  stock: 0,
  description: '',
  image: '',
  categoryId: '',
  restaurantId: '',
  status: 'approved',
  branchId: 'main',
  isActive: true,
  isUnlimitedStock: false
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

  const handleAddSize = () => {
      const sizes = [...(currentProduct.sizes || [])];
      sizes.push({ name: '', price: 0, stock: 0, isUnlimited: false, isActive: true });
      setCurrentProduct({ ...currentProduct, sizes });
  }

  const handleRemoveSize = (index: number) => {
      const sizes = [...(currentProduct.sizes || [])];
      sizes.splice(index, 1);
      setCurrentProduct({ ...currentProduct, sizes });
  }

  const handleSizeChange = (index: number, field: keyof ProductSize, value: any) => {
      const sizes = [...(currentProduct.sizes || [])];
      sizes[index] = { ...sizes[index], [field]: value };
      setCurrentProduct({ ...currentProduct, sizes });
  }

  const handleSaveProduct = async () => {
    if (!currentProduct.name || !currentProduct.categoryId || !currentProduct.restaurantId) {
        toast({ title: "بيانات ناقصة", variant: "destructive" });
        return;
    }
    
    const hasSizes = currentProduct.sizes && currentProduct.sizes.length > 0;
    if (!hasSizes && !currentProduct.price) {
         toast({ title: "السعر مطلوب", description: "يجب وضع سعر أو إضافة أحجام.", variant: "destructive" });
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
            price: Number(currentProduct.price) || 0,
            wholesalePrice: Number(currentProduct.wholesalePrice) || 0,
            discountPrice: Number(currentProduct.discountPrice) || 0,
            stock: currentProduct.isUnlimitedStock ? 999999 : (Number(currentProduct.stock) || 0),
            isActive: currentProduct.isActive ?? true,
            isUnlimitedStock: currentProduct.isUnlimitedStock ?? false,
            sizes: currentProduct.sizes?.map(s => ({
                name: s.name,
                price: Number(s.price),
                stock: s.isUnlimited ? 999999 : (Number(s.stock) || 0),
                isUnlimited: !!s.isUnlimited,
                isActive: s.isActive ?? true
            })) || []
        };

        if (isEditing && currentProduct.id) {
            await updateProduct(productToSave);
        } else {
            await addProduct(productToSave);
        }
        setOpen(false);
        setCurrentProduct({ ...EMPTY_PRODUCT });
    } catch (error) {
        console.error("Save product error:", error);
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
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col rounded-[2.5rem] p-0 border-none shadow-2xl">
                <DialogHeader className="p-6 pb-2 border-b bg-card shrink-0">
                    <DialogTitle className="text-2xl font-black text-primary">{isEditing ? 'تعديل المنتج' : 'إضافة منتج جديد'}</DialogTitle>
                </DialogHeader>
                
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
                    <div className="space-y-6 text-right pb-10">
                        <div className="space-y-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right font-bold">اسم المنتج</Label>
                                <Input value={currentProduct.name ?? ''} onChange={(e) => setCurrentProduct({...currentProduct, name: e.target.value})} className="col-span-3 rounded-xl h-11" placeholder="مثال: بيتزا دجاج" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="font-bold pr-1 text-xs">القسم</Label>
                                    <Select value={currentProduct.categoryId} onValueChange={(value) => setCurrentProduct({...currentProduct, categoryId: value})}>
                                        <SelectTrigger className="rounded-xl h-11">
                                            <SelectValue placeholder="اختر قسم..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="font-bold pr-1 text-xs">المتجر</Label>
                                    <Select value={currentProduct.restaurantId} onValueChange={(value) => setCurrentProduct({...currentProduct, restaurantId: value})}>
                                        <SelectTrigger className="rounded-xl h-11">
                                            <SelectValue placeholder="اختر متجر..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {restaurants.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <Separator className="opacity-50" />

                        <div className="space-y-4 bg-muted/20 p-5 rounded-[2rem] border-2 border-dashed border-primary/20">
                            <div className="flex justify-between items-center mb-2">
                                <Label className="font-black text-lg text-primary">الأسعار والتوفر</Label>
                                <Button type="button" variant="outline" size="sm" className="rounded-lg gap-2 border-primary/40 text-primary font-bold h-9" onClick={handleAddSize}>
                                    <Plus className="h-4 w-4" /> إضافة حجم/نوع
                                </Button>
                            </div>
                            
                            {currentProduct.sizes && currentProduct.sizes.length > 0 ? (
                                <div className="space-y-3">
                                    {currentProduct.sizes.map((size, idx) => (
                                        <div key={idx} className="flex flex-col gap-2 bg-white p-3 rounded-2xl shadow-sm border">
                                            <div className="grid grid-cols-12 gap-2 items-center">
                                                <div className="col-span-5 space-y-1">
                                                    <Label className="text-[10px] font-bold text-muted-foreground mr-1">الاسم (مثلاً: كبير)</Label>
                                                    <Input placeholder="كبير" value={size.name} onChange={(e) => handleSizeChange(idx, 'name', e.target.value)} className="h-10 text-sm rounded-xl" />
                                                </div>
                                                <div className="col-span-3 space-y-1">
                                                    <Label className="text-[10px] font-bold text-muted-foreground mr-1">السعر</Label>
                                                    <Input type="number" placeholder="0" value={size.price || ''} onChange={(e) => handleSizeChange(idx, 'price', e.target.value)} className="h-10 text-sm rounded-xl" />
                                                </div>
                                                <div className="col-span-3 space-y-1">
                                                    <Label className="text-[10px] font-bold text-muted-foreground mr-1">المخزن</Label>
                                                    <Input type="number" disabled={size.isUnlimited} placeholder="0" value={size.isUnlimited ? '' : (size.stock || '')} onChange={(e) => handleSizeChange(idx, 'stock', e.target.value)} className="h-10 text-sm rounded-xl" />
                                                </div>
                                                <div className="col-span-1 flex justify-center pt-5">
                                                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 rounded-xl" onClick={() => handleRemoveSize(idx)}>
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between px-1">
                                                <div className="flex items-center gap-2">
                                                    <Switch checked={size.isActive ?? true} onCheckedChange={(val) => handleSizeChange(idx, 'isActive', val)} className="scale-75" />
                                                    <span className="text-[10px] font-black">نشط</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Switch checked={size.isUnlimited} onCheckedChange={(val) => handleSizeChange(idx, 'isUnlimited', val)} className="scale-75" />
                                                    <span className="text-[10px] font-black text-primary">كمية مفتوحة</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <Label className="font-bold text-xs pr-1">سعر البيع الأساسي (IQD)</Label>
                                            <Input type="number" value={currentProduct.price || ''} onChange={(e) => setCurrentProduct({...currentProduct, price: parseFloat(e.target.value) || 0})} className="rounded-xl h-11 font-black" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="font-bold text-xs pr-1 text-primary flex items-center gap-1"><Tag className="h-3 w-3"/> السعر بعد الخصم</Label>
                                            <Input type="number" value={currentProduct.discountPrice || ''} onChange={(e) => setCurrentProduct({...currentProduct, discountPrice: parseFloat(e.target.value) || 0})} className="rounded-xl h-11 font-black text-primary border-primary/30" placeholder="اختياري..." />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <Label className="font-bold text-xs pr-1">سعر الجملة</Label>
                                            <Input type="number" value={currentProduct.wholesalePrice || ''} onChange={(e) => setCurrentProduct({...currentProduct, wholesalePrice: parseFloat(e.target.value) || 0})} className="rounded-xl h-11 text-muted-foreground" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="font-bold text-xs pr-1">الكمية المتوفرة</Label>
                                            <div className="flex items-center gap-4 bg-white p-2 rounded-xl border shadow-inner h-11">
                                                <Input 
                                                    type="number" 
                                                    disabled={currentProduct.isUnlimitedStock}
                                                    value={currentProduct.isUnlimitedStock ? '' : (currentProduct.stock ?? '')} 
                                                    onChange={(e) => setCurrentProduct({...currentProduct, stock: parseInt(e.target.value) || 0})} 
                                                    className="border-none shadow-none flex-1 h-8" 
                                                    placeholder={currentProduct.isUnlimitedStock ? "مفتوح" : "عدد القطع"}
                                                />
                                                <div className="flex items-center gap-1 border-r pr-2">
                                                    <Switch 
                                                        checked={currentProduct.isUnlimitedStock} 
                                                        onCheckedChange={(val) => setCurrentProduct({...currentProduct, isUnlimitedStock: val})} 
                                                        className="scale-75"
                                                    />
                                                    <span className="text-[9px] font-black">مفتوح</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <Separator className="opacity-50" />

                        <div className="space-y-4">
                            <div className="space-y-1">
                                <Label className="font-bold pr-1">وصف المنتج</Label>
                                <Input value={currentProduct.description ?? ''} onChange={(e) => setCurrentProduct({...currentProduct, description: e.target.value})} className="rounded-xl h-11" placeholder="اكتب تفاصيل المكونات أو الحجم..." />
                            </div>

                            <div className="space-y-2">
                                <Label className="font-bold pr-1">صورة المنتج</Label>
                                <div className="flex gap-2">
                                    <Input value={currentProduct.image ?? ''} onChange={(e) => setCurrentProduct({...currentProduct, image: e.target.value})} className="rounded-xl h-11" placeholder="رابط الصورة المباشر أو ارفع من جهازك..."/>
                                    <Button type="button" variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} className="rounded-xl h-11 w-12 shrink-0 border-primary text-primary">
                                        <Upload className="h-5 w-5"/>
                                    </Button>
                                    <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                                </div>
                                
                                {currentProduct.image && (
                                    <div className="relative w-full aspect-video rounded-3xl overflow-hidden border-2 border-muted bg-muted/10 group">
                                        <Image src={currentProduct.image} alt="preview" fill className="object-contain" unoptimized={true}/>
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Button variant="destructive" size="sm" className="rounded-xl" onClick={() => setCurrentProduct({...currentProduct, image: ''})}>
                                                <X className="ml-2 h-4 w-4"/> حذف الصورة
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-6 bg-card border-t shrink-0">
                    <Button onClick={handleSaveProduct} disabled={isSaving} className="w-full h-16 rounded-[1.8rem] text-xl font-black shadow-xl shadow-primary/20">
                        {isSaving ? <Loader2 className="animate-spin h-7 w-7"/> : "حفظ المنتج ونشره"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <div className="bg-white rounded-[1.5rem] border shadow-xl overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-black">صورة</TableHead>
                <TableHead className="font-black">المنتج</TableHead>
                <TableHead className="font-black">السعر</TableHead>
                <TableHead className="font-black">المخزن</TableHead>
                <TableHead className="font-black">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id} className={cn("hover:bg-muted/20", !product.isActive && "opacity-50")}>
                  <TableCell>
                    <div className="relative h-12 w-12">
                        <Image src={product.image || 'https://placehold.co/40x40.png'} fill className="rounded-xl object-cover border" alt={product.name} unoptimized={true}/>
                    </div>
                  </TableCell>
                  <TableCell className="font-bold">
                    {product.name}
                    <div className="text-[9px] text-muted-foreground">{categories.find(c=>c.id === product.categoryId)?.name}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                        {product.discountPrice ? (
                            <>
                                <span className="text-[10px] text-muted-foreground line-through decoration-destructive/50">{formatCurrency(product.price)}</span>
                                <span className="font-black text-primary">{formatCurrency(product.discountPrice)}</span>
                            </>
                        ) : (
                            <span className="font-black">{formatCurrency(product.price)}</span>
                        )}
                    </div>
                  </TableCell>
                  <TableCell className="font-bold text-xs">
                    {product.isUnlimitedStock ? <Badge className="bg-blue-500 rounded-lg">مفتوح</Badge> : (
                        product.sizes && product.sizes.length > 0 
                        ? <Badge variant="outline" className="rounded-lg">{product.sizes.length} أنواع</Badge> 
                        : product.stock
                    )}
                  </TableCell>
                  <TableCell>
                      <div className="flex items-center gap-2">
                          <Button variant="outline" size="icon" onClick={() => handleOpenDialog(product)} className="rounded-lg h-9 w-9"><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteProduct(product.id)} className="text-destructive h-9 w-9 hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {products.length === 0 && <div className="p-20 text-center text-muted-foreground font-bold italic">لا توجد منتجات في هذا الفرع حالياً.</div>}
      </div>
    </div>
  );
}
