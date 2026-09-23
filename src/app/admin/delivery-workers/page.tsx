
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
import { formatCurrency, cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { useDeliveryWorkers } from '@/hooks/useDeliveryWorkers';
import { Badge } from '@/components/ui/badge';
import { Wallet, Banknote, UserCheck, Loader2 } from 'lucide-react';

export default function AdminDeliveryWorkersPage({ branchId }: { branchId: string }) {
  const { deliveryWorkers, isLoading: workersLoading } = useDeliveryWorkers(branchId);

  const sortedWorkers = useMemo(() => {
    return [...deliveryWorkers].filter(w => w.branchId === branchId).sort((a, b) => ((b.walletBalance || 0) + (b.officeDebt || 0)) - ((a.walletBalance || 0) + (a.officeDebt || 0)));
  }, [deliveryWorkers, branchId]);

  if (workersLoading) return <div className="p-20 text-center animate-pulse font-black text-primary">جارِ جرد الخزائن السحابية...</div>;

  return (
    <div className="space-y-8 text-right p-4">
      <header>
        <h1 className="text-4xl font-black text-primary">محافظ المناديب السحابية</h1>
        <p className="text-muted-foreground font-bold italic">نظام جرد الأموال المحفوظة سحابياً بشكل دائم.</p>
      </header>

      {sortedWorkers.length === 0 ? (
          <div className="p-20 text-center bg-white rounded-[3rem] border-2 border-dashed">
              <UserCheck className="h-16 w-16 mx-auto text-green-500/30 mb-4" />
              <p className="text-xl font-black text-muted-foreground">لا توجد سجلات مناديب لهذا الفرع.</p>
          </div>
      ) : (
          <div className="grid gap-6">
              {sortedWorkers.map((w) => (
                  <Card key={w.id} className="rounded-[2.5rem] border-none shadow-xl overflow-hidden bg-white">
                      <div className="bg-primary/5 p-6 border-b border-dashed flex justify-between items-center flex-row-reverse">
                          <div className="text-right">
                              <h3 className="text-xl font-black">{w.name}</h3>
                              <p className="text-[10px] font-bold text-muted-foreground" dir="ltr">{w.id}</p>
                          </div>
                          <Badge variant="outline" className={cn("font-black", w.isOnline ? "text-green-600" : "text-slate-400")}>
                              {w.isOnline ? 'نشط الآن' : 'أوفلاين'}
                          </Badge>
                      </div>
                      <div className="grid md:grid-cols-2">
                          <div className="p-6 border-l border-dashed space-y-2">
                                <div className="flex items-center gap-2 text-primary justify-end">
                                    <span className="text-xs font-black">أرباح المندوب (المحفظة)</span>
                                    <Wallet className="h-5 w-5" />
                                </div>
                                <div className="text-3xl font-black text-primary tracking-tighter">{formatCurrency(w.walletBalance || 0)}</div>
                                <p className="text-[9px] font-bold text-muted-foreground">هذا المبلغ يُسلم للمندوب كأرباح توصيل.</p>
                          </div>
                          <div className="p-6 space-y-2">
                                <div className="flex items-center gap-2 text-destructive justify-end">
                                    <span className="text-xs font-black">ذمة للمكتب (كاش)</span>
                                    <Banknote className="h-5 w-5" />
                                </div>
                                <div className="text-3xl font-black text-destructive tracking-tighter">{formatCurrency(w.officeDebt || 0)}</div>
                                <p className="text-[9px] font-bold text-muted-foreground">هذا المبلغ يجب استلامه من المندوب ككاش مبيعات.</p>
                          </div>
                      </div>
                  </Card>
              ))}
          </div>
      )}
    </div>
  );
}
