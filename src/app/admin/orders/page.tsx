

"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import type { Order, OrderStatus } from '@/lib/types';
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
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Trash2 } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
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
import { useToast } from '@/hooks/use-toast';

export default function AdminOrdersPage() {
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const q = collection(db, "orders");
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const ordersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      ordersData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setAllOrders(ordersData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching orders: ", error);
      toast({ title: "خطأ في جلب الطلبات", variant: "destructive" });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    const orderDocRef = doc(db, "orders", orderId);
    await updateDoc(orderDocRef, { status });
    toast({ title: `تم تحديث حالة الطلب إلى: ${getStatusText(status)}` });
  };

  const deleteOrder = async (orderId: string) => {
    const orderRef = doc(db, "orders", orderId);
    await deleteDoc(orderRef);
    toast({ title: "تم حذف الطلب بنجاح", variant: "destructive" });
  };
  
  if (isLoading) return <div>جار تحميل الطلبات...</div>;

  const getStatusVariant = (status: OrderStatus) => {
    switch (status) {
      case 'unassigned': return 'bg-gray-400';
      case 'pending_assignment': return 'bg-purple-500';
      case 'confirmed': return 'bg-blue-500';
      case 'preparing': return 'bg-yellow-500';
      case 'on_the_way': return 'bg-orange-500';
      case 'delivered': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

   const getStatusText = (status: OrderStatus) => {
        switch (status) {
            case 'unassigned': return "بانتظار سائق";
            case 'pending_assignment': return "جارِ التعيين...";
            case 'confirmed': return "تم التأكيد";
            case 'preparing': return "تحضير الطلب";
            case 'on_the_way': return "في الطريق";
            case 'delivered': return "تم التوصيل";
            case 'cancelled': return "ملغي";
            default: return status;
        }
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
            <TableHead>السائق</TableHead>
            <TableHead>التاريخ</TableHead>
            <TableHead>المبلغ</TableHead>
            <TableHead>الحالة</TableHead>
            <TableHead>إجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {allOrders.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-medium">#{order.id.substring(0, 6)}</TableCell>
              <TableCell>{order.address.name}</TableCell>
              <TableCell>{order.deliveryWorker?.name || 'لم يعين'}</TableCell>
              <TableCell>{new Date(order.date).toLocaleString('ar-IQ')}</TableCell>
              <TableCell>{formatCurrency(order.total)}</TableCell>
              <TableCell>
                <Badge className={cn("text-white", getStatusVariant(order.status))}>
                    {getStatusText(order.status)}
                </Badge>
              </TableCell>
              <TableCell>
                <AlertDialog>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">فتح القائمة</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'unassigned')}>بانتظار سائق</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'confirmed')}>تم التأكيد</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'preparing')}>تحضير الطلب</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'on_the_way')}>في الطريق</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'delivered')}>تم التوصيل</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'cancelled')}>إلغاء الطلب</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem className="text-destructive" onSelect={(e) => e.preventDefault()}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            حذف الطلب
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <AlertDialogContent>
                      <AlertDialogHeader>
                          <AlertDialogTitle>هل أنت متأكد من الحذف؟</AlertDialogTitle>
                          <AlertDialogDescription>
                              هذا الإجراء سيقوم بحذف الطلب رقم #{order.id.substring(0, 6)} بشكل نهائي. لا يمكن التراجع عن هذا الإجراء.
                          </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                          <AlertDialogCancel>إلغاء</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteOrder(order.id)} className="bg-destructive hover:bg-destructive/90">حذف</AlertDialogAction>
                      </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
