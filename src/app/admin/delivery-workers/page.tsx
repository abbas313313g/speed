
"use client";

import { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { DeliveryWorker } from '@/lib/types';
import { useDeliveryWorkers } from '@/hooks/useDeliveryWorkers';
import { useOrders } from '@/hooks/useOrders';
import { Button } from '@/components/ui/button';
import { doc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface WorkerWallet {
    worker: DeliveryWorker;
    deliveryEarnings: number; // أجرته (unpaid)
    cashToOffice: number; // فلوس الطلبات (unpaid)
    unpaidFeeIds: string[];
    unpaidCashIds: string[];
}

export default function AdminDeliveryWorkersPage() {
  const { deliveryWorkers, isLoading: workersLoading } = useDeliveryWorkers();
  const { allOrders, isLoading: ordersLoading } = useOrders();
  const { toast } = useToast();

  const wallets: WorkerWallet[] = useMemo(() => {
    if (!deliveryWorkers || !allOrders) return [];
    return deliveryWorkers.map(w => {
        const orders = allOrders.filter(o => o.deliveryWorkerId === w.id && o.status === 'delivered');
        const unpaidFees = orders.filter(o => !o.isFeePaid);
        const unpaidCash = orders.filter(o => !o.isOrderPaidToOffice);
        return {
            worker: w,
            deliveryEarnings: unpaidFees.reduce((acc, o) => acc + o.deliveryFee, 0),
            cashToOffice: unpaidCash.reduce((acc, o) => acc + (o.total - o.deliveryFee), 0),
            unpaidFeeIds: unpaidFees.map(o => o.id),
            unpaidCashIds: unpaidCash.map(o => o.id),
        };
    }).filter(w => w.deliveryEarnings > 0 || w.cashToOffice > 0);
  }, [deliveryWorkers, allOrders]);

  const clearSettlement = async (ids: string[], field: 'isFeePaid' | 'isOrderPaidToOffice') => {
      if (ids.length === 0) return;
      const batch = writeBatch(db);
      ids.forEach(id => batch.update(doc(db, "orders", id), { [field]: true }));
      await batch.commit();
      toast({ title: "تمت التصفية بنجاح" });
  }

  if (workersLoading || ordersLoading) return <div className="p-8 text-center animate-pulse">جار جلب البيانات المالية...</div>;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-black text-primary">تسوية حسابات المناديب</h1>
        <p className="text-muted-foreground">تصفية أجور المناديب واستلام مبالغ الطلبات.</p>
      </header>

      {wallets.length === 0 ? <p className="text-center text-muted-foreground py-20 font-bold italic">لا توجد مستحقات مالية حالياً.</p> : 
      <Card className="rounded-[2rem] border-none shadow-2xl overflow-hidden">
        <Table>
            <TableHeader className="bg-muted/50">
            <TableRow>
                <TableHead className="font-black">الكابتن</TableHead>
                <TableHead className="font-black">أرباحه (يدفعها المكتب)</TableHead>
                <TableHead className="font-black">ذمة للمكتب (يسلمها المندوب)</TableHead>
                <TableHead className="font-black">إجراءات التصفية</TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
            {wallets.map((w) => (
                <TableRow key={w.worker.id}>
                    <TableCell className="font-bold">{w.worker.name}<div className="text-[10px] text-muted-foreground">{w.worker.id}</div></TableCell>
                    <TableCell className="font-black text-primary">{formatCurrency(w.deliveryEarnings)}</TableCell>
                    <TableCell className="font-black text-destructive">{formatCurrency(w.cashToOffice)}</TableCell>
                    <TableCell>
                        <div className="flex flex-col gap-2">
                            <Button size="sm" variant="outline" className="rounded-lg h-9 font-bold border-primary text-primary" onClick={()=>clearSettlement(w.unpaidFeeIds, 'isFeePaid')} disabled={w.unpaidFeeIds.length === 0}>تصفية أجور الكابتن</Button>
                            <Button size="sm" variant="outline" className="rounded-lg h-9 font-bold border-destructive text-destructive" onClick={()=>clearSettlement(w.unpaidCashIds, 'isOrderPaidToOffice')} disabled={w.unpaidCashIds.length === 0}>استلام ذمة المكتب</Button>
                        </div>
                    </TableCell>
                </TableRow>
            ))}
            </TableBody>
        </Table>
      </Card>}
    </div>
  );
}
