
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
import { MoreHorizontal, Trash2, Loader2, Search, X, UserCog, RefreshCw, Bike, ChevronRight } from 'lucide-react';
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
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [orderToAssign, setOrderToAssign] = useState<string | null>(null);

  // فلترة الطلبات لتظهر فقط التابعة لهذا الفرع (تأكيد الاستقلالية)
  const filteredOrders = useMemo(() => {
    return allOrders.filter(o => o.branchId === branchId);
  }, [allOrders, branchId]);
  
  if (isLoading) return <div className="p-20 text-center animate-pulse"><Loader2 className="h-10 w-10 animate-spin text-primary mx-auto"/><p className="mt-4 font-black">جارِ تحميل طلبات الفرع...</p></div>;
  
  const handleUpdateStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await updateOrderStatus(orderId, status);
      toast({ title: "تم تحديث الحالة بنجاح ✅" });
    } catch(e) {}
  };

  const handleManualAssign = async (worker: DeliveryWorker) => {
      if (!orderToAssign) return;
      try {
          // يتم توجيه الطلب للمندوب، ويبقى بانتظار موافقته
          await updateDoc(doc(db, "orders", orderToAssign), {
              deliveryWorkerId: worker.id,
              deliveryWorker: { id: worker.id, name: worker.name },
              status: 'confirmed', 
              confirmedAt: new Date().toISOString()
          });
          toast({ title: `تم توجيه الطلب للكابتن ${worker.name} 🚀` });
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

  const toggleSelectAll = () => {
      if (selectedOrderIds.length === filteredOrders.length) {
          setSelectedOrderIds([]);
      } else {
          setSelectedOrderIds(filteredOrders.map(o => o.id));
      }
  };

  const handleBulkDelete = async () => {
      if (selectedOrderIds.length === 0) return;
      setIsBulkDeleting(true);
      try {
          for (const id of selectedOrderIds) {
              await deleteOrder(id);
          }
          setSelectedOrderIds([]);
          toast({ title: `تم حذف الطلبات بنجاح ✅` });
      } catch (e) {
          toast({ title: "فشل الحذف الجماعي", variant: "destructive" });
      } finally {
          setIsBulkDeleting(false);
      }
  };

  const getStatusText = (status: OrderStatus) => {
        switch (status) {
            case 'unassigned': return "بانتظار المتجر";
            case 'pending_assignment': return "بحث عن مندوب...";
            case 'confirmed': return "بانتظار موافقة المندوب";
            case 'preparing': return "قيد التحضير";
            case 'ready_for_pickup': return "جاهز للاستلام";
            case 'on_the_way': return "في الطريق";
            case 'delivered': return "تم التوصيل";
            case 'cancelled': return "ملغي";
            default: return status;
        }
    }

  const onlineWorkers = deliveryWorkers.filter(w => w.isOnline && w.isActive !== false);

  return (
    <div className="space-y-8 text-right">
      <header className="flex justify-between items-start">
        <div>
            <h1 className="text-3xl font-black text-primary">إدارة الطلبات</h1>
            <p className="text-muted-foreground font-bold">كل فرع يشاهد طلباته فقط. المندوب يجب أن يوافق ليتم التثبيت.</p>
        </div>
        {selectedOrderIds.length > 0 && (
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="rounded-xl h-12 px-6 font-bold shadow-lg gap-2">
                        <Trash2 className="h-5 w-5" /> حذف المحددة ({selectedOrderIds.length})
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-[2.5rem]">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-right font-black">تأكيد الحذف الجماعي؟</AlertDialogTitle>
                        <AlertDialogDescription className="text-right font-bold text-muted-foreground">أنت على وشك حذف {selectedOrderIds.length} طلب نهائياً.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-row gap-3">
                        <AlertDialogCancel className="flex-1 rounded-xl">تراجع</AlertDialogCancel>
                        <AlertDialogAction onClick={handleBulkDelete} className="flex-1 rounded-xl bg-destructive" disabled={isBulkDeleting}>
                            {isBulkDeleting ? <Loader2 className="animate-spin h-5 w-5" /> : "حذف الكل"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        )}
      </header>

        <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] border dark:border-slate-800 shadow-xl overflow-hidden">
            <Table>
                <TableHeader className="bg-muted/50 dark:bg-slate-800/50">
                <TableRow>
                    <TableHead className="w-[50px]"><Checkbox checked={selectedOrderIds.length === filteredOrders.length && filteredOrders.length > 0} onCheckedChange={toggleSelectAll}/></TableHead>
                    <TableHead className="font-black text-right">رقم الطلب</TableHead>
                    <TableHead className="font-black text-right">العميل</TableHead>
                    <TableHead className="font-black text-right">السائق</TableHead>
                    <TableHead className="font-black text-right text-primary">المبلغ الكلي</TableHead>
                    <TableHead className="font-black text-right">الحالة</TableHead>
                    <TableHead className="font-black text-center">إجراءات</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {filteredOrders.map((order) => (
                    <TableRow key={order.id} className={cn("hover:bg-muted/30 transition-colors cursor-pointer", selectedOrderIds.includes(order.id) && "bg-primary/5")} onClick={() => setViewOrder(order)}>
                    <TableCell onClick={(e) => e.stopPropagation()}><Checkbox checked={selectedOrderIds.includes(order.id)} onCheckedChange={() => toggleSelectOrder(order.id)}/></TableCell>
                    <TableCell className="font-bold">#{order.orderNumber || order.id.substring(0, 6)}</TableCell>
                    <TableCell className="font-bold">{order.address.name}</TableCell>
                    <TableCell>
                        {order.deliveryWorker?.name ? (
                            <Badge variant="secondary" className="gap-1 font-bold"><UserCog className="h-3 w-3"/>{order.deliveryWorker.name}</Badge>
                        ) : <span className="text-[10px] text-muted-foreground italic">بحث آلي...</span>}
                    </TableCell>
                    <TableCell className="font-black text-primary">{formatCurrency(order.total)}</TableCell>
                    <TableCell>
                        <Badge className={cn("text-white font-black rounded-lg", 
                            order.status === 'confirmed' ? 'bg-orange-500' : 
                            order.status === 'delivered' ? 'bg-green-600' : 'bg-slate-500')}>
                            {getStatusText(order.status)}
                        </Badge>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-center items-center gap-1">
                            <AlertDialog>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="rounded-xl font-bold">
                                <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'pending_assignment')} className="gap-2"><RefreshCw className="h-4 w-4"/> إعادة تدوير الطلب</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'delivered')}>تم التوصيل كاش</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'cancelled')}>إلغاء الطلب</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => { setOrderToAssign(order.id); setAssignDialogOpen(true); }} className="text-orange-600 gap-2"><UserCog className="h-4 w-4"/> تعيين يدوي (اختيار مندوب)</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <AlertDialogTrigger asChild>
                                    <DropdownMenuItem className="text-destructive gap-2"><Trash2 className="h-4 w-4" /> حذف نهائي</DropdownMenuItem>
                                </AlertDialogTrigger>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <AlertDialogContent className="rounded-[2.5rem]">
                                <AlertDialogHeader><AlertDialogTitle className="text-right">تأكيد الحذف</AlertDialogTitle></AlertDialogHeader>
                                <AlertDialogFooter className="flex-row gap-2"><AlertDialogCancel className="flex-1 rounded-xl">تراجع</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(order.id)} className="bg-destructive flex-1 rounded-xl">حذف الآن</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
        </div>

        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
            <DialogContent className="sm:max-w-md rounded-[2.5rem] p-0 overflow-hidden">
                <DialogHeader className="p-6 bg-primary text-white">
                    <DialogTitle className="text-2xl font-black italic">اختيار المندوب بالاسم</DialogTitle>
                </DialogHeader>
                <div className="p-4">
                    <ScrollArea className="h-[300px] pr-2">
                        <div className="space-y-2">
                            {onlineWorkers.map(worker => (
                                <button 
                                    key={worker.id}
                                    onClick={() => handleManualAssign(worker)}
                                    className="w-full flex items-center justify-between p-4 bg-muted/20 hover:bg-primary/10 rounded-2xl border-2 border-transparent transition-all text-right group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-primary/10 rounded-xl text-primary"><Bike className="h-5 w-5" /></div>
                                        <div className="text-right">
                                            <p className="font-black">{worker.name}</p>
                                            <p className="text-[10px] font-bold text-primary" dir="ltr">{worker.id}</p>
                                        </div>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                </button>
                            ))}
                            {onlineWorkers.length === 0 && <div className="text-center py-10 opacity-40 italic">لا يوجد مناديب متصلين حالياً.</div>}
                        </div>
                    </ScrollArea>
                </div>
                <DialogFooter className="p-4 bg-slate-50 border-t">
                    <Button variant="outline" className="w-full rounded-xl" onClick={() => setAssignDialogOpen(false)}>إغلاق</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <Dialog open={!!viewOrder} onOpenChange={(v) => !v && setViewOrder(null)}>
            <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] p-0">
                {viewOrder && (
                    <div className="flex flex-col text-right">
                        <DialogHeader className="p-6 bg-primary text-white">
                            <div className="flex justify-between items-center flex-row-reverse">
                                <DialogTitle className="text-2xl font-black italic">فاتورة طلب #{viewOrder.orderNumber}</DialogTitle>
                                <Button variant="ghost" size="icon" onClick={() => setViewOrder(null)} className="text-white hover:bg-white/10 rounded-full"><X className="h-6 w-6"/></Button>
                            </div>
                        </DialogHeader>
                        <div className="p-6 space-y-6">
                            <div className="bg-primary/5 p-5 rounded-[1.5rem] border-2 border-primary/10 flex justify-between items-center">
                                <span className="text-3xl font-black text-primary tracking-tighter">{formatCurrency(viewOrder.total)}</span>
                                <span className="font-black text-slate-700">المبلغ الواجب استلامه (كاش):</span>
                            </div>
                            <div className="space-y-4">
                                {viewOrder.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-sm font-bold">
                                        <span>{formatCurrency((item.selectedSize?.price || item.product.discountPrice || item.product.price || 0) * item.quantity)}</span>
                                        <span>{item.product.name} x{item.quantity}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <DialogFooter className="p-6 border-t"><Button onClick={() => setViewOrder(null)} className="w-full h-14 rounded-2xl font-black">إغلاق</Button></DialogFooter>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    </div>
  );
}
