
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
import { Card } from '@/components/ui/card';
import type { DeliveryWorker } from '@/lib/types';
import { useDeliveryWorkers } from '@/hooks/useDeliveryWorkers';
import { useOrders } from '@/hooks/useOrders';
import { Button } from '@/components/ui/button';
import { doc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Wallet, Banknote, UserCheck } from 'lucide-react';

interface WorkerWallet {
    worker: DeliveryWorker;
    deliveryEarnings: number; 
    cashToOffice: number; 
    unpaidFeeIds: string[];
    unpaidCashIds: string[];
}

export default function AdminDeliveryWorkersPage({ branchId }: { branchId: string }) {
  const { deliveryWorkers, isLoading: workersLoading } = useDeliveryWorkers(branchId);
  const { allOrders, isLoading: ordersLoading } = useOrders(branchId);
  const { toast } = useToast();

  const wallets: WorkerWallet[] = useMemo(() => {
    if (!deliveryWorkers || !allOrders) return [];
    
    return deliveryWorkers.filter(w => w.branchId === branchId).map(w => {
        const orders = allOrders.filter(o => o.deliveryWorkerId === w.id && o.status === 'delivered');
        
        // حساب أرباح المندوب (أجور التوصيل غير المدفوعة له)
        const unpaidFeesOrders = orders.filter(o => !o.isFeePaid);
        const deliveryEarnings = unpaidFeesOrders.reduce((acc, o) => acc + (o.deliveryFee || 0), 0) + (w.balanceAdjustment || 0);

        // حساب ذمة المندوب للمكتب (الكاش الذي استلمه ولم يسلمه)
        const unpaidCashOrders = orders.filter(o => !o.isOrderPaidToOffice);
        const cashToOffice = unpaidCashOrders.reduce((acc, o) => acc + (o.total || 0), 0) + (w.debtAdjustment || 0);

        return {
            worker: w,
            deliveryEarnings,
            cashToOffice,
            unpaidFeeIds: unpaidFeesOrders.map(o => o.id),
            unpaidCashIds: unpaidCashOrders.map(o => o.id),
        };
    }).filter(w => w.deliveryEarnings > 0 || w.cashToOffice > 0);
  }, [deliveryWorkers, allOrders, branchId]);

  const clearSettlement = async (workerId: string, ids: string[], field: 'isFeePaid' | 'isOrderPaidToOffice') => {
      try {
          const batch = writeBatch(db);
          // وسم الطلبات كمدفوعة لكي تسقط من الحسبة فوراً
          ids.forEach(id => batch.update(doc(db, "orders", id), { [field]: true }));
          
          // تصفير أي تعديلات يدوية قديمة عند تصفية الحساب بالكامل
          const adjField = field === 'isFeePaid' ? 'balanceAdjustment' : 'debtAdjustment';
          batch.update(doc(db, "deliveryWorkers", workerId), { [adjField]: 0 });
          
          await batch.commit();
          toast({ title: "تمت التصفية المالية بنجاح ✅" });
      } catch (e) {
          toast({ title: "فشل التصفية", variant: "destructive" });
      }
  }

  if (workersLoading || ordersLoading) return <div className="p-20 text-center animate-pulse font-black text-primary">جارِ جرد الحسابات المالية...</div>;

  return (
    <div className="space-y-8 text-right">
      <header>
        <h1 className="text-4xl font-black text-primary">تصفية حسابات المناديب</h1>
        <p className="text-muted-foreground font-bold italic">نظام جرد المحافظ الصافي والنهائي بناءً على الطلبات.</p>
      </header>

      {wallets.length === 0 ? (
          <div className="p-20 text-center bg-white rounded-[3rem] border-2 border-dashed">
              <UserCheck className="h-16 w-16 mx-auto text-green-500/30 mb-4" />
              <p className="text-xl font-black text-muted-foreground">كافة حسابات مناديب هذا الفرع مصفاة.</p>
          </div>
      ) : (
          <div className="grid gap-6">
              {wallets.map((w) => (
                  <Card key={w.worker.id} className="rounded-[2.5rem] border-none shadow-xl overflow-hidden bg-white">
                      <div className="bg-primary/5 p-6 border-b border-dashed flex justify-between items-center flex-row-reverse">
                          <div className="text-right">
                              <h3 className="text-xl font-black">{w.worker.name}</h3>
                              <p className="text-[10px] font-bold text-muted-foreground" dir="ltr">{w.worker.id}</p>
                          </div>
                          <Badge variant="outline" className="font-black">نشط</Badge>
                      </div>
                      <div className="grid md:grid-cols-2">
                          <div className="p-6 border-l border-dashed space-y-4">
                                <div className="flex items-center gap-2 text-primary justify-end">
                                    <span className="text-xs font-black">أرباح المندوب (المحفظة)</span>
                                    <Wallet className="h-5 w-5" />
                                </div>
                                <div className="text-3xl font-black text-primary tracking-tighter">{formatCurrency(w.deliveryEarnings)}</div>
                                <Button className="w-full h-12 rounded-2xl font-black shadow-lg" onClick={() => clearSettlement(w.worker.id, w.unpaidFeeIds, 'isFeePaid')} disabled={w.deliveryEarnings <= 0}>دفع المستحقات للمندوب</Button>
                          </div>
                          <div className="p-6 space-y-4">
                                <div className="flex items-center gap-2 text-destructive justify-end">
                                    <span className="text-xs font-black">ذمة للمكتب (كاش)</span>
                                    <Banknote className="h-5 w-5" />
                                </div>
                                <div className="text-3xl font-black text-destructive tracking-tighter">{formatCurrency(w.cashToOffice)}</div>
                                <Button variant="outline" className="w-full h-12 rounded-2xl font-black border-destructive text-destructive" onClick={() => clearSettlement(w.worker.id, w.unpaidCashIds, 'isOrderPaidToOffice')} disabled={w.cashToOffice <= 0}>تصفية الكاش المستلم</Button>
                          </div>
                      </div>
                  </Card>
              ))}
          </div>
      )}
    </div>
  );
}
