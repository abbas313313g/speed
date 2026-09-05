
"use client";

import React, { useState, useMemo } from 'react';
import { useOrders } from '@/hooks/useOrders';
import { useDeliveryWorkers } from '@/hooks/useDeliveryWorkers';
import type { Order, OrderStatus, DeliveryWorker } from '@/lib/types';
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
import { Label } from '@/components/ui/label';
import { MoreHorizontal, Trash2, Loader2, Search, X, UserCog, RefreshCw, Bike, ChevronRight, Store, Clock, Phone, MapPin, ListFilter, Ticket } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

export default function AdminOrdersPage({ branchId }: { branchId: string }) {
  const { toast } = useToast();
  const { allOrders, isLoading, deleteOrder, updateOrderStatus } = useOrders(branchId);
  const { deliveryWorkers } = useDeliveryWorkers();
  
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [orderToAssign, setOrderToAssign] = useState<string | null>(null);

  const filteredOrders = useMemo(() => {
    return allOrders.filter(o => o.branchId === branchId);
  }, [allOrders, branchId]);
  
  if (isLoading) return <div className="p-20 text-center animate-pulse"><Loader2 className="h-10 w-10 animate-spin text-primary mx-auto"/><p className="mt-4 font-black">جارِ تحميل الطلبات...</p></div>;
  
  const handleUpdateStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await updateOrderStatus(orderId, status);
      toast({ title: "تم التحديث بنجاح" });
    } catch(e) {}
  };

  const handleManualAssign = async (worker: DeliveryWorker) => {
      if (!orderToAssign) return;
      try {
          await updateDoc(doc(db, "orders", orderToAssign), {
              deliveryWorkerId: worker.id,
              deliveryWorker: { id: worker.id, name: worker.name },
              status: 'confirmed', 
              confirmedAt: new Date().toISOString()
          });
          toast({ title: `تم التعيين للكابتن ${worker.name}` });
          setAssignDialogOpen(false);
          setOrderToAssign(null);
      } catch (e) {
          toast({ title: "فشل التعيين", variant: "destructive" });
      }
  };
  
  const handleDelete = async (orderId: string) => {
      await deleteOrder(orderId);
      setSelectedOrderIds(prev => prev.filter(id => id !== orderId));
  }

  const toggleSelectOrder = (id: string) => {
      setSelectedOrderIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const getStatusText = (status: OrderStatus) => {
        switch (status) {
            case 'unassigned': return "بانتظار المتجر";
            case 'pending_assignment': return "بحث...";
            case 'confirmed': return "بانتظار المندوب";
            case 'preparing': return "قيد التحضير";
            case 'ready_for_pickup': return "جاهز";
            case 'on_the_way': return "بالطريق";
            case 'delivered': return "تم التوصيل";
            case 'cancelled': return "ملغي";
            default: return status;
        }
    }

  return (
    <div className="space-y-8 text-right">
      <header className="flex justify-between items-start">
        <div>
            <h1 className="text-3xl font-black text-primary italic leading-none">إدارة الطلبات</h1>
            <p className="text-muted-foreground font-bold text-xs mt-1">متابعة كافة تفاصيل الوجبات والخصومات والمناديب.</p>
        </div>
      </header>

        <div className="bg-white rounded-[1.5rem] border shadow-xl overflow-x-auto">
            <Table className="min-w-[1000px]">
                <TableHeader className="bg-muted/50">
                <TableRow>
                    <TableHead className="w-[40px]"><Checkbox checked={selectedOrderIds.length === filteredOrders.length && filteredOrders.length > 0} onCheckedChange={() => {}}/></TableHead>
                    <TableHead className="font-black text-right">رقم القائمة</TableHead>
                    <TableHead className="font-black text-right">المتجر</TableHead>
                    <TableHead className="font-black text-right">المندوب</TableHead>
                    <TableHead className="font-black text-right">الخصم</TableHead>
                    <TableHead className="font-black text-right text-primary">المبلغ الصافي</TableHead>
                    <TableHead className="font-black text-right">الحالة</TableHead>
                    <TableHead className="font-black text-center">إجراء</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {filteredOrders.map((order) => (
                    <TableRow key={order.id} className={cn("hover:bg-muted/30 transition-colors cursor-pointer", selectedOrderIds.includes(order.id) && "bg-primary/5")} onClick={() => setViewOrder(order)}>
                    <TableCell onClick={(e) => e.stopPropagation()}><Checkbox checked={selectedOrderIds.includes(order.id)} onCheckedChange={() => toggleSelectOrder(order.id)}/></TableCell>
                    <TableCell className="font-bold">#{order.orderNumber}</TableCell>
                    <TableCell className="font-black text-slate-800">{order.restaurant?.name}</TableCell>
                    <TableCell className="text-right">
                        {order.deliveryWorker ? (
                            <div className="flex flex-col">
                                <div className="flex items-center gap-1 justify-end font-black text-xs">
                                    <span>{order.deliveryWorker.name}</span>
                                    <Bike className="h-3 w-3 text-primary" />
                                </div>
                                {order.status === 'confirmed' && <span className="text-[8px] font-bold text-orange-500 animate-pulse">بانتظار موافقته...</span>}
                            </div>
                        ) : <span className="text-[9px] italic opacity-40">لم يحدد</span>}
                    </TableCell>
                    <TableCell className="text-right">
                        {order.appliedCoupon ? (
                            <Badge variant="outline" className="text-red-600 border-red-100 bg-red-50 gap-1 text-[9px] h-6">
                                <Ticket className="h-2 w-2" /> {formatCurrency(order.appliedCoupon.discountAmount)}
                            </Badge>
                        ) : '-'}
                    </TableCell>
                    <TableCell className="font-black text-primary">{formatCurrency(order.total)}</TableCell>
                    <TableCell>
                        <Badge className={cn("text-white font-black rounded-lg text-[9px]", 
                            order.status === 'delivered' ? "bg-green-600" : 
                            order.status === 'cancelled' ? "bg-red-600" : "bg-blue-500")}>
                            {getStatusText(order.status)}
                        </Badge>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-center items-center gap-1">
                            <AlertDialog>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="rounded-xl font-bold">
                                <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'pending_assignment')} className="gap-2"><RefreshCw className="h-4 w-4"/> إعادة تدوير</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'delivered')}>تم التوصيل</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'cancelled')}>إلغاء</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => { setOrderToAssign(order.id); setAssignDialogOpen(true); }} className="text-orange-600 gap-2"><UserCog className="h-4 w-4"/> تعيين يدوي</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <AlertDialogTrigger asChild>
                                    <DropdownMenuItem className="text-destructive gap-2"><Trash2 className="h-4 w-4" /> حذف</DropdownMenuItem>
                                </AlertDialogTrigger>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <AlertDialogContent className="rounded-[2.5rem]">
                                <AlertDialogHeader><AlertDialogTitle className="text-right">حذف الطلب؟</AlertDialogTitle></AlertDialogHeader>
                                <AlertDialogFooter className="flex-row gap-2"><AlertDialogCancel className="flex-1 rounded-xl">تراجع</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(order.id)} className="bg-destructive flex-1 rounded-xl">حذف</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
        </div>

        <Dialog open={!!viewOrder} onOpenChange={(v) => !v && setViewOrder(null)}>
            <DialogContent className="sm:max-w-xl max-h-[95vh] overflow-y-auto rounded-[2.5rem] p-0 border-none">
                {viewOrder && (
                    <div className="flex flex-col text-right">
                        <DialogHeader className="p-6 bg-slate-900 text-white rounded-t-[2.5rem]">
                            <div className="flex justify-between items-center flex-row-reverse">
                                <div>
                                    <DialogTitle className="text-3xl font-black italic">فاتورة #{viewOrder.orderNumber}</DialogTitle>
                                    <div className="flex items-center gap-2 justify-end mt-2">
                                        <Badge className="bg-primary text-white text-[10px]">{getStatusText(viewOrder.status)}</Badge>
                                        <span className="text-[10px] font-bold opacity-60">{new Date(viewOrder.date).toLocaleString('ar-IQ')}</span>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => setViewOrder(null)} className="text-white rounded-full"><X className="h-6 w-6"/></Button>
                            </div>
                        </DialogHeader>

                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-primary/5 p-4 rounded-2xl border-2 border-primary/10">
                                    <Label className="text-[10px] font-black text-primary uppercase mb-1 block">المتجر المصدر</Label>
                                    <p className="font-black text-slate-800 flex items-center gap-2 justify-end"><Store className="h-4 w-4"/> {viewOrder.restaurant?.name}</p>
                                </div>
                                <div className="bg-blue-50 p-4 rounded-2xl border-2 border-blue-100">
                                    <Label className="text-[10px] font-black text-blue-600 uppercase mb-1 block">موقع التوصيل</Label>
                                    <p className="font-black text-slate-800 flex items-center gap-2 justify-end"><MapPin className="h-4 w-4"/> {viewOrder.address.deliveryZone}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-black text-lg">تفاصيل الوجبات:</h3>
                                <div className="space-y-2">
                                    {viewOrder.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-3 bg-muted/20 rounded-xl border border-dashed">
                                            <span className="font-black text-primary">{formatCurrency((item.selectedSize?.price || item.product.price || 0) * item.quantity)}</span>
                                            <p className="font-black text-sm">{item.product.name} <span className="text-primary mx-1">x{item.quantity}</span></p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {viewOrder.appliedCoupon && (
                                <div className="p-4 bg-red-50 border-2 border-red-100 rounded-2xl flex justify-between items-center">
                                    <span className="font-black text-red-600">-{formatCurrency(viewOrder.appliedCoupon.discountAmount)}</span>
                                    <span className="font-bold text-red-800 flex items-center gap-2"><Ticket className="h-4 w-4"/> قيمة الخصم الممنوح:</span>
                                </div>
                            )}

                            <div className="p-5 bg-slate-900 text-white rounded-2xl flex justify-between items-center shadow-xl">
                                <span className="text-3xl font-black tracking-tighter text-green-400">{formatCurrency(viewOrder.total)}</span>
                                <span className="font-black text-lg">الإجمالي كاش</span>
                            </div>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    </div>
  );
}
