"use client";

import { useContext, useState, useRef } from 'react';
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
};

export default function AdminProductsPage() {
  const context = useContext(AppContext);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<Product> & {image?: string}>({ ...EMPTY_PRODUCT });
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);


  if (!context || context.isLoading) return <div>جار التحميل...</div>;
  const { products, categories, restaurants, addProduct, updateProduct, deleteProduct } = context;

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
        setCurrentProduct({ ...EMPTY_PRODUCT });
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
        image: currentProduct.image,
        sizes: currentProduct.sizes?.filter(s => s.name && s.price > 0) || [],
        stock: currentProduct.stock || 0,
    }

    if (!productToSave.discountPrice || productToSave.discountPrice <= 0) {
        delete productToSave.discountPrice;
    }
     if (!productToSave.wholesalePrice || productToSave.wholesalePrice <= 0) {
        productToSave.wholesalePrice = 0;
    }

    setIsSaving(true);
    try {
        if (isEditing && currentProduct.id) {
            await updateProduct(productToSave as Partial<Product> & {id: string});
        } else {
            await addProduct(productToSave as Omit<Product, 'id'> & { image: string });
        }
        setOpen(false);
    } catch (error) {
        console.error("Failed to save product:", error);
        toast({ title: "فشل حفظ المنتج", description: "حدث خطأ أثناء محاولة حفظ المنتج.", variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };

  const handleSizeChange = (index: number, field: keyof ProductSize, value: string | number) => {
    const newSizes = [...(currentProduct.sizes || [])];
    newSizes[index] = { ...newSizes[index], [field]: value };
    setCurrentProduct({ ...currentProduct, sizes: newSizes });
  };

  const addSize = () => {
    const newSizes = [...(currentProduct.sizes || []), { name: '', price: 0, stock: 0 }];
    setCurrentProduct({ ...currentProduct, sizes: newSizes });
  };

  const removeSize = (index: number) => {
    const newSizes = [...(currentProduct.sizes || [])];
    newSizes.splice(index, 1);
    setCurrentProduct({ ...currentProduct, sizes: newSizes });
  };


  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold">إدارة المنتجات</h1>
            <p className="text-muted-foreground">عرض، إضافة، تعديل، وحذف المنتجات.</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>إضافة منتج جديد</Button>
      </header>

      <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'تعديل المنتج' : 'إضافة منتج جديد'}</DialogTitle>
                    <DialogDescription>
                        {isEditing ? 'قم بتعديل تفاصيل المنتج.' : 'أدخل تفاصيل المنتج الجديد هنا.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">الاسم</Label>
                        <Input id="name" value={currentProduct.name} onChange={(e) => setCurrentProduct({...currentProduct, name: e.target.value})} className="col-span-3" />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="price" className="text-right">سعر البيع</Label>
                        <Input id="price" type="number" value={currentProduct.price || ''} onChange={(e) => setCurrentProduct({...currentProduct, price: e.target.value === '' ? 0 : parseFloat(e.target.value)})} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="wholesalePrice" className="text-right">سعر الجملة</Label>
                        <Input id="wholesalePrice" type="number" value={currentProduct.wholesalePrice || ''} onChange={(e) => setCurrentProduct({...currentProduct, wholesalePrice: e.target.value === '' ? 0 : parseFloat(e.target.value)})} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="discountPrice" className="text-right">السعر بعد الخصم</Label>
                        <Input id="discountPrice" type="number" placeholder="اختياري" value={currentProduct.discountPrice || ''} onChange={(e) => setCurrentProduct({...currentProduct, discountPrice: e.target.value === '' ? undefined : parseFloat(e.target.value)})} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="stock" className="text-right">الكمية المتوفرة</Label>
                        <Input id="stock" type="number" value={currentProduct.stock || ''} onChange={(e) => setCurrentProduct({...currentProduct, stock: e.target.value === '' ? 0 : parseInt(e.target.value)})} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="description" className="text-right">الوصف</Label>
                        <Input id="description" value={currentProduct.description} onChange={(e) => setCurrentProduct({...currentProduct, description: e.target.value})} className="col-span-3" />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                         <Label htmlFor="imageUrl" className="text-right">الصورة</Label>
                         <div className="col-span-3 flex gap-2">
                             <Input id="imageUrl" value={currentProduct.image} onChange={(e) => setCurrentProduct({...currentProduct, image: e.target.value})} placeholder="أدخل رابط صورة أو ارفع ملفًا"/>
                             <Button type="button" variant="outline" size="icon" onClick={() => fileInputRef.current?.click()}><Upload className="h-4 w-4"/></Button>
                             <Input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                         </div>
                    </div>
                    {currentProduct.image && <Image src={currentProduct.image} alt="preview" width={100} height={100} className="col-span-4 justify-self-center object-contain" unoptimized={true}/>}

                    <div className="grid grid-cols-4 items-center gap-4">
                         <Label htmlFor="category" className="text-right">القسم</Label>
                         <Select value={currentProduct.categoryId} onValueChange={(value) => setCurrentProduct({...currentProduct, categoryId: value})}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="اختر قسم" />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                         <Label htmlFor="restaurant" className="text-right">المتجر</Label>
                         <Select value={currentProduct.restaurantId} onValueChange={(value) => setCurrentProduct({...currentProduct, restaurantId: value})}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="اختر المتجر" />
                            </SelectTrigger>
                            <SelectContent>
                                {restaurants.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <Separator className="my-4" />
                    
                    <div>
                        <Label>الأحجام/الكميات (اختياري)</Label>
                        <div className="space-y-2 mt-2">
                            {currentProduct.sizes?.map((size, index) => (
                                <div key={index} className="grid grid-cols-12 items-center gap-2">
                                    <Input className="col-span-5" placeholder="اسم الحجم (صغير)" value={size.name} onChange={(e) => handleSizeChange(index, 'name', e.target.value)} />
                                    <Input className="col-span-3" type="number" placeholder="السعر" value={size.price || ''} onChange={(e) => handleSizeChange(index, 'price', e.target.value === '' ? 0 : parseFloat(e.target.value))} />
                                    <Input className="col-span-3" type="number" placeholder="الكمية" value={size.stock || ''} onChange={(e) => handleSizeChange(index, 'stock', e.target.value === '' ? 0 : parseInt(e.target.value))} />
                                    <Button variant="ghost" size="icon" className="col-span-1" onClick={() => removeSize(index)}><X className="h-4 w-4 text-destructive" /></Button>
                                </div>
                            ))}
                        </div>
                        <Button variant="outline" size="sm" className="mt-2" onClick={addSize}><PlusCircle className="ml-2 h-4 w-4" /> إضافة حجم</Button>
                    </div>

                </div>
                <DialogFooter>
                    <Button type="submit" onClick={handleSaveProduct} disabled={isSaving}>
                        {isSaving && <Loader2 className="ml-2 h-4 w-4 animate-spin"/>}
                        حفظ
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {products.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="hidden sm:table-cell">صورة</TableHead>
                <TableHead>اسم المنتج</TableHead>
                <TableHead>السعر</TableHead>
                <TableHead>الكمية</TableHead>
                <TableHead className="hidden md:table-cell">سعر الجملة</TableHead>
                <TableHead className="hidden lg:table-cell">القسم</TableHead>
                <TableHead className="hidden lg:table-cell">المتجر</TableHead>
                <TableHead>إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="hidden sm:table-cell">
                    <Image src={product.image} alt={product.name} width={40} height={40} className="rounded-md object-cover" unoptimized={true}/>
                  </TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>
                      <div className="flex flex-col">
                          {product.discountPrice ? (
                              <>
                                <span className="text-destructive line-through">{formatCurrency(product.price)}</span>
                                <span className="font-bold text-primary">{formatCurrency(product.discountPrice)}</span>
                              </>
                          ) : (
                            <span>{formatCurrency(product.price)}</span>
                          )}
                      </div>
                  </TableCell>
                  <TableCell>{product.stock}</TableCell>
                  <TableCell className="hidden md:table-cell">{formatCurrency(product.wholesalePrice || 0)}</TableCell>
                  <TableCell className="hidden lg:table-cell">{categories.find(c => c.id === product.categoryId)?.name || 'غير معروف'}</TableCell>
                  <TableCell className="hidden lg:table-cell">{restaurants.find(r => r.id === product.restaurantId)?.name || 'غير معروف'}</TableCell>
                  <TableCell>
                      <div className="flex items-center gap-2">
                          <Button variant="outline" size="icon" onClick={() => handleOpenDialog(product)}>
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
                                        هذا الإجراء سيقوم بحذف المنتج "{product.name}" بشكل نهائي. لا يمكن التراجع عن هذا الإجراء.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteProduct(product.id)}>حذف</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                      </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
      ) : (
        <p className="text-center text-muted-foreground py-8">لا توجد منتجات لعرضها.</p>
      )}
    </div>
  );
}
