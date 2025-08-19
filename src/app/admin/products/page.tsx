

"use client";

import { useContext, useState } from 'react';
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
import { Edit, Trash2 } from 'lucide-react';
import type { Product } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const EMPTY_PRODUCT: Omit<Product, 'id'> = {
  name: '',
  price: 0,
  wholesalePrice: 0,
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
  const [currentProduct, setCurrentProduct] = useState<Partial<Product>>({ ...EMPTY_PRODUCT });
  const [isSaving, setIsSaving] = useState(false);

  if (!context || context.isLoading) return <div>جار التحميل...</div>;
  const { products, categories, restaurants, addProduct, updateProduct, deleteProduct } = context;

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
    if (!currentProduct.name || !currentProduct.price || !currentProduct.categoryId || !currentProduct.restaurantId || !currentProduct.image) {
        toast({ title: "بيانات غير مكتملة", description: "الرجاء ملء جميع الحقول المطلوبة.", variant: "destructive" });
        return;
    }
    
    setIsSaving(true);
    try {
        if (isEditing && currentProduct.id) {
            await updateProduct(currentProduct as Partial<Product> & {id: string});
        } else {
            await addProduct(currentProduct as Omit<Product, 'id'>);
        }
        setOpen(false);
    } catch (error) {
        console.error("Failed to save product:", error);
        toast({ title: "فشل حفظ المنتج", description: "حدث خطأ أثناء محاولة حفظ المنتج.", variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
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
            <DialogContent className="sm:max-w-[425px]">
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
                        <Input id="price" type="number" value={currentProduct.price} onChange={(e) => setCurrentProduct({...currentProduct, price: parseFloat(e.target.value) || 0})} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="wholesalePrice" className="text-right">سعر الجملة</Label>
                        <Input id="wholesalePrice" type="number" value={currentProduct.wholesalePrice} onChange={(e) => setCurrentProduct({...currentProduct, wholesalePrice: parseFloat(e.target.value) || 0})} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="description" className="text-right">الوصف</Label>
                        <Input id="description" value={currentProduct.description} onChange={(e) => setCurrentProduct({...currentProduct, description: e.target.value})} className="col-span-3" />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                         <Label htmlFor="image" className="text-right">رابط الصورة</Label>
                         <Input id="image" value={currentProduct.image} onChange={(e) => setCurrentProduct({...currentProduct, image: e.target.value})} className="col-span-3" />
                    </div>
                    {currentProduct.image && <Image src={currentProduct.image} alt="preview" width={100} height={100} className="col-span-4 justify-self-center object-contain"/>}

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
                </div>
                <DialogFooter>
                    <Button type="submit" onClick={handleSaveProduct} disabled={isSaving}>
                        {isSaving && <Loader2 className="ml-2 h-4 w-4 animate-spin"/>}
                        حفظ
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>صورة</TableHead>
            <TableHead>اسم المنتج</TableHead>
            <TableHead>سعر البيع</TableHead>
            <TableHead>سعر الجملة</TableHead>
            <TableHead>القسم</TableHead>
            <TableHead>المتجر</TableHead>
            <TableHead>إجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id}>
              <TableCell>
                <Image src={product.image} alt={product.name} width={40} height={40} className="rounded-md object-cover" />
              </TableCell>
              <TableCell className="font-medium">{product.name}</TableCell>
              <TableCell>{formatCurrency(product.price)}</TableCell>
              <TableCell>{formatCurrency(product.wholesalePrice || 0)}</TableCell>
              <TableCell>{categories.find(c => c.id === product.categoryId)?.name || 'غير معروف'}</TableCell>
              <TableCell>{restaurants.find(r => r.id === product.restaurantId)?.name || 'غير معروف'}</TableCell>
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
    </div>
  );
}
