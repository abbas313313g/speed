

"use client";

import { useContext, useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppContext } from '@/contexts/AppContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { DollarSign, ShoppingCart, ArrowRight, ShieldAlert } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { getWorkerLevel } from '@/lib/workerLevels';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

export default function DeliveryStatsPage() {
  const context = useContext(AppContext);
  const router = useRouter();
  const [workerId, setWorkerId] = useState<string | null>(null);

  useEffect(() => {
    const id = localStorage.getItem('deliveryWorkerId');
    if (!id) {
      router.replace('/delivery/login');
    } else {
      setWorkerId(id);
    }
  }, [router]);

  const { stats, worker, level, isFrozen } = useMemo(() => {
    if (!context || !workerId) {
        return { stats: { totalEarnings: 0, deliveredOrders: 0 }, worker: null, level: null, isFrozen: false };
    }
    
    const worker = context.deliveryWorkers.find(w => w.id === workerId);
    if (!worker) {
        return { stats: { totalEarnings: 0, deliveredOrders: 0 }, worker: null, level: null, isFrozen: false };
    }

    const myDeliveredOrders = context.allOrders.filter(order => order.deliveryWorkerId === workerId && order.status === 'delivered');
    const totalEarnings = myDeliveredOrders.reduce((acc, order) => acc + (order.deliveryFee || 0), 0);
    const deliveredOrders = myDeliveredOrders.length;
    
    const {level, isFrozen} = getWorkerLevel(worker, deliveredOrders, new Date());
    
    return { stats: { totalEarnings, deliveredOrders }, worker, level, isFrozen };
  }, [context, workerId]);


  if (!context || !workerId || context.isLoading) {
      return (
          <div className="p-4 space-y-6">
              <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10" />
                  <div className="space-y-2">
                     <Skeleton className="h-6 w-48" />
                     <Skeleton className="h-4 w-32" />
                  </div>
              </div>
              <Skeleton className="h-48 w-full" />
              <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
              </div>
          </div>
      )
  }

  const LevelIcon = level?.icon;

  return (
    <div className="p-4 space-y-6">
      <header className="flex items-center gap-4">
         <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowRight className="h-5 w-5"/>
         </Button>
         <div>
            <h1 className="text-2xl font-bold">المستويات والإحصائيات</h1>
            <p className="text-muted-foreground">مرحباً {worker?.name}، هذه أرباحك ومستواك.</p>
         </div>
      </header>

       {level && LevelIcon && (
        <Card className="bg-gradient-to-tr from-primary/10 to-transparent">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>مستواك الحالي</CardTitle>
                    {isFrozen && <div className="flex items-center gap-1 text-xs text-destructive font-semibold bg-destructive/10 px-2 py-1 rounded-full"><ShieldAlert className="h-4 w-4"/><span>مجمد</span></div>}
                </div>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center text-center space-y-3">
                <LevelIcon className="w-24 h-24" />
                <h2 className="text-3xl font-bold">{level.name}</h2>
                 {level.nextLevelThreshold && (
                     <div className="w-full pt-2">
                        <p className="text-sm text-muted-foreground mb-1">
                            {stats.deliveredOrders} / {level.nextLevelThreshold} طلب للترقية القادمة
                        </p>
                        <Progress value={(stats.deliveredOrders / level.nextLevelThreshold) * 100} />
                     </div>
                 )}
                 {isFrozen && (
                    <div className="w-full text-center p-2 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg">
                        <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">
                          مستواك مجمد! أكمل {10 - (worker?.unfreezeProgress || 0)} طلبات لإعادة تفعيله.
                        </p>
                         <Progress value={((worker?.unfreezeProgress || 0) / 10) * 100} className="mt-2 h-2"/>
                    </div>
                 )}
            </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الأرباح</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalEarnings)}</div>
            <p className="text-xs text-muted-foreground">من جميع الطلبات المكتملة</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الطلبات المكتملة</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{stats.deliveredOrders}</div>
             <p className="text-xs text-muted-foreground">إجمالي الطلبات التي قمت بتوصيلها</p>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
