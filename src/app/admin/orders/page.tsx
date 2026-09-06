
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
import { MoreHorizontal, Trash2, Loader2, Search, X, UserCog, RefreshCw, Bike, ChevronRight, Store, Clock, Phone, MapPin, ListFilter, Ticket, User, CheckCircle } from 'lucide-react';
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
  
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [orderToAssign, setOrderToAssign] = useState<string | null>(null);

  const filteredOrders = useMemo(() => {
    return allOrders.filter(o => o.branchId === branchId);
  }, [allOrders, branchId]);
  
  if (isLoading) return <div className="p-20 text-center animate-pulse"><Loader2 className="h-10 w-10 animate-spin text-primary mx-auto"/><p className="mt-4 font-black text-primary">جارِ تحميل الطلبات...</p></div>;
  
  const handleUpdateStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await updateOrderStatus(orderId, status);
      toast({ title: "تم التحديث بنجاح" });
    } catch(e) {}
  };

  const handleManualAssign = async (worker: DeliveryWorker) => {
      if (!orderToAssign) return;
      try {
          // التعيين اليدوي يصبح مباشر بدون انتظار موافقة المندوب
          await updateDoc(doc(db, "orders", orderToAssign), {
              deliveryWorkerId: worker.id,
              deliveryWorker: { id: worker.id, name: worker.name },
              status: 'preparing', 
              confirmedAt: null
          });
          toast({ title: `تم إسناد الطلب للكابتن ${worker.name} بنجاح ✅` });
          setAssignDialogOpen(false);
          setOrderToAssign(null);
      } catch (e) {
          toast({ title: "فشل التعيين", variant: "destructive" });
      }
  };
  
  const handleDelete = async (orderId: string) => {
      await deleteOrder(orderId);
  }

  const getStatusText = (status: OrderStatus) => {
        switch (status) {
            case 'unassigned': return "بانتظار المتجر";
            case 'pending_assignment': return "جارِ البحث...";
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
    <div className="space-y-6 text-right">
      <header>
          <h1 className="text-2xl font-black text-primary italic">إدارة الطلبات</h1>
      </header>

        <div className="bg-white rounded-2xl border shadow-lg overflow-hidden">
            <Table>
                <TableHeader className="bg-muted/30 h-12">
                <TableRow>
                    <TableHead className="font-black text-right w-[80px]">القائمة</TableHead>
                    <TableHead className="font-black text-right">المتجر</TableHead>
                    <TableHead className="font-black text-center w-[100px]">الحالة</TableHead>
                    <TableHead className="font-black text-center w-[60px]">أدوات</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {filteredOrders.map((order) => (
                    <TableRow key={order.id} className="hover:bg-primary/5 transition-colors cursor-pointer h-12" onClick={() => setViewOrder(order)}>
                        <TableCell className="font-black text-xs">#{order.orderNumber}</TableCell>
                        <TableCell className="font-black text-slate-700 text-xs truncate max-w-[120px]">
                            {order.restaurant?.name}
                        </TableCell>
                        <TableCell className="text-center">
                            <Badge className={cn("text-white font-black rounded-md text-[8px] px-2 h-5", 
                                order.status === 'delivered' ? "bg-green-600" : 
                                order.status === 'cancelled' ? "bg-red-600" : "bg-blue-500")}>
                                {getStatusText(order.status)}
                            </Badge>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-center">
                                <AlertDialog>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild><Button variant="ghost" className="h-7 w-7 p-0 rounded-lg hover:bg-slate-100"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="rounded-xl font-bold min-w-[180px]">
                                    <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'pending_assignment')} className="gap-2 h-10"><RefreshCw className="h-4 w-4 text-blue-600"/> إعادة تدوير (بحث)</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'delivered')} className="gap-2 h-10"><CheckCircle className="h-4 w-4 text-green-600"/> تم التوصيل</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'cancelled')} className="gap-2 h-10"><X className="h-4 w-4 text-red-600"/> إلغاء الطلب</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => { setOrderToAssign(order.id); setAssignDialogOpen(true); }} className="text-orange-600 gap-2 h-10"><UserCog className="h-4 w-4"/> تعيين مندوب فوراً</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <AlertDialogTrigger asChild>
                                        <DropdownMenuItem className="text-destructive gap-2 h-10"><Trash2 className="h-4 w-4" /> حذف الفاتورة</DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                <AlertDialogContent className="rounded-[2.5rem]">
                                    <AlertDialogHeader><AlertDialogTitle className="text-right">حذف الطلب؟</AlertDialogTitle><AlertDialogDescription className="text-right">هل أنت متأكد من حذف الفاتورة #{order.orderNumber}؟ لا يمكن التراجع.</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter className="flex-row gap-2"><AlertDialogCancel className="flex-1 rounded-xl">تراجع</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(order.id)} className="bg-destructive flex-1 rounded-xl">نعم، حذف</AlertDialogAction></AlertDialogFooter>
                                </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
            {filteredOrders.length === 0 && <div className="p-10 text-center text-muted-foreground font-bold italic text-xs">لا يوجد طلبات حالياً.</div>}
        </div>

        <Dialog open={!!viewOrder} onOpenChange={(v) => !v && setViewOrder(null)}>
            <DialogContent className="sm:max-w-xl max-h-[95vh] overflow-y-auto rounded-[2.5rem] p-0 border-none shadow-2xl">
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
                                <Button variant="ghost" size="icon" onClick={() => setViewOrder(null)} className="text-white rounded-full hover:bg-white/10"><X className="h-6 w-6"/></Button>
                            </div>
                        </DialogHeader>

                        <div className="p-6 space-y-6">
                            <div className="bg-slate-50 p-5 rounded-[2rem] border-2 border-dashed border-slate-200 space-y-4">
                                <div className="flex items-center gap-3 justify-end text-primary font-black">
                                    <span>بيانات الزبون الكاملة</span>
                                    <User className="h-5 w-5"/>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-right">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground">الاسم</Label>
                                        <p className="font-black">{viewOrder.address.name}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground">الهاتف</Label>
                                        <p className="font-black font-mono tracking-wider" dir="ltr">{viewOrder.address.phone}</p>
                                    </div>
                                    <div className="space-y-1 col-span-2">
                                        <Label className="text-[10px] text-muted-foreground">العنوان والملاحظات</Label>
                                        <p className="font-bold text-sm text-slate-700 bg-white p-3 rounded-xl border">{viewOrder.address.deliveryZone} - {viewOrder.address.details || 'بدون ملاحظات'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-primary/5 p-4 rounded-2xl border-2 border-primary/10">
                                    <Label className="text-[10px] font-black text-primary uppercase mb-1 block">المتجر المصدر</Label>
                                    <p className="font-black text-slate-800 flex items-center gap-2 justify-end"><Store className="h-4 w-4"/> {viewOrder.restaurant?.name}</p>
                                </div>
                                <div className="bg-blue-50 p-4 rounded-2xl border-2 border-blue-100">
                                    <Label className="text-[10px] font-black text-blue-600 uppercase mb-1 block">المندوب المسؤول</Label>
                                    <p className="font-black text-slate-800 flex items-center gap-2 justify-end"><Bike className="h-4 w-4"/> {viewOrder.deliveryWorker?.name || 'لم يحدد بعد'}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-black text-lg text-slate-800 border-r-4 border-primary pr-3">قائمة الوجبات المطلوبة:</h3>
                                <div className="space-y-2">
                                    {viewOrder.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-4 bg-muted/10 rounded-2xl border border-dashed">
                                            <span className="font-black text-primary text-lg">{formatCurrency((item.selectedSize?.price || item.product.price || 0) * item.quantity)}</span>
                                            <div className="text-right">
                                                <p className="font-black text-sm">{item.product.name} <span className="text-primary mx-1">x{item.quantity}</span></p>
                                                {item.selectedSize && <Badge variant="secondary" className="text-[8px] font-bold mt-1">{item.selectedSize.name}</Badge>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3 pt-4 border-t border-dashed">
                                <div className="flex justify-between items-center text-sm font-bold text-muted-foreground px-2">
                                    <span>أجور التوصيل:</span>
                                    <span>{formatCurrency(viewOrder.deliveryFee)}</span>
                                </div>
                                {viewOrder.appliedCoupon && (
                                    <div className="flex justify-between items-center text-sm font-bold text-red-600 px-2">
                                        <span>خصم الكود ({viewOrder.appliedCoupon.code}):</span>
                                        <span>-{formatCurrency(viewOrder.appliedCoupon.discountAmount)}</span>
                                    </div>
                                )}
                                <div className="p-5 bg-slate-900 text-white rounded-[2rem] flex justify-between items-center shadow-2xl mt-4">
                                    <div className="flex flex-col">
                                        <span className="font-black text-lg">المجموع كاش</span>
                                        <span className="text-[8px] opacity-60">شامل الوجبات والتوصيل والخصم</span>
                                    </div>
                                    <span className="text-4xl font-black tracking-tighter text-green-400 drop-shadow-md">{formatCurrency(viewOrder.total)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>

        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
            <DialogContent className="sm:max-w-md rounded-[2.5rem]">
                <DialogHeader><DialogTitle className="text-2xl font-black text-right">إسناد الطلب فوراً</DialogTitle></DialogHeader>
                <div className="py-4 space-y-3">
                    <p className="text-xs font-bold text-muted-foreground text-right mb-4">عند اختيار المندوب، سيتم تعيين الطلب له مباشرة دون الحاجة لموافقته.</p>
                    <ScrollArea className="h-[300px] pr-2">
                        <div className="space-y-2">
                            {deliveryWorkers.filter(w => w.isOnline && w.isActive !== false).map(worker => (
                                <button 
                                    key={worker.id}
                                    onClick={() => handleManualAssign(worker)}
                                    className="w-full p-4 flex items-center justify-between bg-slate-50 hover:bg-primary/10 rounded-2xl border transition-all active:scale-95"
                                >
                                    <div className="p-2 bg-white rounded-xl shadow-sm"><ChevronRight className="h-4 w-4 text-primary rotate-180"/></div>
                                    <div className="text-right">
                                        <p className="font-black text-sm">{worker.name}</p>
                                        <p className="text-[9px] font-bold text-muted-foreground">{worker.id}</p>
                                    </div>
                                </button>
                            ))}
                            {deliveryWorkers.filter(w => w.isOnline && w.isActive !== false).length === 0 && (
                                <div className="text-center py-10 opacity-40 font-bold italic text-xs">لا يوجد مناديب متاحين الآن.</div>
                            )}
                        </div>
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    </div>
  );
}
