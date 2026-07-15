
"use client";

import { useState } from 'react';
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
import { Trash2, Loader2, Store, UserPlus } from 'lucide-react';
import type { Coupon } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useCoupons } from '@/hooks/useCoupons';
import { useRestaurants } from '@/hooks/useRestaurants';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

const EMPTY_COUPON: Omit<Coupon, 'id' | 'usedCount' | 'usedBy'> = {
    code: '',
    discountType: 'fixed',
    discountValue: 0,
    maxUses: 100,
    restaurantId: '',
    isFirstOrderOnly: false
};

export default function AdminCouponsPage() {
  const { toast } = useToast();
  const { coupons, isLoading: couponsLoading, addCoupon, deleteCoupon } = useCoupons();
  const { restaurants, isLoading: storesLoading } = useRestaurants();
  
  const [open, setOpen] = useState(false);
  const [currentCoupon, setCurrentCoupon] = useState<Omit<Coupon, 'id' | 'usedCount' | 'usedBy'>>({ ...EMPTY_COUPON });
  const [isSaving, setIsSaving] = useState(false);

  const isLoading = couponsLoading || storesLoading;
  if (isLoading) return <div className="p-8 text-center animate-pulse font-bold">جارِ تحميل الأكواد...</div>;
  
  const handleSave = async () => {
    if (!currentCoupon.code || currentCoupon.discountValue <= 0) {
        toast({ title: "بيانات ناقصة", variant: "destructive"});
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
            <h1 className="text-3xl font-black text-primary">إدارة أكواد الخصم</h1>
            <p className="text-muted-foreground font-bold">إنشاء أكواد مخصصة لمتاجر معينة أو للطلب الأول.</p>
        </div>
        <Button onClick={() => setOpen(true)} className="rounded-xl h-12 px-6">إنشاء كود جديد</Button>
      </header>

      <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-md rounded-[2.5rem]">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black">إنشاء كود خصم مطور</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4 text-right">
                    <div className="space-y-1">
                        <Label className="font-bold">كود الخصم (نص)</Label>
                        <Input value={currentCoupon.code} onChange={(e) => setCurrentCoupon({...currentCoupon, code: e.target.value.toUpperCase()})} className="h-12 rounded-xl text-center text-xl font-black" placeholder="SPEED2024" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label className="font-bold">قيمة الخصم (IQD)</Label>
                            <Input type="number" value={currentCoupon.discountValue || ''} onChange={(e) => setCurrentCoupon({...currentCoupon, discountValue: parseFloat(e.target.value) || 0})} className="h-12 rounded-xl font-bold" />
                        </div>
                        <div className="space-y-1">
                            <Label className="font-bold">أقصى عدد استخدام</Label>
                            <Input type="number" value={currentCoupon.maxUses || ''} onChange={(e) => setCurrentCoupon({...currentCoupon, maxUses: parseInt(e.target.value) || 0})} className="h-12 rounded-xl font-bold" />
                        </div>
                    </div>
                    
                    <div className="space-y-1">
                        <Label className="font-bold">تخصيص لمتجر (اختياري)</Label>
                        <Select value={currentCoupon.restaurantId} onValueChange={(val) => setCurrentCoupon({...currentCoupon, restaurantId: val})}>
                            <SelectTrigger className="h-12 rounded-xl">
                                <SelectValue placeholder="يعمل على كل المتاجر" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">كل المتاجر</SelectItem>
                                {restaurants.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border">
                        <div className="flex flex-col">
                            <span className="font-bold text-sm">للطلب الأول فقط</span>
                            <span className="text-[10px] text-muted-foreground">يعمل فقط للحسابات التي لم تطلب سابقاً</span>
                        </div>
                        <Switch checked={currentCoupon.isFirstOrderOnly} onCheckedChange={(val) => setCurrentCoupon({...currentCoupon, isFirstOrderOnly: val})} />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleSave} disabled={isSaving} className="w-full h-14 rounded-2xl text-lg font-black shadow-xl">
                        {isSaving ? <Loader2 className="animate-spin h-6 w-6"/> : "حفظ وتفعيل الكود"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

      <div className="bg-white rounded-[1.5rem] border shadow-xl overflow-hidden">
        <Table>
            <TableHeader className="bg-muted/50">
            <TableRow>
                <TableHead className="font-black">الكود</TableHead>
                <TableHead className="font-black">الخصم</TableHead>
                <TableHead className="font-black">التخصيص</TableHead>
                <TableHead className="font-black">الاستخدام</TableHead>
                <TableHead className="font-black">إجراءات</TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
            {coupons.map((coupon) => (
                <TableRow key={coupon.id}>
                <TableCell><Badge variant="outline" className="font-black text-lg px-4 py-1">{coupon.code}</Badge></TableCell>
                <TableCell className="font-black text-primary">{formatCurrency(coupon.discountValue)}</TableCell>
                <TableCell className="space-y-1">
                    {coupon.restaurantId ? (
                        <div className="flex items-center gap-1 text-xs font-bold text-orange-600"><Store className="h-3 w-3"/>{restaurants.find(r=>r.id === coupon.restaurantId)?.name}</div>
                    ) : <Badge variant="secondary" className="text-[10px]">عام</Badge>}
                    {coupon.isFirstOrderOnly && <div className="flex items-center gap-1 text-[10px] font-black text-blue-600"><UserPlus className="h-3 w-3"/>الطلب الأول</div>}
                </TableCell>
                <TableCell className="font-bold">{coupon.usedCount} / {coupon.maxUses}</TableCell>
                <TableCell>
                    <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                        <AlertDialogContent className="rounded-[2rem]">
                            <AlertDialogHeader><AlertDialogTitle>حذف الكود؟</AlertDialogTitle></AlertDialogHeader>
                            <AlertDialogFooter className="flex-row gap-2">
                                <AlertDialogCancel className="flex-1 rounded-xl">إلغاء</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteCoupon(coupon.id)} className="flex-1 bg-destructive hover:bg-destructive/90 rounded-xl">حذف</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </TableCell>
                </TableRow>
            ))}
            </TableBody>
        </Table>
      </div>
    </div>
  );
}
