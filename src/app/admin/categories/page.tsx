
"use client";

import { useContext, useState } from 'react';
import Image from 'next/image';
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

export default function AdminCategoriesPage() {
  const context = useContext(AppContext);
  const [open, setOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({
      name: '',
      iconName: '', // We'll just manage name for now as icon is complex
  });

  const handleSave = () => {
    if (context && newCategory.name) {
        context.addCategory(newCategory);
        setOpen(false);
        setNewCategory({ name: '', iconName: '' });
    }
  };

  if (!context) return null;

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold">إدارة الأقسام</h1>
            <p className="text-muted-foreground">عرض وإضافة أقسام جديدة.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>إضافة قسم جديد</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>إضافة قسم جديد</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">اسم القسم</Label>
                        <Input id="name" value={newCategory.name} onChange={(e) => setNewCategory({...newCategory, name: e.target.value})} className="col-span-3" />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="submit" onClick={handleSave}>حفظ القسم</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </header>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>أيقونة</TableHead>
            <TableHead>اسم القسم</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {context.categories.map((category) => (
            <TableRow key={category.id}>
              <TableCell>
                 <category.icon className="h-6 w-6" />
              </TableCell>
              <TableCell className="font-medium">{category.name}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
