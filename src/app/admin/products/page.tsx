
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { products, categories, restaurants } from '@/lib/mock-data';
import { formatCurrency } from '@/lib/utils';
import Image from 'next/image';

export default function AdminProductsPage() {
  const context = useContext(AppContext);
  const [open, setOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({
      name: '',
      price: '',
      description: '',
      image: '',
      categoryId: '',
      restaurantId: '',
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewProduct({ ...newProduct, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProduct = () => {
    if (context && newProduct.name && newProduct.price && newProduct.categoryId && newProduct.restaurantId) {
        context.addProduct({
            ...newProduct,
            price: parseFloat(newProduct.price),
            image: newProduct.image || 'https://placehold.co/600x400.png',
        });
        setOpen(false);
        setNewProduct({
          name: '',
          price: '',
          description: '',
          image: '',
          categoryId: '',
          restaurantId: '',
        });
    }
  };


  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold">إدارة المنتجات</h1>
            <p className="text-muted-foreground">عرض وإضافة منتجات جديدة.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>إضافة منتج جديد</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>إضافة منتج جديد</DialogTitle>
                    <DialogDescription>
                        أدخل تفاصيل المنتج الجديد هنا.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">الاسم</Label>
                        <Input id="name" value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} className="col-span-3" />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="price" className="text-right">السعر</Label>
                        <Input id="price" type="number" value={newProduct.price} onChange={(e) => setNewProduct({...newProduct, price: e.target.value})} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="description" className="text-right">الوصف</Label>
                        <Input id="description" value={newProduct.description} onChange={(e) => setNewProduct({...newProduct, description: e.target.value})} className="col-span-3" />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                         <Label htmlFor="image" className="text-right">صورة</Label>
                         <Input id="image" type="file" onChange={handleImageUpload} className="col-span-3" accept="image/*" />
                    </div>
                    {newProduct.image && <Image src={newProduct.image} alt="preview" width={100} height={100} className="col-span-4 justify-self-center"/>}

                    <div className="grid grid-cols-4 items-center gap-4">
                         <Label htmlFor="category" className="text-right">القسم</Label>
                         <Select onValueChange={(value) => setNewProduct({...newProduct, categoryId: value})}>
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
                         <Select onValueChange={(value) => setNewProduct({...newProduct, restaurantId: value})}>
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
                    <Button type="submit" onClick={handleSaveProduct}>حفظ المنتج</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </header>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>صورة</TableHead>
            <TableHead>اسم المنتج</TableHead>
            <TableHead>السعر</TableHead>
            <TableHead>القسم</TableHead>
            <TableHead>المتجر</TableHead>
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
              <TableCell>{categories.find(c => c.id === product.categoryId)?.name || 'غير معروف'}</TableCell>
              <TableCell>{restaurants.find(r => r.id === product.restaurantId)?.name || 'غير معروف'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
