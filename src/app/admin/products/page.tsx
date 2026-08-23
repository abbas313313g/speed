
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
import { Edit, Trash2, PlusCircle, X, Upload, Search, Store, Tag, Plus } from 'lucide-react';
import type { Product, ProductSize } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
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
  const { products, isLoading: productsLoading, addProduct, updateProduct, deleteProduct } = useProducts(branchId);
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

  const selectedStoreData = useMemo(() => {
    return restaurants.find(r => r.id === currentProduct.restaurantId);
  }, [currentProduct.restaurantId, restaurants]);

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
            storeSectionId: '',
            sizes: []
        });
    }
    setOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800000) {
          toast({ title: "الصورة كبيرة جداً", description: "يرجى اختيار صورة بحجم أقل من 800 كيلوبايت.", variant: "destructive" });
          return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setCurrentProduct({ ...currentProduct, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSizeChange = (index: number, field: keyof ProductSize, value: any) => {
    const newSizes = [...(currentProduct.sizes || [])];
    newSizes[index] = { ...newSizes[index], [field]: value };
    setCurrentProduct({ ...currentProduct, sizes: newSizes });
  };

  const addSize = () => {
    const newSizes = [...(currentProduct.sizes || []), { name: '', price: 0, stock: 0, isUnlimited: false, isActive: true }];
    setCurrentProduct({ ...currentProduct, sizes: newSizes });
  };

  const removeSize = (index: number) => {
    const newSizes = [...(currentProduct.sizes || [])];
    newSizes.splice(index, 1);
    setCurrentProduct({ ...currentProduct, sizes: newSizes });
  };

  const handleSaveProduct = async () => {
    if (!currentProduct.name || !currentProduct.categoryId || !currentProduct.restaurantId) {
        toast({ title: "بيانات ناقصة", variant: "destructive" });
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
            branchId: branchId || 'main',
            status: 'approved',
            price: Number(currentProduct.price) || 0,
            wholesalePrice: Number(currentProduct.wholesalePrice) || 0,
            discountPrice: Number(currentProduct.discountPrice) || 0,
            stock: currentProduct.isUnlimitedStock ? 999999 : (Number(currentProduct.stock) || 0),
            sizes: (currentProduct.sizes || []).map(s => ({
                ...s,
                price: Number(s.price),
                stock: s.isUnlimited ? 999999 : (Number(s.stock) || 0)
            }))
        };

        if (isEditing && currentProduct.id) {
            await updateProduct(productToSave);
        } else {
            await addProduct(productToSave);
        }
        setOpen(false);
    } catch (error) {} finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-start">
        <div>
            <h1 className="text-3xl font-black text-primary">إدارة المنتجات</h1>
            <p className="text-muted-foreground font-bold">رفع الصور مباشرة وتدبير الأحجام والأسعار.</p>
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
          <div className="flex gap-2">
              <div className="flex-1">
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
          </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col rounded-[2.5rem] p-0 border-none shadow-2xl">
                <DialogHeader className="p-6 bg-card shrink-0">
                    <DialogTitle className="text-2xl font-black text-primary">{isEditing ? 'تعديل المنتج' : 'إضافة منتج جديد'}</DialogTitle>
                </DialogHeader>
                
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
                    <div className="space-y-6 text-right pb-10">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1 col-span-2">
                                <Label className="font-bold pr-1">اسم المنتج</Label>
                                <Input value={currentProduct.name ?? ''} onChange={(e) => setCurrentProduct({...currentProduct, name: e.target.value})} className="rounded-xl h-11" />
                            </div>
                             <div className="space-y-1">
                                <Label className="font-bold pr-1">المتجر</Label>
                                <Select value={currentProduct.restaurantId} onValueChange={(val) => {
                                    const r = restaurants.find(x => x.id === val);
                                    setCurrentProduct({...currentProduct, restaurantId: val, categoryId: r?.categoryId || currentProduct.categoryId, storeSectionId: ''});
                                }}>
                                    <SelectTrigger className="rounded-xl h-11">
                                        <SelectValue placeholder="اختر المتجر..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {restaurants.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                             <div className="space-y-1">
                                <Label className="font-bold pr-1">الفئة</Label>
                                <Select value={currentProduct.categoryId} onValueChange={(val) => setCurrentProduct({...currentProduct, categoryId: val})}>
                                    <SelectTrigger className="rounded-xl h-11">
                                        <SelectValue placeholder="اختر فئة" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* الحقل المطلوب: قسم المنيو الداخلي للمتجر */}
                            <div className="space-y-1 col-span-2">
                                <Label className="font-bold pr-1">قسم المنيو (داخل المتجر)</Label>
                                <Select 
                                    value={currentProduct.storeSectionId || 'none'} 
                                    onValueChange={(val) => setCurrentProduct({...currentProduct, storeSectionId: val === 'none' ? '' : val})}
                                    disabled={!selectedStoreData || !selectedStoreData.menuSections?.length}
                                >
                                    <SelectTrigger className="rounded-xl h-11">
                                        <SelectValue placeholder={selectedStoreData?.menuSections?.length ? "اختر قسم من منيو المتجر..." : "لا يوجد أقسام لهذا المتجر"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">بدون قسم</SelectItem>
                                        {selectedStoreData?.menuSections?.map(section => (
                                            <SelectItem key={section} value={section}>{section}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="font-bold pr-1">صورة المنتج (رفع ملف)</Label>
                            <div className="flex gap-2">
                                <Button type="button" variant="outline" className="w-full h-14 rounded-xl font-black gap-2 border-primary/40 text-primary" onClick={() => fileInputRef.current?.click()}>
                                    <Upload className="h-5 w-5" />
                                    اختر صورة من الملفات
                                </Button>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                            </div>
                            {currentProduct.image && (
                                <div className="relative w-full aspect-video rounded-3xl overflow-hidden border-2 border-primary/20 bg-muted/10 mt-4">
                                    <Image src={currentProduct.image} fill className="object-contain" alt="preview" unoptimized={true} priority={true}/>
                                </div>
                            )}
                        </div>
                        
                        <div className="space-y-2">
                            <Label className="font-bold pr-1">وصف الوجبة</Label>
                            <Textarea value={currentProduct.description ?? ''} onChange={(e) => setCurrentProduct({...currentProduct, description: e.target.value})} className="rounded-xl min-h-[120px] p-4 font-bold" />
                        </div>

                        <Separator className="opacity-50" />

                        <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-1">
                                <Label className="font-bold pr-1 text-xs text-muted-foreground">سعر الجملة</Label>
                                <Input type="number" value={currentProduct.wholesalePrice || ''} onChange={(e) => setCurrentProduct({...currentProduct, wholesalePrice: parseFloat(e.target.value)})} className="rounded-xl" />
                            </div>
                            <div className="space-y-1">
                                <Label className="font-bold pr-1 text-xs text-muted-foreground">السعر بعد الخصم (اختياري)</Label>
                                <Input type="number" value={currentProduct.discountPrice || ''} onChange={(e) => setCurrentProduct({...currentProduct, discountPrice: parseFloat(e.target.value)})} className="rounded-xl" />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 bg-muted/20 p-5 rounded-[2rem] border-2 border-dashed">
                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold">سعر البيع الأساسي</Label>
                                <Input type="number" value={currentProduct.price || ''} onChange={(e) => setCurrentProduct({...currentProduct, price: parseFloat(e.target.value)})} className="rounded-xl font-black" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold">المخزن الأساسي</Label>
                                <Input type="number" disabled={currentProduct.isUnlimitedStock} value={currentProduct.isUnlimitedStock ? '' : (currentProduct.stock || '')} onChange={(e) => setCurrentProduct({...currentProduct, stock: parseInt(e.target.value)})} className="rounded-xl" />
                            </div>
                            <div className="flex flex-col justify-end items-center space-y-1">
                                <Label className="text-[10px] font-bold">كمية مفتوحة</Label>
                                <Switch checked={currentProduct.isUnlimitedStock} onCheckedChange={(v) => setCurrentProduct({...currentProduct, isUnlimitedStock: v})} />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label className="font-black text-lg">الأحجام والأنواع (اختياري)</Label>
                                <Button type="button" variant="outline" size="sm" onClick={addSize} className="rounded-xl gap-1">
                                    <Plus className="h-4 w-4" /> إضافة حجم
                                </Button>
                            </div>
                            
                            <div className="space-y-3">
                                {currentProduct.sizes?.map((size, idx) => (
                                    <div key={idx} className="p-4 bg-slate-50 rounded-2xl border space-y-3">
                                        <div className="flex items-center gap-2">
                                            <Input placeholder="اسم الحجم (مثال: كبير)" value={size.name} onChange={(e)=>handleSizeChange(idx, 'name', e.target.value)} className="rounded-lg h-9 font-bold" />
                                            <Button variant="ghost" size="icon" onClick={()=>removeSize(idx)} className="text-destructive"><X className="h-4 w-4"/></Button>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="space-y-1">
                                                <Label className="text-[10px] font-bold">السعر</Label>
                                                <Input type="number" value={size.price || ''} onChange={(e)=>handleSizeChange(idx, 'price', parseFloat(e.target.value))} className="h-8 rounded-lg text-xs" />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] font-bold">المخزن</Label>
                                                <Input type="number" disabled={size.isUnlimited} value={size.isUnlimited ? '' : (size.stock || '')} onChange={(e)=>handleSizeChange(idx, 'stock', parseInt(e.target.value))} className="h-8 rounded-lg text-xs" />
                                            </div>
                                            <div className="flex flex-col items-center justify-center">
                                                <Label className="text-[10px] font-bold mb-1">مفتوح</Label>
                                                <Switch checked={size.isUnlimited} onCheckedChange={(v)=>handleSizeChange(idx, 'isUnlimited', v)} className="scale-75" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-6 bg-card border-t shrink-0">
                    <Button onClick={handleSaveProduct} disabled={isSaving} className="w-full h-16 rounded-[1.8rem] text-xl font-black shadow-xl">
                        {isSaving ? <Loader2 className="animate-spin h-7 w-7"/> : "حفظ المنتج في القاعدة"}
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
                <TableHead className="font-black">الأنواع</TableHead>
                <TableHead className="font-black text-center">إجراء</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="relative h-12 w-12"><Image src={p.image} fill className="rounded-xl object-cover border" alt="" unoptimized={true} priority={true}/></div>
                  </TableCell>
                  <TableCell className="font-bold">{p.name}</TableCell>
                  <TableCell className="font-black text-primary text-xs">{formatCurrency(p.discountPrice || p.price)}</TableCell>
                  <TableCell>
                      {p.sizes && p.sizes.length > 0 ? (
                          <Badge variant="secondary" className="font-black">{p.sizes.length} أنواع</Badge>
                      ) : '-'}
                  </TableCell>
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
