
"use client";

import { useMemo, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency, cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { useDeliveryWorkers } from '@/hooks/useDeliveryWorkers';
import { useOrders } from '@/hooks/useOrders';
import { Badge } from '@/components/ui/badge';
import { Wallet, Banknote, UserCheck, Loader2, CheckCircle2, RotateCcw } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { doc, updateDoc, writeBatch } from 'firebase/firestore';

export default function AdminDeliveryWorkersPage({ branchId }: { branchId: string }) {
  const { deliveryWorkers, isLoading: workersLoading, adjustWorkerBalance } = useDeliveryWorkers(branchId);
  const { allOrders } = useOrders(branchId);
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // حساب المبالغ: (الرصيد الدائم + الطلبات غير المصفاة)
  const workerBalances = useMemo(() => {
    return deliveryWorkers.map(w => {
        const delivered = allOrders.filter(o => o.deliveryWorkerId === w.id && o.status === 'delivered');
        
        const unpaidEarnings = delivered.filter(o => !o.isFeePaid).reduce((acc, o) => acc + (o.deliveryFee || 0), 0);
        const unpaidDebt = delivered.filter(o => !o.isOrderPaidToOffice).reduce((acc, o) => acc + (o.total || 0), 0);
        
        return {
            ...w,
            totalWallet: (w.walletBalance || 0) + (w.balanceAdjustment || 0) + unpaidEarnings,
            totalDebt: (w.officeDebt || 0) + (w.debtAdjustment || 0) + unpaidDebt
        };
    }).filter(w => w.branchId === branchId).sort((a, b) => (b.totalWallet + b.totalDebt) - (a.totalWallet + a.totalDebt));
  }, [deliveryWorkers, allOrders, branchId]);

  const handleSettleEarnings = async (workerId: string) => {
      setIsProcessing(workerId + '_earn');
      try {
          const delivered = allOrders.filter(o => o.deliveryWorkerId === workerId && o.status === 'delivered' && !o.isFeePaid);
          const batch = writeBatch(db);
          delivered.forEach(o => batch.update(doc(db, "orders", o.id), { isFeePaid: true }));
          batch.update(doc(db, "deliveryWorkers", workerId), { balanceAdjustment: 0, walletBalance: 0 });
          await batch.commit();
          toast({ title: "تمت تصفية أرباح الكابتن بنجاح ✅" });
      } catch (e) {
          toast({ title: "فشل التصفية", variant: "destructive" });
      } finally {
          setIsProcessing(null);
      }
  };

  const handleSettleDebt = async (workerId: string) => {
      setIsProcessing(workerId + '_debt');
      try {
          const delivered = allOrders.filter(o => o.deliveryWorkerId === workerId && o.status === 'delivered' && !o.isOrderPaidToOffice);
          const batch = writeBatch(db);
          delivered.forEach(o => batch.update(doc(db, "orders", o.id), { isOrderPaidToOffice: true }));
          batch.update(doc(db, "deliveryWorkers", workerId), { debtAdjustment: 0, officeDebt: 0 });
          await batch.commit();
          toast({ title: "تم تصفير ذمة الكابتن بنجاح ✅" });
      } catch (e) {
          toast({ title: "فشل تصفير الذمة", variant: "destructive" });
      } finally {
          setIsProcessing(null);
      }
  };

  if (workersLoading) return <div className="p-20 text-center animate-pulse font-black text-primary">جارِ جرد الخزائن السحابية...</div>;

  return (
    <div className="p-4 space-y-8 text-right h-full flex flex-col overflow-hidden">
      <header className="shrink-0">
        <h1 className="text-3xl font-black text-primary">محافظ المناديب</h1>
        <p className="text-muted-foreground font-bold text-xs mt-1">إدارة أرباح التوصيل وذمة الكاش النقدية لكل كابتن.</p>
      </header>

      <ScrollArea className="flex-1">
          <div className="grid gap-6 pb-20">
              {workerBalances.map((w) => (
                  <Card key={w.id} className="rounded-[2.5rem] border-none shadow-xl overflow-hidden bg-white">
                      <div className="bg-primary/5 p-6 border-b border-dashed flex justify-between items-center flex-row-reverse">
                          <div className="text-right">
                              <h3 className="text-xl font-black">{w.name}</h3>
                              <p className="text-[10px] font-bold text-muted-foreground" dir="ltr">{w.id}</p>
                          </div>
                          <Badge variant="outline" className={cn("font-black px-4", w.isOnline ? "text-green-600 border-green-200" : "text-slate-400")}>
                              {w.isOnline ? 'نشط الآن' : 'أوفلاين'}
                          </Badge>
                      </div>
                      <div className="grid md:grid-cols-2">
                          <div className="p-6 border-l border-dashed space-y-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-primary justify-end">
                                        <span className="text-xs font-black">أرباح المندوب (المحفظة)</span>
                                        <Wallet className="h-5 w-5" />
                                    </div>
                                    <div className="text-4xl font-black text-primary tracking-tighter">{formatCurrency(w.totalWallet)}</div>
                                </div>
                                <Button 
                                    className="w-full h-12 rounded-xl font-black gap-2" 
                                    variant="outline"
                                    disabled={isProcessing === w.id + '_earn' || w.totalWallet <= 0}
                                    onClick={() => handleSettleEarnings(w.id)}
                                >
                                    {isProcessing === w.id + '_earn' ? <Loader2 className="animate-spin h-4 w-4"/> : <CheckCircle2 className="h-4 w-4"/>}
                                    تصفية الأرباح
                                </Button>
                          </div>
                          <div className="p-6 space-y-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-destructive justify-end">
                                        <span className="text-xs font-black">ذمة للمكتب (كاش)</span>
                                        <Banknote className="h-5 w-5" />
                                    </div>
                                    <div className="text-4xl font-black text-destructive tracking-tighter">{formatCurrency(w.totalDebt)}</div>
                                </div>
                                <Button 
                                    className="w-full h-12 rounded-xl font-black gap-2" 
                                    variant="destructive"
                                    disabled={isProcessing === w.id + '_debt' || w.totalDebt <= 0}
                                    onClick={() => handleSettleDebt(w.id)}
                                >
                                    {isProcessing === w.id + '_debt' ? <Loader2 className="animate-spin h-4 w-4"/> : <RotateCcw className="h-4 w-4"/>}
                                    تصفير الذمة (استلام كاش)
                                </Button>
                          </div>
                      </div>
                  </Card>
              ))}
              {workerBalances.length === 0 && <div className="p-20 text-center bg-white rounded-[3rem] border-2 border-dashed font-bold italic opacity-40">لا توجد سجلات مناديب في هذا الفرع.</div>}
          </div>
      </ScrollArea>
    </div>
  );
}
