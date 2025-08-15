
"use client";

import { useContext } from 'react';
import { AppContext } from '@/contexts/AppContext';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { OrderStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Timestamp } from 'firebase/firestore';

export default function AdminOrdersPage() {
  const context = useContext(AppContext);
  
  if (!context || context.isLoading) return <div>جار التحميل...</div>;

  const { allOrders, updateOrderStatus } = context;

  const getStatusVariant = (status: OrderStatus) => {
    switch (status) {
      case 'confirmed': return 'bg-blue-500';
      case 'preparing': return 'bg-yellow-500';
      case 'on_the_way': return 'bg-orange-500';
      case 'delivered': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  }

  const toDate = (date: string | Timestamp): Date => {
    if (date instanceof Timestamp) {
        return date.toDate();
    }
    return new Date(date);
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold">إدارة الطلبات</h1>
        <p className="text-muted-foreground">عرض وتحديث حالة جميع الطلبات.</p>
      </header>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>رقم الطلب</TableHead>
            <TableHead>العميل</TableHead>
            <TableHead>التاريخ</TableHead>
            <TableHead>المبلغ</TableHead>
            <TableHead>الحالة</TableHead>
            <TableHead>إجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {allOrders.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-medium">{order.id}</TableCell>
              <TableCell>{order.user?.name || 'مستخدم محذوف'}</TableCell>
              <TableCell>{toDate(order.date).toLocaleString('ar-IQ')}</TableCell>
              <TableCell>{formatCurrency(order.total)}</TableCell>
              <TableCell>
                <Badge className={cn("text-white", getStatusVariant(order.status))}>
                    {order.status === "confirmed" ? "تم التأكيد" :
                     order.status === "preparing" ? "تحضير الطلب" :
                     order.status === "on_the_way" ? "في الطريق" :
                     order.status === "delivered" ? "تم التوصيل" :
                     order.status === "cancelled" ? "ملغي" :
                     order.status
                    }
                </Badge>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">فتح القائمة</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'preparing')}>تحضير الطلب</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'on_the_way')}>في الطريق</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'delivered')}>تم التوصيل</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'cancelled')} className="text-destructive">إلغاء الطلب</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
