
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency, compressImage, cn } from '@/lib/utils';
import Image from 'next/image';
import { Edit, Trash2, PlusCircle, Upload, Search, ArrowRight, Store, Package, LayoutGrid, ChevronRight, X, Infinity, Loader2 } from 'lucide-react';
import type { Product, ProductSize, Restaurant } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import React from 'react';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { useRestaurants } from '@/hooks/useRestaurants';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const EMPTY_PRODUCT: Omit<Product, 'id'> & {image: string} = {
  name: '',
  price: 0,
  discountPrice: 0,
  sizes: [],
  stock: 10,
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
  const { restaurants, isLoading: storesLoading } = useRestaurants(branchId);
  const { categories } = useCategories();
  const { toast } = useToast();
  
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  
  const { products, addProduct, updateProduct, deleteProduct, isLoading: productsLoading } = useProducts(
      branchId, 
      selectedStoreId || 'none',
      200,
      undefined,
      '',
      true // isAdmin: جلب كل الحالات
  );

  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<Product> & {image?: string}>({ ...EMPTY_PRODUCT });
  const [isSaving, setIsSaving] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedStore = useMemo(() => 
    restaurants.find(r => r.id === selectedStoreId), 
    [selectedStoreId, restaurants]
  );

  const filteredProducts = useMemo(() => {
    return products.filter(p => (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()));
  }, [products, searchTerm]);

  const handleOpenDialog = (product?: Product) => {
    if (product) {
        setIsEditing(true);
        setCurrentProduct({ ...product, sizes: product.sizes || [] });
    } else {
        setIsEditing(false);
        setCurrentProduct({ 
            ...EMPTY_PRODUCT, 
            branchId: branchId || 'main',
            restaurantId: selectedStoreId || '',
            categoryId: selectedStore?.categoryId || '',
            sizes: []
        });
    }
    setOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsCompressing(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string);
        setCurrentProduct({ ...currentProduct, image: compressed });
        setIsCompressing(false);
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
      setCurrentProduct({ 
          ...currentProduct, 
          sizes: [...(currentProduct.sizes || []), { name: '', price: 0, stock: 0, isUnlimited: false }] 
      });
  };

  const removeSize = (index: number) => {
      const newSizes = [...(currentProduct.sizes || [])];
      newSizes.splice(index, 1);
      setCurrentProduct({ ...currentProduct, sizes: newSizes });
  };

  const handleSaveProduct = async () => {
    const hasValidSizes = currentProduct.sizes && currentProduct.sizes.length > 0;
    const isBasePriceValid = (currentProduct.price || 0) > 0;

    if (!currentProduct.name || !currentProduct.image || (!isBasePriceValid && !hasValidSizes)) {
        toast({ title: "بيانات ناقصة", description: "يرجى إكمال الاسم والصورة وتحديد سعر أو إضافة أنواع.", variant: "destructive" });
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

  const toggleSelectProduct = (id: string) => {
      setSelectedProductIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
      if (selectedProductIds.length === filteredProducts.length) {
          setSelectedProductIds([]);
      } else {
          setSelectedProductIds(filteredProducts.map(p => p.id));
      }
  };

  const handleBulkDelete = async () => {
      if (selectedProductIds.length === 0) return;
      const count = selectedProductIds.length;
      for (const id of selectedProductIds) {
          await deleteProduct(id);
      }
      setSelectedProductIds([]);
      toast({ title: `تم حذف ${count} منتج بنجاح` });
  };

  if (storesLoading) return <div className="p-20 text-center animate-pulse flex flex-col items-center gap-4"><Loader2 className="h-10 w-10 animate-spin text-primary"/><p className="font-black text-primary">جارِ فتح سجلات المتاجر...</p></div>;

  if (!selectedStoreId) {
      return (
          <div className="space-y-8 animate-in fade-in duration-500">
              <header>
                  <h1 className="text-4xl font-black text-primary italic">إدارة المنتجات</h1>
                  <p className="text-muted-foreground font-bold mt-1">اختر متجراً لمشاهدة وتعديل قائمة وجباته.</p>
              </header>

              <div className="grid gap-4 md:grid-cols-3">
                  {restaurants.map(store => (
                      <Card 
                        key={store.id} 
                        onClick={() => setSelectedStoreId(store.id)}
                        className="p-4 rounded-[2rem] border-none shadow-md hover:shadow-xl transition-all cursor-pointer group bg-white overflow-hidden relative"
                      >
                          <div className="flex items-center gap-4 relative z-10">
                              <div className="relative h-16 w-16 shrink-0">
                                  <Image src={store.image} fill className="rounded-2xl object-cover border-2 border-primary/10" alt="" unoptimized={true}/>
                              </div>
                              <div className="flex-1 min-w-0 text-right">
                                  <h3 className="font-black text-lg truncate">{store.name}</h3>
                                  <p className="text-[10px] text-muted-foreground font-bold">{store.restaurantNumber}</p>
                              </div>
                              <div className="p-2 bg-primary/5 rounded-xl group-hover:bg-primary group-hover:text-white transition-colors">
                                  <ChevronRight className="h-5 w-5" />
                              </div>
                          </div>
                      </Card>
                  ))}
                  {restaurants.length === 0 && <div className="col-span-3 p-20 text-center text-muted-foreground font-bold italic border-2 border-dashed rounded-[3rem]">لا يوجد متاجر مضافة في هذا الفرع بعد.</div>}
              </div>
          </div>
      );
  }

  return (
    <div className="space-y-8 animate-in slide-in-from-left-4 duration-500 text-right">
      <header className="flex justify-between items-start">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => setSelectedStoreId(null)} className="rounded-xl h-12 w-12 border-2"><ArrowRight className="h-6 w-6"/></Button>
            <div>
                <h1 className="text-3xl font-black text-slate-800">{selectedStore?.name}</h1>
                <p className="text-muted-foreground font-bold text-xs">إدارة قائمة الوجبات والأسعار والكميات.</p>
            </div>
        </div>
        <div className="flex gap-2">
            {selectedProductIds.length > 0 && (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="rounded-xl h-12 px-6 font-bold shadow-lg gap-2">
                            <Trash2 className="h-5 w-5" /> حذف المحددة ({selectedProductIds.length})
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-[2.5rem]">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-right font-black">حذف جماعي؟</AlertDialogTitle>
                            <AlertDialogDescription className="text-right font-bold">
                                هل أنت متأكد من حذف {selectedProductIds.length} منتج دفعة واحدة؟ لا يمكن التراجع عن هذا الإجراء.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="flex-row gap-3">
                            <AlertDialogCancel className="flex-1 rounded-xl">تراجع</AlertDialogCancel>
                            <AlertDialogAction onClick={handleBulkDelete} className="flex-1 rounded-xl bg-destructive hover:bg-destructive/90">نعم، حذف الكل</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
            <Button onClick={() => handleOpenDialog()} className="rounded-xl h-12 px-6 font-bold shadow-lg gap-2">
                <PlusCircle className="h-5 w-5" /> إضافة وجبة جديدة
            </Button>
        </div>
      </header>

      <div className="bg-white p-4 rounded-2xl border shadow-sm flex items-center gap-4">
          <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="ابحث باسم الوجبة داخل المتجر..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="pr-10 h-12 rounded-xl border-none bg-muted/30"
              />
          </div>
          <Badge className="h-12 px-6 rounded-xl font-black text-lg bg-primary/10 text-primary border-none">{products.length} وجبة</Badge>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2.5rem]">
                <DialogHeader className="p-4 border-b">
                    <DialogTitle className="text-2xl font-black">{isEditing ? 'تعديل بيانات الوجبة' : 'إنشاء وجبة جديدة'}</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-6 p-4">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1 col-span-2">
                            <Label className="font-bold">اسم الوجبة</Label>
                            <Input value={currentProduct.name ?? ''} onChange={(e) => setCurrentProduct({...currentProduct, name: e.target.value})} className="rounded-xl h-12 font-bold" />
                        </div>

                        <div className="space-y-1 col-span-2">
                            <Label className="font-bold text-slate-800">وصف الوجبة (المكونات أو التفاصيل)</Label>
                            <Textarea 
                                value={currentProduct.description ?? ''} 
                                onChange={(e) => setCurrentProduct({...currentProduct, description: e.target.value})} 
                                className="rounded-xl min-h-[100px] text-right font-medium text-sm leading-relaxed" 
                                placeholder="اكتب تفاصيل الوجبة هنا لكي يراها الزبون..."
                            />
                        </div>
                        
                        <div className="space-y-1">
                            <Label className="font-bold">السعر العام (إذا لا توجد أنواع)</Label>
                            <Input type="number" value={currentProduct.price || ''} onChange={(e) => setCurrentProduct({...currentProduct, price: parseFloat(e.target.value) || 0})} className="rounded-xl h-12 font-black text-primary" />
                        </div>
                        <div className="space-y-1">
                            <Label className="font-bold">السعر بعد الخصم (اختياري)</Label>
                            <Input type="number" placeholder="اتركه 0 إذا لا يوجد خصم" value={currentProduct.discountPrice || ''} onChange={(e) => setCurrentProduct({...currentProduct, discountPrice: parseFloat(e.target.value) || 0})} className="rounded-xl h-12 font-bold text-red-600" />
                        </div>
                        <div className="space-y-1 col-span-2">
                            <Label className="font-bold">الكمية في المخزن (للوجبة العامة)</Label>
                            <Input 
                                type="number" 
                                disabled={currentProduct.isUnlimitedStock || (currentProduct.sizes && currentProduct.sizes.length > 0)} 
                                value={currentProduct.stock || ''} 
                                onChange={(e) => setCurrentProduct({...currentProduct, stock: parseInt(e.target.value) || 0})} 
                                className="rounded-xl h-12 font-bold" 
                                placeholder={(currentProduct.sizes && currentProduct.sizes.length > 0) ? "مدارة حسب الأنواع بالأسفل" : ""}
                            />
                            {(currentProduct.sizes && currentProduct.sizes.length > 0) && <p className="text-[10px] text-orange-600 font-bold">ملاحظة: بما أنك أضفت أنواعاً، سيتم تجاهل الكمية العامة واستخدام كمية كل نوع.</p>}
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border-2 border-dashed">
                        <div className="space-y-0.5">
                            <Label className="font-black">كمية غير محدودة للوجبة ككل</Label>
                            <p className="text-[10px] text-muted-foreground font-bold">لن ينقص المخزن عند كل طلب لهذه الوجبة.</p>
                        </div>
                        <Switch checked={currentProduct.isUnlimitedStock} onCheckedChange={(v) => setCurrentProduct({...currentProduct, isUnlimitedStock: v})} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label className="font-bold">قسم المنيو الداخلي</Label>
                            <Select value={currentProduct.storeSectionId} onValueChange={(val) => setCurrentProduct({...currentProduct, storeSectionId: val})}>
                                <SelectTrigger className="rounded-xl h-12 font-bold">
                                    <SelectValue placeholder="اختر قسم من منيو المتجر..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {selectedStore?.menuSections?.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                    {(!selectedStore?.menuSections || selectedStore.menuSections.length === 0) && <SelectItem value="none" disabled>لا يوجد أقسام معرفة</SelectItem>}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label className="font-bold">الفئة العامة</Label>
                            <Select value={currentProduct.categoryId} onValueChange={(val) => setCurrentProduct({...currentProduct, categoryId: val})}>
                                <SelectTrigger className="rounded-xl h-12 font-bold">
                                    <SelectValue placeholder="اختر فئة" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <Separator className="border-dashed" />

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="font-black text-lg">الأحجام والأنواع (تعتمد كمياتها تلقائياً)</Label>
                            <Button type="button" variant="outline" size="sm" onClick={addSize} className="rounded-lg font-bold gap-1"><PlusCircle className="h-4 w-4"/> إضافة خيار</Button>
                        </div>
                        <div className="space-y-3">
                            {currentProduct.sizes?.map((size, index) => (
                                <div key={index} className="flex flex-col bg-slate-50 p-4 rounded-2xl border gap-3">
                                    <div className="grid grid-cols-12 gap-2 items-center">
                                        <div className="col-span-4"><Input placeholder="الاسم (كبير)" value={size.name} onChange={(e)=>handleSizeChange(index, 'name', e.target.value)} className="h-10 rounded-lg text-xs" /></div>
                                        <div className="col-span-3"><Input type="number" placeholder="السعر" value={size.price || ''} onChange={(e)=>handleSizeChange(index, 'price', parseFloat(e.target.value))} className="h-10 rounded-lg text-xs font-black text-primary" /></div>
                                        <div className="col-span-3"><Input type="number" disabled={size.isUnlimited} placeholder="الكمية" value={size.stock || ''} onChange={(e)=>handleSizeChange(index, 'stock', parseInt(e.target.value))} className="h-10 rounded-lg text-xs font-bold" /></div>
                                        <div className="col-span-2 flex justify-end"><Button variant="ghost" size="icon" onClick={()=>removeSize(index)} className="text-destructive"><X className="h-4 w-4"/></Button></div>
                                    </div>
                                    <div className="flex items-center justify-between px-1">
                                        <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1"><Infinity className="h-3 w-3"/> كمية مفتوحة لهذا النوع</span>
                                        <Switch checked={size.isUnlimited} onCheckedChange={(v) => handleSizeChange(index, 'isUnlimited', v)} className="scale-75" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="font-bold">صورة الوجبة (ضغط تلقائي ⚡)</Label>
                        <Button type="button" variant="outline" className="w-full h-14 rounded-xl border-dashed border-2" onClick={() => fileInputRef.current?.click()} disabled={isCompressing}>
                            {isCompressing ? <Loader2 className="animate-spin h-5 w-5 ml-2"/> : <Upload className="ml-2 h-4 w-4" />}
                            {isCompressing ? "جاري تحسين الصورة..." : "اختيار صورة الوجبة"}
                        </Button>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                        {currentProduct.image && (
                            <div className="relative w-full aspect-video rounded-3xl overflow-hidden border-4 border-white shadow-xl mt-2">
                                <Image src={currentProduct.image} fill className="object-cover" alt="preview" unoptimized={true} />
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="p-4 bg-slate-50 border-t sticky bottom-0">
                    <Button onClick={handleSaveProduct} disabled={isSaving || isCompressing} className="w-full h-14 rounded-2xl text-xl font-black shadow-2xl">
                        {isSaving ? <Loader2 className="animate-spin h-6 w-6"/> : (isEditing ? "حفظ التعديلات" : "نشر الوجبة الآن")}
                    </Button>
                </DialogFooter>
            </DialogContent>
      </Dialog>

        <div className="bg-white rounded-[2rem] border-none shadow-xl overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[50px]">
                    <Checkbox 
                        checked={selectedProductIds.length === filteredProducts.length && filteredProducts.length > 0}
                        onCheckedChange={toggleSelectAll}
                    />
                </TableHead>
                <TableHead className="font-black text-right">الوجبة</TableHead>
                <TableHead className="font-black text-right">السعر</TableHead>
                <TableHead className="font-black text-right">المخزن</TableHead>
                <TableHead className="font-black text-center">إجراء</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productsLoading ? (
                  <TableRow><TableCell colSpan={5} className="py-20 text-center flex flex-col items-center gap-2"><Loader2 className="h-8 w-8 animate-spin text-primary opacity-40"/><p className="font-bold text-muted-foreground animate-pulse">جاري جلب قائمة الوجبات...</p></TableCell></TableRow>
              ) : filteredProducts.length > 0 ? filteredProducts.map((p) => (
                <TableRow key={p.id} className={cn("hover:bg-muted/20 transition-colors", !(p.isActive ?? true) && "opacity-40 grayscale")}>
                  <TableCell>
                      <Checkbox 
                        checked={selectedProductIds.includes(p.id)}
                        onCheckedChange={() => toggleSelectProduct(p.id)}
                      />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                        <div className="relative h-12 w-12 shrink-0"><Image src={p.image} fill className="rounded-xl object-cover border shadow-sm" alt="" unoptimized={true} /></div>
                        <div className="text-right">
                            <div className="font-black text-sm">{p.name}</div>
                            <div className="text-[9px] font-bold text-muted-foreground">{p.storeSectionId || 'بدون قسم'}</div>
                            {p.status === 'pending' && <Badge className="bg-orange-500 text-[8px] h-4 py-0">قيد المراجعة</Badge>}
                        </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-black text-primary">
                    {p.sizes && p.sizes.length > 0 ? "متعدد" : formatCurrency(p.price)}
                  </TableCell>
                  <TableCell>
                      {p.isUnlimitedStock ? <Badge variant="secondary" className="text-[10px]">مفتوح ∞</Badge> : 
                       (p.sizes && p.sizes.length > 0) ? <Badge variant="outline" className="text-[9px] font-bold border-orange-200 text-orange-600">حسب الأنواع</Badge> :
                       <Badge variant={p.stock <= 5 ? "destructive" : "outline"} className="font-bold">{p.stock}</Badge>}
                  </TableCell>
                  <TableCell className="text-center">
                      <div className="flex justify-center gap-2">
                          <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-2" onClick={() => handleOpenDialog(p)}><Edit className="h-4 w-4 text-primary"/></Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-destructive"><Trash2 className="h-4 w-4"/></Button></AlertDialogTrigger>
                            <AlertDialogContent className="rounded-[2.5rem]">
                                <AlertDialogHeader><AlertDialogTitle className="text-right font-black">حذف الوجبة؟</AlertDialogTitle><AlertDialogDescription className="text-right">هل أنت متأكد من حذف وجبة "{p.name}"؟</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter className="flex-row gap-2"><AlertDialogCancel className="flex-1 rounded-xl">تراجع</AlertDialogCancel><AlertDialogAction onClick={()=>deleteProduct(p.id)} className="flex-1 bg-destructive rounded-xl">حذف نهائي</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                      </div>
                  </TableCell>
                </TableRow>
              )) : (
                  <TableRow><TableCell colSpan={5} className="py-20 text-center text-muted-foreground italic font-bold">لا يوجد وجبات مضافة لهذا المتجر.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
    </div>
  );
}
