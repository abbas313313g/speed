
"use client";

import { useContext, useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppContext } from '@/contexts/AppContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { DollarSign, ShoppingCart, ArrowRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';

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

  const stats = useMemo(() => {
    if (!context?.allOrders || !workerId) return { totalEarnings: 0, deliveredOrders: 0 };
    
    const myDeliveredOrders = context.allOrders.filter(order => order.deliveryWorkerId === workerId && order.status === 'delivered');
    const totalEarnings = myDeliveredOrders.reduce((acc, order) => acc + (order.deliveryFee || 0), 0);
    
    return { totalEarnings, deliveredOrders: myDeliveredOrders.length };
  }, [context?.allOrders, workerId]);


  return (
    <div className="p-4 space-y-8">
      <header className="flex items-center gap-4">
         <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowRight className="h-5 w-5"/>
         </Button>
         <div>
            <h1 className="text-3xl font-bold">إحصائيات الأداء</h1>
            <p className="text-muted-foreground">نظرة عامة على أرباحك وطلباتك المكتملة.</p>
         </div>
      </header>

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
