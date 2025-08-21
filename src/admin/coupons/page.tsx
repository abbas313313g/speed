
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
} from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Loader2 } from 'lucide-react';
import type { Coupon } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';


const EMPTY_COUPON: Omit<Coupon, 'id' | 'usedCount' | 'usedBy'> = {
    code: '',
    discountType: 'fixed',
    discountValue: 0,
    maxUses: 1,
};

export default function AdminCouponsPage() {
  const context = useContext(AppContext);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [currentCoupon, setCurrentCoupon] = useState<Omit<Coupon, 'id' | 'usedCount' | 'usedBy'>>({ ...EMPTY_COUPON });
  const [isSaving, setIsSaving] = useState(false);

  if (!context || context.isLoading) return <div>جار التحميل...</div>;
  const { coupons, addCoupon, deleteCoupon } = context;
  
  const handleSave = async () => {
    if (!currentCoupon.code || currentCoupon.discountValue <= 0 || currentCoupon.maxUses <= 0) {
        toast({ title: "بيانات غير صحيحة", description: "الرجاء التأكد من ملء جميع الحقول بشكل صحيح.", variant: "destructive"});
        return;
    }
    setIsSaving(true);
    await addCoupon(currentCoupon);
    setIsSaving(false);
    setOpen(false);
    setCurrentCoupon({...EMPTY_COUPON});
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold">إدارة أكواد الخصم</h1>
            <p className="text-muted-foreground">إنشاء وحذف أكواد الخصم الخاصة بالعملاء.</p>
        </div>
        <Button onClick={() => setOpen(true)}>إنشاء كود جديد</Button>
      </header>

      <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>إنشاء كود خصم جديد</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="code" className="text-right">الكود</Label>
                        <Input id="code" value={currentCoupon.code} onChange={(e) => setCurrentCoupon({...currentCoupon, code: e.target.value.toUpperCase()})} className="col-span-3" />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="discountValue" className="text-right">قيمة الخصم</Label>
                        <Input id="discountValue" type="number" value={currentCoupon.discountValue || ''} onChange={(e) => setCurrentCoupon({...currentCoupon, discountValue: e.target.value === '' ? 0 : parseFloat(e.target.value)})} className="col-span-3" />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="maxUses" className="text-right">أقصى عدد استخدام</Label>
                        <Input id="maxUses" type="number" value={currentCoupon.maxUses || ''} onChange={(e) => setCurrentCoupon({...currentCoupon, maxUses: e.target.value === '' ? 0 : parseInt(e.target.value)})} className="col-span-3" />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="submit" onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="ml-2 h-4 w-4 animate-spin"/>}
                        حفظ الكود
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>الكود</TableHead>
            <TableHead>قيمة الخصم</TableHead>
            <TableHead>حالة الاستخدام</TableHead>
            <TableHead>إجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {coupons.map((coupon) => (
            <TableRow key={coupon.id}>
              <TableCell className="font-medium"><Badge variant="outline">{coupon.code}</Badge></TableCell>
              <TableCell>{formatCurrency(coupon.discountValue)}</TableCell>
              <TableCell>{coupon.usedCount} / {coupon.maxUses}</TableCell>
              <TableCell>
                  <div className="flex items-center gap-2">
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
                                    هذا الإجراء سيقوم بحذف كود الخصم "{coupon.code}" بشكل نهائي.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteCoupon(coupon.id)}>حذف</AlertDialogAction>
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
