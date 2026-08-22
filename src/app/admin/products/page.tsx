
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
import { Edit, Trash2, PlusCircle, X, Upload, Search, Filter, Store, Tag, Plus } from 'lucide-react';
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
  const [storeSearch, setStoreSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
        const matchesSearch = (p.name || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStore = filterStoreId === 'all' || p.restaurantId === filterStoreId;
        return matchesSearch && matchesStore;
    });
  }, [products, searchTerm, filterStoreId]);

  const filteredStoresInDialog = useMemo(() => {
    return restaurants.filter(r => (r.name || '').toLowerCase().includes(storeSearch.toLowerCase()));
  }, [restaurants, storeSearch]);

  const handleOpenDialog = (product?: Product) => {
    if (product) {
        setIsEditing(true);
        setCurrentProduct({
            ...product,
            sizes: product.sizes || []
        });
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
    setStoreSearch('');
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

  const addSize = () => {
    const sizes = [...(currentProduct.sizes || [])];
    sizes.push({ name: '', price: 0, stock: 0, isUnlimited: false, isActive: true });
    setCurrentProduct({ ...currentProduct, sizes });
  };

  const removeSize = (idx: number) => {
    const sizes = [...(currentProduct.sizes || [])];
    sizes.splice(idx, 1);
    setCurrentProduct({ ...currentProduct, sizes });
  };

  const handleSizeChange = (idx: number, field: keyof ProductSize, val: any) => {
    const sizes = [...(currentProduct.sizes || [])];
    sizes[idx] = { ...sizes[idx], [field]: val };
    setCurrentProduct({ ...currentProduct, sizes });
  };

  const handleSaveProduct = async () => {
    if (!currentProduct.name || !currentProduct.categoryId || !currentProduct.restaurantId) {
        toast({ title: "بيانات ناقصة", description: "يرجى اختيار المتجر والقسم واسم المنتج.", variant: "destructive" });
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
            status: 'approved',
            price: Number(currentProduct.price) || 0,
            wholesalePrice: Number(currentProduct.wholesalePrice) || 0,
            discountPrice: Number(currentProduct.discountPrice) || 0,
            stock: currentProduct.isUnlimitedStock ? 999999 : (Number(currentProduct.stock) || 0),
            isActive: currentProduct.isActive ?? true,
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

  if (productsLoading) return <div className="p-8 text-center animate-pulse font-black text-primary">جارِ تحميل المنتجات...</div>;

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-start">
        <div>
            <h1 className="text-3xl font-black text-primary">إدارة المنتجات</h1>
            <p className="text-muted-foreground font-bold">إضافة وتعديل المنتجات مع بحث ذكي.</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="rounded-xl h-12 px-6 font-bold shadow-lg gap-2">
            <PlusCircle className="h-5 w-5" /> إضافة منتج جديد
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
              <Button variant="outline" className="h-12 w-12 rounded-xl" onClick={() => { setSearchTerm(''); setFilterStoreId('all'); }}>
                  <X className="h-4 w-4" />
              </Button>
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
                                <Input value={currentProduct.name ?? ''} onChange={(e) => setCurrentProduct({...currentProduct, name: e.target.value})} className="rounded-xl h-11" placeholder="مثال: بيتزا مارغريتا" />
                            </div>

                            <div className="space-y-1">
                                <Label className="font-bold pr-1">المتجر (ابحث للاختيار)</Label>
                                <div className="space-y-2">
                                    <Input 
                                        placeholder="ابحث عن متجر..." 
                                        value={storeSearch} 
                                        onChange={(e) => setStoreSearch(e.target.value)}
                                        className="h-10 text-xs rounded-xl border-dashed"
                                    />
                                    <Select value={currentProduct.restaurantId} onValueChange={(val) => {
                                        const r = restaurants.find(x => x.id === val);
                                        setCurrentProduct({...currentProduct, restaurantId: val, categoryId: r?.categoryId || currentProduct.categoryId});
                                    }}>
                                        <SelectTrigger className="rounded-xl h-11">
                                            <SelectValue placeholder="اختر المتجر..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {filteredStoresInDialog.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                                            {filteredStoresInDialog.length === 0 && <p className="p-2 text-xs italic text-center">لا توجد نتائج</p>}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-1 flex flex-col justify-end">
                                <Label className="font-bold pr-1">فئة المتجر العامة</Label>
                                <Select value={currentProduct.categoryId} onValueChange={(val) => setCurrentProduct({...currentProduct, categoryId: val})}>
                                    <SelectTrigger className="rounded-xl h-11">
                                        <SelectValue placeholder="الفئة العامة للمتجر" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        
                        <div className="space-y-1">
                            <Label className="font-bold pr-1">قسم المنيو الداخلي (اختياري)</Label>
                            <Select 
                                value={currentProduct.storeSectionId} 
                                onValueChange={(val) => setCurrentProduct({...currentProduct, storeSectionId: val})}
                                disabled={!currentProduct.restaurantId}
                            >
                                <SelectTrigger className="rounded-xl h-11">
                                    <SelectValue placeholder="اختر من أقسام المتجر..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">بدون قسم</SelectItem>
                                    {restaurants.find(r => r.id === currentProduct.restaurantId)?.menuSections?.map(s => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <Separator className="opacity-50" />

                        {/* قسم الأنواع والأحجام */}
                        <div className="space-y-4 bg-muted/20 p-5 rounded-[2rem] border-2 border-dashed">
                            <div className="flex justify-between items-center">
                                <Label className="font-black text-primary flex items-center gap-2">
                                    <Tag className="h-4 w-4" /> الأنواع والأحجام (اختياري)
                                </Label>
                                <Button type="button" variant="outline" size="sm" onClick={addSize} className="rounded-lg h-9 font-bold gap-1 border-primary/40 text-primary">
                                    <Plus className="h-3 w-3" /> إضافة حجم/نوع
                                </Button>
                            </div>

                            {currentProduct.sizes && currentProduct.sizes.length > 0 ? (
                                <div className="space-y-3">
                                    {currentProduct.sizes.map((s, idx) => (
                                        <div key={idx} className="bg-white p-3 rounded-2xl border shadow-sm space-y-3">
                                            <div className="flex gap-2 items-center">
                                                <Input 
                                                    placeholder="اسم النوع (مثلاً: كبير)" 
                                                    value={s.name} 
                                                    onChange={(e) => handleSizeChange(idx, 'name', e.target.value)}
                                                    className="h-10 text-xs rounded-xl flex-1"
                                                />
                                                <Input 
                                                    type="number" 
                                                    placeholder="السعر" 
                                                    value={s.price || ''} 
                                                    onChange={(e) => handleSizeChange(idx, 'price', e.target.value)}
                                                    className="h-10 text-xs rounded-xl w-24 font-black text-primary"
                                                />
                                                <Button variant="ghost" size="icon" onClick={() => removeSize(idx)} className="text-destructive h-8 w-8 hover:bg-destructive/10 rounded-lg">
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <div className="flex items-center justify-between px-1">
                                                <div className="flex items-center gap-2">
                                                    <Label className="text-[10px] font-bold">المخزن:</Label>
                                                    <Input 
                                                        type="number" 
                                                        disabled={s.isUnlimited}
                                                        value={s.isUnlimited ? '' : (s.stock || '')}
                                                        onChange={(e) => handleSizeChange(idx, 'stock', e.target.value)}
                                                        className="h-8 w-16 text-center text-xs rounded-lg"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Switch checked={s.isUnlimited} onCheckedChange={(v) => handleSizeChange(idx, 'isUnlimited', v)} className="scale-75" />
                                                    <span className="text-[10px] font-black text-muted-foreground">كمية مفتوحة</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 gap-4 bg-white p-4 rounded-2xl border">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-bold">سعر البيع</Label>
                                        <Input type="number" value={currentProduct.price || ''} onChange={(e) => setCurrentProduct({...currentProduct, price: parseFloat(e.target.value)})} className="rounded-xl font-black" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-bold">المخزن</Label>
                                        <Input 
                                            type="number" 
                                            disabled={currentProduct.isUnlimitedStock}
                                            value={currentProduct.isUnlimitedStock ? '' : (currentProduct.stock || '')} 
                                            onChange={(e) => setCurrentProduct({...currentProduct, stock: parseInt(e.target.value)})} 
                                            className="rounded-xl" 
                                        />
                                    </div>
                                    <div className="flex flex-col justify-end items-center space-y-1">
                                        <Label className="text-[10px] font-bold">كمية مفتوحة</Label>
                                        <Switch checked={currentProduct.isUnlimitedStock} onCheckedChange={(v) => setCurrentProduct({...currentProduct, isUnlimitedStock: v})} />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label className="font-bold pr-1">صورة المنتج</Label>
                            <div className="flex gap-2">
                                <Input value={currentProduct.image && !currentProduct.image.startsWith('data:') ? currentProduct.image : ''} onChange={(e) => setCurrentProduct({...currentProduct, image: e.target.value})} className="rounded-xl h-11" placeholder="رابط الصورة أو ارفع ملف..." />
                                <Button type="button" variant="outline" size="icon" className="rounded-xl h-11 w-12 shrink-0" onClick={() => fileInputRef.current?.click()}>
                                    <Upload className="h-5 w-5" />
                                </Button>
                            </div>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                        </div>
                        
                        <div className="space-y-2">
                            <Label className="font-bold pr-1">الوصف والوصل</Label>
                            <Textarea value={currentProduct.description ?? ''} onChange={(e) => setCurrentProduct({...currentProduct, description: e.target.value})} className="rounded-xl min-h-[120px] p-4 font-bold" placeholder="اكتب وصف المنتج هنا، يمكنك استخدام الأسطر والفواصل..." />
                        </div>

                        {currentProduct.image && (
                            <div className="relative w-full aspect-video rounded-3xl overflow-hidden border-2 border-muted bg-muted/10">
                                <Image src={currentProduct.image} fill className="object-contain" alt="preview" unoptimized={true}/>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="p-6 bg-card border-t shrink-0">
                    <Button onClick={handleSaveProduct} disabled={isSaving} className="w-full h-16 rounded-[1.8rem] text-xl font-black shadow-xl">
                        {isSaving ? <Loader2 className="animate-spin h-7 w-7"/> : "حفظ المنتج"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <div className="bg-white rounded-[1.5rem] border shadow-xl overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-black">صورة</TableHead>
                <TableHead className="font-black">المنتج والمتجر</TableHead>
                <TableHead className="font-black">السعر</TableHead>
                <TableHead className="font-black">الكمية</TableHead>
                <TableHead className="font-black text-center">إجراء</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="relative h-12 w-12"><Image src={p.image} fill className="rounded-xl object-cover border" alt="" unoptimized/></div>
                  </TableCell>
                  <TableCell className="font-bold">
                    {p.name}
                    <div className="text-[9px] text-muted-foreground font-black flex items-center gap-1">
                        <Store className="h-2 w-2" />
                        {restaurants.find(r => r.id === p.restaurantId)?.name || 'متجر محذوف'}
                    </div>
                  </TableCell>
                  <TableCell className="font-black text-primary text-xs">
                      {p.sizes && p.sizes.length > 0 ? (
                        <span>تبدأ من {formatCurrency(Math.min(...p.sizes.map(s => s.price)))}</span>
                      ) : (
                        <span>{formatCurrency(p.discountPrice || p.price)}</span>
                      )}
                  </TableCell>
                  <TableCell>
                      {p.sizes && p.sizes.length > 0 ? (
                        <Badge variant="outline" className="text-[9px]">أنواع ({p.sizes.length})</Badge>
                      ) : (
                        <span className="text-xs font-bold">{p.isUnlimitedStock ? '∞' : p.stock}</span>
                      )}
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
          {filteredProducts.length === 0 && <div className="p-20 text-center italic text-muted-foreground">لا توجد منتجات مطابقة للبحث.</div>}
      </div>
    </div>
  );
}
