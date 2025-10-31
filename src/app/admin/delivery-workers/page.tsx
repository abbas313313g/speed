
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
import { Trash2 } from 'lucide-react';

interface WorkerStats {
    worker: DeliveryWorker;
    unpaidOrdersCount: number;
    totalUnpaidEarnings: number;
    unpaidOrderIds: string[];
}

export default function AdminDeliveryWorkersPage() {
  const { deliveryWorkers, isLoading: workersLoading } = useDeliveryWorkers();
  const { allOrders, isLoading: ordersLoading, markDeliveryFeesAsPaid } = useOrders();

  const stats: WorkerStats[] = useMemo(() => {
    if (!deliveryWorkers || !allOrders) return [];

    return deliveryWorkers.map(worker => {
        const workerUnpaidOrders = allOrders.filter(order => 
            order.deliveryWorkerId === worker.id && 
            order.status === 'delivered' &&
            !order.isFeePaid
        );
        
        const totalUnpaidEarnings = workerUnpaidOrders.reduce((acc, order) => acc + order.deliveryFee, 0);
        
        return {
            worker,
            unpaidOrdersCount: workerUnpaidOrders.length,
            totalUnpaidEarnings,
            unpaidOrderIds: workerUnpaidOrders.map(o => o.id),
        };
    }).sort((a, b) => b.totalUnpaidEarnings - a.totalUnpaidEarnings);

  }, [deliveryWorkers, allOrders]);

  const handleMarkAsPaid = async (orderIds: string[]) => {
      if (orderIds.length === 0) return;
      await markDeliveryFeesAsPaid(orderIds);
  }

  if (workersLoading || ordersLoading) return <div>جار التحميل...</div>;
  
  const validStats = stats.filter(s => s.unpaidOrdersCount > 0);

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">تسوية حسابات عمال التوصيل</h1>
          <p className="text-muted-foreground">عرض وتسوية أجور التوصيل المستحقة للعمال من الطلبات المكتملة.</p>
        </div>
      </header>

      {validStats.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">لا توجد أجور مستحقة للعمال حالياً.</p>
      ) : (
        <Card>
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>اسم السائق</TableHead>
                    <TableHead>رقم الهاتف</TableHead>
                    <TableHead>الطلبات المستحقة</TableHead>
                    <TableHead>إجمالي الأجور المستحقة</TableHead>
                    <TableHead>إجراء</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {validStats.map((stat) => (
                    <TableRow key={stat.worker.id}>
                    <TableCell className="font-medium">{stat.worker.name}</TableCell>
                    <TableCell dir="ltr">{stat.worker.id}</TableCell>
                    <TableCell>{stat.unpaidOrdersCount}</TableCell>
                    <TableCell>{formatCurrency(stat.totalUnpaidEarnings)}</TableCell>
                     <TableCell>
                        <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" disabled={stat.unpaidOrderIds.length === 0}>تسوية ومسح السجل</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                                <AlertDialogDescription>
                                    سيؤدي هذا الإجراء إلى وضع علامة "مدفوع" على {stat.unpaidOrdersCount} طلبات للعامل "{stat.worker.name}" وإزالتها من هذا التقرير. لا يمكن التراجع عن هذا الإجراء.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleMarkAsPaid(stat.unpaidOrderIds)}>نعم، قم بالتسوية</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                        </AlertDialog>
                    </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
        </Card>
      )}
    </div>
  );
}
