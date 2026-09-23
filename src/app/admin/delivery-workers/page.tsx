
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
import { Wallet, Banknote, UserCheck, Loader2, CheckCircle2, RotateCcw, Printer, Clock } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { doc, updateDoc, writeBatch } from 'firebase/firestore';

export default function AdminDeliveryWorkersPage({ branchId }: { branchId: string }) {
  const { deliveryWorkers, isLoading: workersLoading, updateWorkerDetails } = useDeliveryWorkers(branchId);
  const { allOrders } = useOrders(branchId);
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const workerBalances = useMemo(() => {
    return deliveryWorkers.map(w => {
        const delivered = allOrders.filter(o => o.deliveryWorkerId === w.id && o.status === 'delivered');
        
        const unpaidEarningsOrders = delivered.filter(o => !o.isFeePaid);
        const unpaidDebtOrders = delivered.filter(o => !o.isOrderPaidToOffice);

        const unpaidEarnings = unpaidEarningsOrders.reduce((acc, o) => acc + (o.deliveryFee || 0), 0);
        const unpaidDebt = unpaidDebtOrders.reduce((acc, o) => acc + (o.total || 0), 0);
        
        return {
            ...w,
            totalWallet: (w.walletBalance || 0) + (w.balanceAdjustment || 0) + unpaidEarnings,
            totalDebt: (w.officeDebt || 0) + (w.debtAdjustment || 0) + unpaidDebt,
            earningsCount: unpaidEarningsOrders.length,
            debtCount: unpaidDebtOrders.length
        };
    }).filter(w => w.branchId === branchId).sort((a, b) => (b.totalWallet + b.totalDebt) - (a.totalWallet + a.totalDebt));
  }, [deliveryWorkers, allOrders, branchId]);

  const handleSettleEarnings = async (workerId: string) => {
      setIsProcessing(workerId + '_earn');
      try {
          const now = new Date().toISOString();
          const delivered = allOrders.filter(o => o.deliveryWorkerId === workerId && o.status === 'delivered' && !o.isFeePaid);
          const batch = writeBatch(db);
          delivered.forEach(o => batch.update(doc(db, "orders", o.id), { isFeePaid: true }));
          batch.update(doc(db, "deliveryWorkers", workerId), { 
              balanceAdjustment: 0, 
              walletBalance: 0,
              lastProfitSettleAt: now
          });
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
          const now = new Date().toISOString();
          const delivered = allOrders.filter(o => o.deliveryWorkerId === workerId && o.status === 'delivered' && !o.isOrderPaidToOffice);
          const batch = writeBatch(db);
          delivered.forEach(o => batch.update(doc(db, "orders", o.id), { isOrderPaidToOffice: true }));
          batch.update(doc(db, "deliveryWorkers", workerId), { 
              debtAdjustment: 0, 
              officeDebt: 0,
              lastDebtSettleAt: now
          });
          await batch.commit();
          toast({ title: "تم تصفير ذمة الكابتن بنجاح ✅" });
      } catch (e) {
          toast({ title: "فشل تصفير الذمة", variant: "destructive" });
      } finally {
          setIsProcessing(null);
      }
  };

  const handlePrintWorkerReport = (worker: any) => {
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      const htmlContent = `
          <html dir="rtl">
          <head>
              <title>كشف حساب كابتن - ${worker.name}</title>
              <style>
                  body { font-family: 'Arial', sans-serif; padding: 40px; color: #333; }
                  .header { text-align: center; border-bottom: 4px solid #00b358; padding-bottom: 20px; margin-bottom: 30px; }
                  .section-box { border: 2px solid #eee; padding: 20px; border-radius: 20px; margin-bottom: 20px; }
                  .profit-box { background: #f0fff4; border-color: #00b358; }
                  .debt-box { background: #fff5f5; border-color: #ff4d4d; }
                  .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #eee; padding-top: 20px; }
                  .label { font-size: 14px; color: #666; font-weight: bold; }
                  .value { font-size: 24px; font-weight: 900; margin: 10px 0; }
              </style>
          </head>
          <body>
              <div class="header">
                  <h1 style="color: #00b358; margin: 0;">SPEED SHOP</h1>
                  <p>كشف الحساب المالي المعتمد للكابتن</p>
              </div>
              
              <div style="text-align: right; margin-bottom: 30px;">
                  <h2 style="margin: 0;">الكابتن: ${worker.name}</h2>
                  <p>رقم الهاتف: ${worker.id}</p>
                  <p>الفرع: ${worker.branchId === 'main' ? 'المركز الرئيسي' : worker.branchId}</p>
              </div>

              <div class="section-box profit-box">
                  <p class="label">إجمالي أرباح التوصيل المستحقة</p>
                  <h1 class="value" style="color: #00b358;">${formatCurrency(worker.totalWallet)}</h1>
                  <p style="margin: 0; font-size: 12px;">عدد الطلبات غير المصفاة: ${worker.earningsCount}</p>
                  <p style="margin: 5px 0 0 0; font-size: 10px; color: #888;">آخر تصفية أرباح: ${worker.lastProfitSettleAt ? new Date(worker.lastProfitSettleAt).toLocaleString('ar-IQ') : 'لم تتم تصفية أرباح مسبقاً'}</p>
              </div>

              <div class="section-box debt-box">
                  <p class="label">إجمالي ذمة الكاش (للمكتب)</p>
                  <h1 class="value" style="color: #ff4d4d;">${formatCurrency(worker.totalDebt)}</h1>
                  <p style="margin: 0; font-size: 12px;">عدد فواتير الكاش غير المسلمة: ${worker.debtCount}</p>
                  <p style="margin: 5px 0 0 0; font-size: 10px; color: #888;">آخر تصفير ذمة: ${worker.lastDebtSettleAt ? new Date(worker.lastDebtSettleAt).toLocaleString('ar-IQ') : 'لم يتم تسليم كاش مسبقاً'}</p>
              </div>

              <div class="footer">
                  <p>تاريخ الاستخراج: ${new Date().toLocaleString('ar-IQ')}</p>
                  <p>هذا الكشف صادر آلياً من نظام سبيد شوب المحاسبي السحابي</p>
              </div>
              <script>window.print();</script>
          </body>
          </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
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
                              <div className="flex items-center gap-2 justify-end">
                                  <h3 className="text-xl font-black">{w.name}</h3>
                                  <Button variant="outline" size="icon" className="rounded-xl h-9 w-9 border-2" onClick={() => handlePrintWorkerReport(w)}>
                                      <Printer className="h-4 w-4 text-primary" />
                                  </Button>
                              </div>
                              <p className="text-[10px] font-bold text-muted-foreground mt-1" dir="ltr">{w.id}</p>
                              <div className="flex flex-col gap-1 mt-2">
                                  {w.lastProfitSettleAt && (
                                      <div className="flex items-center gap-1 justify-end text-[8px] font-bold text-green-600">
                                          <span>آخر تصفية أرباح: {new Date(w.lastProfitSettleAt).toLocaleString('ar-IQ')}</span>
                                          <Clock className="h-2 w-2"/>
                                      </div>
                                  )}
                                  {w.lastDebtSettleAt && (
                                      <div className="flex items-center gap-1 justify-end text-[8px] font-bold text-red-600">
                                          <span>آخر تصفية ذمة: {new Date(w.lastDebtSettleAt).toLocaleString('ar-IQ')}</span>
                                          <Clock className="h-2 w-2"/>
                                      </div>
                                  )}
                              </div>
                          </div>
                          <Badge variant="outline" className={cn("font-black px-4", w.isOnline ? "text-green-600 border-green-200" : "text-slate-400")}>
                              {w.isOnline ? 'نشط الآن' : 'أوفلاين'}
                          </Badge>
                      </div>
                      <div className="grid md:grid-cols-2">
                          <div className="p-6 border-l border-dashed space-y-4">
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between flex-row-reverse">
                                        <div className="flex items-center gap-2 text-primary justify-end">
                                            <span className="text-xs font-black">أرباح المندوب (المحفظة)</span>
                                            <Wallet className="h-5 w-5" />
                                        </div>
                                        <Badge variant="secondary" className="font-black text-[9px]">{w.earningsCount} طلب</Badge>
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
                                    <div className="flex items-center justify-between flex-row-reverse">
                                        <div className="flex items-center gap-2 text-destructive justify-end">
                                            <span className="text-xs font-black">ذمة للمكتب (كاش)</span>
                                            <Banknote className="h-5 w-5" />
                                        </div>
                                        <Badge variant="secondary" className="font-black text-[9px] bg-red-50 text-red-600 border-none">{w.debtCount} وصل</Badge>
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
