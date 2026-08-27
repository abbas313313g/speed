
"use client";

import React, { useState, useMemo } from 'react';
import { useOrders } from '@/hooks/useOrders';
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
import { MoreHorizontal, Trash2, Loader2, Search, CheckSquare } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';

export default function AdminOrdersPage({ branchId }: { branchId: string }) {
  const { toast } = useToast();
  const { allOrders, isLoading, deleteOrder, updateOrderStatus } = useOrders(branchId);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  
  if (isLoading) return <div className="p-20 text-center flex flex-col items-center gap-4"><Loader2 className="h-10 w-10 animate-spin text-primary"/><p className="font-black text-primary">جارِ تحميل الطلبات...</p></div>;
  
  const handleUpdateStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await updateOrderStatus(orderId, status);
    } catch(e) {}
  };
  
  const handleDelete = async (orderId: string) => {
      await deleteOrder(orderId);
      setSelectedOrderIds(prev => prev.filter(id => id !== orderId));
  }

  const toggleSelectOrder = (id: string) => {
      setSelectedOrderIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
      if (selectedOrderIds.length === allOrders.length) {
          setSelectedOrderIds([]);
      } else {
          setSelectedOrderIds(allOrders.map(o => o.id));
      }
  };

  const handleBulkDelete = async () => {
      if (selectedOrderIds.length === 0) return;
      setIsBulkDeleting(true);
      const count = selectedOrderIds.length;
      try {
          for (const id of selectedOrderIds) {
              await deleteOrder(id);
          }
          setSelectedOrderIds([]);
          toast({ title: `تم حذف ${count} طلب بنجاح ✅` });
      } catch (e) {
          toast({ title: "فشل الحذف الجماعي", variant: "destructive" });
      } finally {
          setIsBulkDeleting(false);
      }
  };

  const getStatusVariant = (status: OrderStatus) => {
    switch (status) {
      case 'unassigned': return 'bg-gray-400';
      case 'pending_assignment': return 'bg-purple-500';
      case 'confirmed': return 'bg-blue-500';
      case 'preparing': return 'bg-yellow-500';
      case 'ready_for_pickup': return 'bg-teal-500';
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
            case 'ready_for_pickup': return "جاهز للاستلام";
            case 'on_the_way': return "في الطريق";
            case 'delivered': return "تم التوصيل";
            case 'cancelled': return "ملغي";
            default: return status;
        }
    }

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-start">
        <div>
            <h1 className="text-3xl font-black text-primary">إدارة الطلبات</h1>
            <p className="text-muted-foreground font-bold">عرض وتحديث حالة الطلبات التابعة للفرع الحالي.</p>
        </div>
        {selectedOrderIds.length > 0 && (
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="rounded-xl h-12 px-6 font-bold shadow-lg gap-2 animate-in zoom-in">
                        <Trash2 className="h-5 w-5" />
                        حذف المحددة ({selectedOrderIds.length})
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-[2.5rem]">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-right font-black">تأكيد الحذف الجماعي؟</AlertDialogTitle>
                        <AlertDialogDescription className="text-right font-bold text-muted-foreground">
                            أنت على وشك حذف {selectedOrderIds.length} طلب نهائياً من قاعدة البيانات. لا يمكن التراجع عن هذا الإجراء.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-row gap-3">
                        <AlertDialogCancel className="flex-1 rounded-xl">تراجع</AlertDialogCancel>
                        <AlertDialogAction onClick={handleBulkDelete} className="flex-1 rounded-xl bg-destructive hover:bg-destructive/90" disabled={isBulkDeleting}>
                            {isBulkDeleting ? <Loader2 className="animate-spin h-5 w-5" /> : "نعم، حذف الكل"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        )}
      </header>

        {allOrders.length > 0 ? (
          <div className="bg-white rounded-[1.5rem] border shadow-xl overflow-hidden">
            <Table>
                <TableHeader className="bg-muted/50">
                <TableRow>
                    <TableHead className="w-[50px]">
                        <Checkbox 
                            checked={selectedOrderIds.length === allOrders.length && allOrders.length > 0}
                            onCheckedChange={toggleSelectAll}
                        />
                    </TableHead>
                    <TableHead className="font-black">رقم الطلب</TableHead>
                    <TableHead className="font-black">العميل</TableHead>
                    <TableHead className="font-black">السائق</TableHead>
                    <TableHead className="font-black">التاريخ</TableHead>
                    <TableHead className="font-black">المبلغ</TableHead>
                    <TableHead className="font-black">الحالة</TableHead>
                    <TableHead className="font-black">إجراءات</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {allOrders.map((order) => (
                    <TableRow key={order.id} className={cn("hover:bg-muted/30 transition-colors", selectedOrderIds.includes(order.id) && "bg-primary/5")}>
                    <TableCell>
                        <Checkbox 
                            checked={selectedOrderIds.includes(order.id)}
                            onCheckedChange={() => toggleSelectOrder(order.id)}
                        />
                    </TableCell>
                    <TableCell className="font-bold">#{order.id.substring(0, 6)}</TableCell>
                    <TableCell className="font-bold">{order.address.name}</TableCell>
                    <TableCell className="text-xs font-bold text-muted-foreground">{order.deliveryWorker?.name || 'لم يعين'}</TableCell>
                    <TableCell className="text-[10px] font-bold">{new Date(order.date).toLocaleString('ar-IQ')}</TableCell>
                    <TableCell className="font-black text-primary">{formatCurrency(order.total)}</TableCell>
                    <TableCell>
                        <Badge className={cn("text-white font-black rounded-lg", getStatusVariant(order.status))}>
                            {getStatusText(order.status)}
                        </Badge>
                    </TableCell>
                    <TableCell>
                        <AlertDialog>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl font-bold">
                            <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'unassigned')}>بانتظار سائق</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'confirmed')}>تم التأكيد</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'preparing')}>تحضير الطلب</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'ready_for_pickup')}>جاهز للاستلام</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'on_the_way')}>في الطريق</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'delivered')}>تم التوصيل</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'cancelled')}>إلغاء الطلب</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem className="text-destructive" onSelect={(e) => e.preventDefault()}>
                                    <Trash2 className="ml-2 h-4 w-4" />
                                    حذف الطلب نهائياً
                                </DropdownMenuItem>
                            </AlertDialogTrigger>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <AlertDialogContent className="rounded-[2rem]">
                            <AlertDialogHeader>
                                <AlertDialogTitle className="text-right">تأكيد الحذف</AlertDialogTitle>
                                <AlertDialogDescription className="text-right font-bold">
                                    سيتم حذف هذا الطلب من سجلات الفرع نهائياً. لا يمكن التراجع.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="flex-row gap-2">
                                <AlertDialogCancel className="flex-1 rounded-xl">تراجع</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(order.id)} className="bg-destructive hover:bg-destructive/90 flex-1 rounded-xl">حذف الآن</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                        </AlertDialog>
                    </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
          </div>
        ) : (
            <div className="p-20 text-center bg-white rounded-[2rem] border-2 border-dashed">
                <p className="text-muted-foreground font-bold italic">لا توجد طلبات لهذا الفرع حالياً.</p>
            </div>
        )}
    </div>
  );
}

