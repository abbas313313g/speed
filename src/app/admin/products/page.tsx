
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
  DialogHeader,
  DialogTitle,
  DialogFooter
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
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import Image from 'next/image';
import { Edit, Trash2, PlusCircle, Upload, Search } from 'lucide-react';
import type { Product } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
  storeSectionId: '',
  restaurantId: '',
  status: 'approved',
  branchId: 'main',
  isActive: true,
  isUnlimitedStock: false
};

export default function AdminProductsPage({ branchId }: { branchId: string }) {
  const { products, addProduct, updateProduct, deleteProduct } = useProducts(branchId);
  const { categories } = useCategories();
  const { restaurants } = useRestaurants(branchId);
  const { toast } = useToast();
  
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<Product> & {image?: string}>({ ...EMPTY_PRODUCT });
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStoreId, setFilterStoreId] = useState('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
        const matchesSearch = (p.name || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStore = filterStoreId === 'all' || p.restaurantId === filterStoreId;
        return matchesSearch && matchesStore;
    });
  }, [products, searchTerm, filterStoreId]);

  const handleOpenDialog = (product?: Product) => {
    if (product) {
        setIsEditing(true);
        setCurrentProduct({ ...product, sizes: product.sizes || [] });
    } else {
        setIsEditing(false);
        const defaultStoreId = filterStoreId !== 'all' ? filterStoreId : '';
        const storeObj = restaurants.find(r => r.id === defaultStoreId);
        setCurrentProduct({ 
            ...EMPTY_PRODUCT, 
            branchId: branchId || 'main',
            restaurantId: defaultStoreId,
            categoryId: storeObj?.categoryId || '',
            sizes: []
        });
    }
    setOpen(true);
  };

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

  const handleSaveProduct = async () => {
    if (!currentProduct.name || !currentProduct.restaurantId) {
        toast({ title: "بيانات ناقصة", variant: "destructive" });
        return;
    }
    setIsSaving(true);
    try {
        if (isEditing && currentProduct.id) {
            await updateProduct(currentProduct as any);
        } else {
            await addProduct(currentProduct as any);
        }
        setOpen(false);
    } catch (error) {} finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <header className="flex justify-between items-start">
        <div>
            <h1 className="text-3xl font-black text-primary">إدارة المنتجات</h1>
            <p className="text-muted-foreground font-bold">تعديل فوري ومباشر للمنيو.</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="rounded-xl h-12 px-6 font-bold shadow-lg gap-2">
            <PlusCircle className="h-5 w-5" /> إضافة منتج
        </Button>
      </header>

      <div className="grid md:grid-cols-2 gap-4 bg-white p-4 rounded-2xl border shadow-sm">
          <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="ابحث باسم المنتج..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="pr-10 h-12 rounded-xl"
              />
          </div>
          <Select value={filterStoreId} onValueChange={setFilterStoreId}>
              <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue placeholder="تصفية حسب المتجر..." />
              </SelectTrigger>
              <SelectContent>
                  <SelectItem value="all">كل المتاجر</SelectItem>
                  {restaurants.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
              </SelectContent>
          </Select>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2.5rem]">
                <DialogHeader className="p-4">
                    <DialogTitle className="text-2xl font-black">{isEditing ? 'تعديل المنتج' : 'إضافة منتج جديد'}</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-6 p-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1 col-span-2">
                            <Label className="font-bold">اسم المنتج</Label>
                            <Input value={currentProduct.name ?? ''} onChange={(e) => setCurrentProduct({...currentProduct, name: e.target.value})} className="rounded-xl h-11" />
                        </div>
                         <div className="space-y-1">
                            <Label className="font-bold">المتجر</Label>
                            <Select value={currentProduct.restaurantId} onValueChange={(val) => setCurrentProduct({...currentProduct, restaurantId: val})}>
                                <SelectTrigger className="rounded-xl h-11">
                                    <SelectValue placeholder="اختر المتجر..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {restaurants.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="space-y-1">
                            <Label className="font-bold">الفئة</Label>
                            <Select value={currentProduct.categoryId} onValueChange={(val) => setCurrentProduct({...currentProduct, categoryId: val})}>
                                <SelectTrigger className="rounded-xl h-11">
                                    <SelectValue placeholder="اختر فئة" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="font-bold">صورة المنتج</Label>
                        <Button type="button" variant="outline" className="w-full h-12 rounded-xl" onClick={() => fileInputRef.current?.click()}>
                            <Upload className="ml-2 h-4 w-4" /> رفع صورة
                        </Button>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                        {currentProduct.image && (
                            <div className="relative w-full aspect-video rounded-2xl overflow-hidden border-2 mt-2">
                                <Image src={currentProduct.image} fill className="object-contain" alt="preview" unoptimized={true} decoding="async" />
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="p-4">
                    <Button onClick={handleSaveProduct} disabled={isSaving} className="w-full h-14 rounded-2xl text-lg font-black shadow-xl">
                        {isSaving ? <Loader2 className="animate-spin h-6 w-6"/> : "حفظ المنتج"}
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
                <TableHead className="font-black text-center">إجراء</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((p) => (
                <TableRow key={p.id} className="animate-in fade-in duration-200">
                  <TableCell>
                    <div className="relative h-12 w-12"><Image src={p.image} fill className="rounded-xl object-cover border" alt="" unoptimized={true} decoding="async" /></div>
                  </TableCell>
                  <TableCell className="font-bold">{p.name}</TableCell>
                  <TableCell className="font-black text-primary text-xs">{formatCurrency(p.price)}</TableCell>
                  <TableCell className="text-center">
                      <div className="flex justify-center gap-1">
                          <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => handleOpenDialog(p)}><Edit className="h-4 w-4"/></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive" onClick={() => deleteProduct(p.id)}><Trash2 className="h-4 w-4"/></Button>
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
