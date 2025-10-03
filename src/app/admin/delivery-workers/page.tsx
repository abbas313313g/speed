
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


interface WorkerStats {
    worker: DeliveryWorker;
    deliveredOrdersCount: number;
    totalEarnings: number;
}

export default function AdminDeliveryWorkersPage() {
  const { deliveryWorkers, isLoading: workersLoading } = useDeliveryWorkers();
  const { allOrders, isLoading: ordersLoading } = useOrders();

  const stats: WorkerStats[] = useMemo(() => {
    if (!deliveryWorkers || !allOrders) return [];

    return deliveryWorkers.map(worker => {
        const workerOrders = allOrders.filter(order => order.deliveryWorkerId === worker.id && order.status === 'delivered');
        const totalEarnings = workerOrders.reduce((acc, order) => acc + order.deliveryFee, 0);
        return {
            worker,
            deliveredOrdersCount: workerOrders.length,
            totalEarnings,
        };
    }).sort((a, b) => b.deliveredOrdersCount - a.deliveredOrdersCount);

  }, [deliveryWorkers, allOrders]);

  if (workersLoading || ordersLoading) return <div>جار التحميل...</div>;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold">إحصائيات عمال التوصيل</h1>
        <p className="text-muted-foreground">نظرة على أداء فريق التوصيل.</p>
      </header>

      <Card>
        <Table>
            <TableHeader>
            <TableRow>
                <TableHead>اسم السائق</TableHead>
                <TableHead>رقم الهاتف</TableHead>
                <TableHead>الطلبات المكتملة</TableHead>
                <TableHead>إجمالي الأرباح</TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
            {stats.map(({ worker, deliveredOrdersCount, totalEarnings }) => (
                <TableRow key={worker.id}>
                <TableCell className="font-medium">{worker.name}</TableCell>
                <TableCell dir="ltr">{worker.id}</TableCell>
                <TableCell>{deliveredOrdersCount}</TableCell>
                <TableCell>{formatCurrency(totalEarnings)}</TableCell>
                </TableRow>
            ))}
            </TableBody>
        </Table>
      </Card>
    </div>
  );
}
