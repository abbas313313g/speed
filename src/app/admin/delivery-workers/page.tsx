
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
import { Wallet, Banknote, UserCheck } from 'lucide-react';

interface WorkerWallet {
    worker: DeliveryWorker;
    deliveryEarnings: number; // أجرته (ما يدفعه المكتب له)
    cashToOffice: number; // ذمة المكتب (ما يسلمه المندوب للمكتب)
    unpaidFeeIds: string[];
    unpaidCashIds: string[];
}

export default function AdminDeliveryWorkersPage({ branchId }: { branchId: string }) {
  const { deliveryWorkers, isLoading: workersLoading } = useDeliveryWorkers(branchId);
  const { allOrders, isLoading: ordersLoading } = useOrders(branchId);
  const { toast } = useToast();

  const wallets: WorkerWallet[] = useMemo(() => {
    if (!deliveryWorkers || !allOrders) return [];
    return deliveryWorkers.map(w => {
        const orders = allOrders.filter(o => o.deliveryWorkerId === w.id && o.status === 'delivered');
        const unpaidFees = orders.filter(o => !o.isFeePaid);
        const unpaidCash = orders.filter(o => !o.isOrderPaidToOffice);
        return {
            worker: w,
            deliveryEarnings: unpaidFees.reduce((acc, o) => acc + (o.deliveryFee || 0), 0),
            cashToOffice: unpaidCash.reduce((acc, o) => acc + (o.total - (o.deliveryFee || 0)), 0),
            unpaidFeeIds: unpaidFees.map(o => o.id),
            unpaidCashIds: unpaidCash.map(o => o.id),
        };
    }).filter(w => w.deliveryEarnings > 0 || w.cashToOffice > 0);
  }, [deliveryWorkers, allOrders]);

  const clearSettlement = async (ids: string[], field: 'isFeePaid' | 'isOrderPaidToOffice') => {
      if (ids.length === 0) return;
      try {
          const batch = writeBatch(db);
          ids.forEach(id => batch.update(doc(db, "orders", id), { [field]: true }));
          await batch.commit();
          toast({ title: "تمت التصفية المالية بنجاح ✅" });
      } catch (e) {
          toast({ title: "فشل في عملية التصفية", variant: "destructive" });
      }
  }

  if (workersLoading || ordersLoading) return <div className="p-8 text-center animate-pulse font-black text-primary">جارِ جلب سجلات المحفظة والديون...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-4xl font-black text-primary">تصفية حسابات المناديب</h1>
        <p className="text-muted-foreground font-bold italic">إدارة الأرباح والذمم المالية لفرع: {branchId === 'main' ? 'الإدارة الرئيسية' : branchId}</p>
      </header>

      {wallets.length === 0 ? (
          <div className="p-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-muted">
              <UserCheck className="h-16 w-16 mx-auto text-green-500/30 mb-4" />
              <p className="text-xl font-black text-muted-foreground">كافة الحسابات مصفاة بالكامل!</p>
              <p className="text-sm text-muted-foreground/60 font-bold mt-2">لا توجد ديون أو مستحقات معلقة للمناديب في هذا الفرع.</p>
          </div>
      ) : (
          <div className="grid gap-6">
              {wallets.map((w) => (
                  <Card key={w.worker.id} className="rounded-[2.5rem] border-none shadow-xl overflow-hidden bg-white hover:shadow-2xl transition-all">
                      <div className="bg-primary/5 p-6 border-b border-dashed flex justify-between items-center">
                          <div className="flex items-center gap-4">
                              <div className="h-14 w-14 bg-primary text-white rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg shadow-primary/20">
                                  {w.worker.name.charAt(0)}
                              </div>
                              <div>
                                  <h3 className="text-xl font-black">{w.worker.name}</h3>
                                  <p className="text-xs font-bold text-muted-foreground font-mono">{w.worker.id}</p>
                              </div>
                          </div>
                          <Badge variant="outline" className="h-8 rounded-xl px-4 font-black bg-white">نشط</Badge>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-0">
                          {/* قسم الأرباح */}
                          <div className="p-6 border-l border-dashed space-y-4">
                                <div className="flex items-center gap-2 text-primary">
                                    <Wallet className="h-5 w-5" />
                                    <span className="text-xs font-black uppercase">أرباح المندوب (على المكتب)</span>
                                </div>
                                <div className="text-4xl font-black tracking-tighter text-primary">{formatCurrency(w.deliveryEarnings)}</div>
                                <p className="text-[10px] font-bold text-muted-foreground">إجمالي أجور التوصيل لـ {w.unpaidFeeIds.length} طلب لم تُدفع بعد.</p>
                                <Button 
                                    className="w-full h-12 rounded-2xl font-black text-lg shadow-lg shadow-primary/10"
                                    onClick={() => clearSettlement(w.unpaidFeeIds, 'isFeePaid')}
                                    disabled={w.unpaidFeeIds.length === 0}
                                >
                                    دفع أجور الكابتن
                                </Button>
                          </div>

                          {/* قسم الذمة */}
                          <div className="p-6 space-y-4">
                                <div className="flex items-center gap-2 text-destructive">
                                    <Banknote className="h-5 w-5" />
                                    <span className="text-xs font-black uppercase">ذمة المكتب (على المندوب)</span>
                                </div>
                                <div className="text-4xl font-black tracking-tighter text-destructive">{formatCurrency(w.cashToOffice)}</div>
                                <p className="text-[10px] font-bold text-muted-foreground">كاش الطلبات المستلم من الزبائن لـ {w.unpaidCashIds.length} طلب.</p>
                                <Button 
                                    variant="outline"
                                    className="w-full h-12 rounded-2xl font-black text-lg border-destructive text-destructive hover:bg-destructive/5"
                                    onClick={() => clearSettlement(w.unpaidCashIds, 'isOrderPaidToOffice')}
                                    disabled={w.unpaidCashIds.length === 0}
                                >
                                    استلام المبالغ من المندوب
                                </Button>
                          </div>
                      </div>
                  </Card>
              ))}
          </div>
      )}
    </div>
  );
}
