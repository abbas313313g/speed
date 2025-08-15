
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
import { Edit, Trash2, ShoppingBasket, Stethoscope, SwatchBook, Soup, Salad, ChefHat } from 'lucide-react';
import type { Category } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import React from 'react';

const iconMap: { [key: string]: React.ComponentType<{ className?: string }> } = {
  ShoppingBasket,
  Stethoscope,
  SwatchBook,
  Soup,
  Salad,
  ChefHat,
};
const iconNames = Object.keys(iconMap);

const EMPTY_CATEGORY: Omit<Category, 'id' | 'icon'> = {
    name: '',
    iconName: 'ShoppingBasket',
};

export default function AdminCategoriesPage() {
  const context = useContext(AppContext);
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<Omit<Category, 'icon'>>({ ...EMPTY_CATEGORY, id: '' });

  const { categories, addCategory, updateCategory, deleteCategory } = context!;

  const handleOpenDialog = (category?: Category) => {
    if (category) {
        setIsEditing(true);
        setCurrentCategory(category);
    } else {
        setIsEditing(false);
        setCurrentCategory({ ...EMPTY_CATEGORY, id: '' });
    }
    setOpen(true);
  }

  const handleSave = () => {
    if (currentCategory.name) {
        if (isEditing) {
            updateCategory(currentCategory as Category);
        } else {
            addCategory(currentCategory);
        }
        setOpen(false);
    }
  };

  if (!context) return null;

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold">إدارة الأقسام</h1>
            <p className="text-muted-foreground">عرض، إضافة، تعديل، وحذف الأقسام.</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>إضافة قسم جديد</Button>
      </header>
      
      <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'تعديل القسم' : 'إضافة قسم جديد'}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">اسم القسم</Label>
                        <Input id="name" value={currentCategory.name} onChange={(e) => setCurrentCategory({...currentCategory, name: e.target.value})} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="iconName" className="text-right">الأيقونة</Label>
                        <Select value={currentCategory.iconName} onValueChange={(value) => setCurrentCategory({...currentCategory, iconName: value})}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="اختر أيقونة" />
                            </SelectTrigger>
                            <SelectContent>
                                {iconNames.map(name => (
                                    <SelectItem key={name} value={name}>
                                        <div className="flex items-center gap-2">
                                            {React.createElement(iconMap[name], { className: "h-5 w-5" })}
                                            <span>{name}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button type="submit" onClick={handleSave}>حفظ</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>أيقونة</TableHead>
            <TableHead>اسم القسم</TableHead>
            <TableHead>إجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((category) => (
            <TableRow key={category.id}>
              <TableCell>
                 <category.icon className="h-6 w-6" />
              </TableCell>
              <TableCell className="font-medium">{category.name}</TableCell>
              <TableCell>
                  <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" onClick={() => handleOpenDialog(category)}>
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
                                    هذا الإجراء سيقوم بحذف القسم "{category.name}" بشكل نهائي.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteCategory(category.id)}>حذف</AlertDialogAction>
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
