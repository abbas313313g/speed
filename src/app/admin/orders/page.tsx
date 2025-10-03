
"use client";

import React, { useState, useContext } from 'react';
import { AppContext } from '@/contexts/AppContext';
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
  const context = useContext(AppContext);
  const { toast } = useToast();
  
  if (!context || context.isLoading) return <div>جار تحميل الطلبات...</div>;
  
  const { allOrders, deleteOrder, updateOrderStatus } = context;


  const handleUpdateStatus = async (orderId: string, status: OrderStatus) => {
    await updateOrderStatus(orderId, status);
    toast({ title: `تم تحديث حالة الطلب إلى: ${getStatusText(status)}` });
  };
  
  const handleDelete = async (orderId: string) => {
      await deleteOrder(orderId);
      toast({ title: "تم حذف الطلب بنجاح", variant: "destructive" });
  }

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
        {allOrders.length > 0 ? (
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
                          <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'unassigned')}>بانتظار سائق</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'confirmed')}>تم التأكيد</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'preparing')}>تحضير الطلب</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'on_the_way')}>في الطريق</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'delivered')}>تم التوصيل</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'cancelled')}>إلغاء الطلب</DropdownMenuItem>
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
                              <AlertDialogAction onClick={() => handleDelete(order.id)} className="bg-destructive hover:bg-destructive/90">حذف</AlertDialogAction>
                          </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
            <p className="text-center text-muted-foreground py-8">لا توجد طلبات لعرضها.</p>
        )}
    </div>
  );
}
