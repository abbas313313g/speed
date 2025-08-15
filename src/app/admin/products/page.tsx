
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
      image: 'https://placehold.co/600x400.png',
      categoryId: '',
  });

  const handleSaveProduct = () => {
    if (context && newProduct.name && newProduct.price && newProduct.categoryId) {
        context.addProduct({
            ...newProduct,
            price: parseFloat(newProduct.price),
        });
        setOpen(false); // Close dialog
        setNewProduct({ // Reset form
          name: '',
          price: '',
          description: '',
          image: 'https://placehold.co/600x400.png',
          categoryId: '',
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
            <TableHead>المطعم</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id}>
              <TableCell>
                <Image src={product.image} alt={product.name} width={40} height={40} className="rounded-md" />
              </TableCell>
              <TableCell className="font-medium">{product.name}</TableCell>
              <TableCell>{formatCurrency(product.price)}</TableCell>
              <TableCell>{restaurants.find(r => r.id === product.restaurantId)?.name}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

