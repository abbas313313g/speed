
"use client";

import React, { useState, useMemo, useEffect } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { MoreHorizontal, Trash2, Loader2, RefreshCw, Bike, ChevronRight, Store, X, UserCog, CheckCircle, Navigation, User, Tag, Ticket, ReceiptText, Zap } from 'lucide-react';
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
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { db } from '@/lib/firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export default function AdminOrdersPage({ branchId }: { branchId: string }) {
  const { toast } = useToast();
  const [refreshKey, setRefreshKey] = useState(Date.now());
  
  // استخدام المحرك السريع عالي الأولوية
  const { allOrders, isLoading: ordersLoading, deleteOrder, updateOrderStatus } = useOrders(branchId, 200, refreshKey);
  const { deliveryWorkers } = useDeliveryWorkers();
  
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [orderToAssign, setOrderToAssign] = useState<string | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUpdateStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await updateOrderStatus(orderId, status);
      toast({ title: "تم التحديث بنجاح" });
    } catch(e) {}
  };

  const handleManualAssign = async (worker: DeliveryWorker) => {
      if (!orderToAssign) return;
      const currentOrder = allOrders.find(o => o.id === orderToAssign);
      if (!currentOrder) return;

      setIsProcessing(true);
      try {
          const updateData: any = {
              deliveryWorkerId: worker.id,
              deliveryWorker: { id: worker.id, name: worker.name },
              confirmedAt: null,
              lastSkippedWorkerId: null, 
          };
          
          if (['unassigned', 'pending_assignment', 'confirmed'].includes(currentOrder.status)) {
              updateData.status = 'preparing';
          }

          await updateDoc(doc(db, "orders", orderToAssign), updateData);
          toast({ title: `تم إسناد الطلب للكابتن ${worker.name} بنجاح ✅` });
          setAssignDialogOpen(false);
          setOrderToAssign(null);
      } catch (e) {
          toast({ title: "فشل التعيين", variant: "destructive" });
      } finally {
          setIsProcessing(false);
      }
  };
  
  const handleDelete = async (orderId: string) => {
      await deleteOrder(orderId);
  }

  const handleBulkDelete = async () => {
      if (selectedOrderIds.length === 0) return;
      setIsProcessing(true);
      try {
          for (const id of selectedOrderIds) {
              await deleteDoc(doc(db, "orders", id));
          }
          toast({ title: `تم حذف ${selectedOrderIds.length} طلب بنجاح ✅` });
          setSelectedOrderIds([]);
      } catch (e) {
          toast({ title: "فشل الحذف الجماعي", variant: "destructive" });
      } finally {
          setIsProcessing(false);
      }
  };

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

  const handleManualRefresh = () => {
      setRefreshKey(Date.now());
  };

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
    <div className="p-4 space-y-6 text-right relative h-full flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
      <header className="flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4 flex-row-reverse">
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-black text-slate-800 dark:text-white italic leading-none">إدارة الطلبات</h1>
                <div className="bg-primary/10 p-2 rounded-xl"><Zap className="h-5 w-5 text-primary animate-pulse"/></div>
              </div>
              {selectedOrderIds.length > 0 && (
                  <AlertDialog>
                      <AlertDialogTrigger asChild>
                          <Button variant="destructive" className="rounded-xl h-10 px-4 font-black gap-2 shadow-lg animate-in zoom-in">
                              <Trash2 className="h-4 w-4" /> حذف ({selectedOrderIds.length})
                          </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-[2.5rem]">
                          <AlertDialogHeader>
                              <AlertDialogTitle className="text-right font-black">حذف جماعي؟</AlertDialogTitle>
                              <AlertDialogDescription className="text-right font-bold">هل أنت متأكد من حذف {selectedOrderIds.length} طلب؟</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="flex-row gap-3">
                              <AlertDialogCancel className="flex-1 rounded-xl">تراجع</AlertDialogCancel>
                              <AlertDialogAction onClick={handleBulkDelete} className="flex-1 bg-destructive rounded-xl">نعم، حذف الكل</AlertDialogAction>
                          </AlertDialogFooter>
                      </AlertDialogContent>
                  </AlertDialog>
              )}
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-primary/10 text-primary border-none font-black px-4 h-10 rounded-xl">مزامنة فورية مفعلة ⚡</Badge>
            <Button onClick={handleManualRefresh} variant="outline" size="icon" className="h-10 w-10 rounded-xl border-2 active:scale-75 transition-all">
                <RefreshCw className={cn("h-4 w-4", ordersLoading && "animate-spin")} />
            </Button>
          </div>
      </header>

        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border shadow-2xl overflow-hidden flex-1 min-h-0">
            <ScrollArea className="h-full">
                <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-800/50 h-14 sticky top-0 z-20">
                    <TableRow>
                        <TableHead className="w-[50px] text-center">
                            <Checkbox 
                                checked={selectedOrderIds.length === allOrders.length && allOrders.length > 0}
                                onCheckedChange={toggleSelectAll}
                            />
                        </TableHead>
                        <TableHead className="font-black text-right w-[100px]">رقم القائمة</TableHead>
                        <TableHead className="font-black text-right">اسم المتجر</TableHead>
                        <TableHead className="font-black text-center w-[120px]">حالة الطلب</TableHead>
                        <TableHead className="font-black text-center w-[60px]">أدوات</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {allOrders.map((order) => (
                        <TableRow key={order.id} className={cn("hover:bg-primary/5 transition-colors cursor-pointer h-16 border-b border-slate-50 dark:border-slate-800", selectedOrderIds.includes(order.id) && "bg-primary/5")} onClick={() => setViewOrder(order)}>
                            <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                                <Checkbox 
                                    checked={selectedOrderIds.includes(order.id)}
                                    onCheckedChange={() => toggleSelectOrder(order.id)}
                                />
                            </TableCell>
                            <TableCell className="font-black text-sm text-slate-900 dark:text-white">#{order.orderNumber}</TableCell>
                            <TableCell className="font-black text-slate-700 dark:text-slate-300 text-xs truncate max-w-[200px]">
                                {order.restaurant?.name}
                            </TableCell>
                            <TableCell className="text-center">
                                <Badge className={cn("text-white font-black rounded-lg text-[10px] px-3 h-7", 
                                    order.status === 'delivered' ? "bg-green-600" : 
                                    order.status === 'cancelled' ? "bg-red-600" : 
                                    order.status === 'pending_assignment' ? "bg-blue-400 animate-pulse" : "bg-primary")}>
                                    {getStatusText(order.status)}
                                </Badge>
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                                <div className="flex justify-center">
                                    <AlertDialog>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild><Button variant="ghost" className="h-9 w-9 p-0 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"><MoreHorizontal className="h-5 w-5" /></Button></DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="rounded-2xl font-bold min-w-[200px] p-2 shadow-2xl">
                                        <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'pending_assignment')} className="gap-2 h-11 rounded-xl"><RefreshCw className="h-4 w-4 text-blue-600"/> إعادة تدوير (بحث)</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'delivered')} className="gap-2 h-11 rounded-xl"><CheckCircle className="h-4 w-4 text-green-600"/> تم التوصيل</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'cancelled')} className="gap-2 h-11 rounded-xl"><X className="h-4 w-4 text-red-600"/> إلغاء الطلب</DropdownMenuItem>
                                        <DropdownMenuSeparator className="my-1 opacity-10" />
                                        <DropdownMenuItem onClick={() => { setOrderToAssign(order.id); setAssignDialogOpen(true); }} className="text-orange-600 gap-2 h-11 rounded-xl"><UserCog className="h-4 w-4"/> تعيين مندوب فوراً</DropdownMenuItem>
                                        <DropdownMenuSeparator className="my-1 opacity-10" />
                                        <AlertDialogTrigger asChild>
                                            <DropdownMenuItem className="text-destructive gap-2 h-11 rounded-xl"><Trash2 className="h-4 w-4" /> حذف الفاتورة</DropdownMenuItem>
                                        </AlertDialogTrigger>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    <AlertDialogContent className="rounded-[2.5rem]">
                                        <AlertDialogHeader><AlertDialogTitle className="text-right">حذف الطلب؟</AlertDialogTitle><AlertDialogDescription className="text-right">هل أنت متأكد من حذف الفاتورة #{order.orderNumber}؟ لا يمكن التراجع.</AlertDialogDescription></AlertDialogHeader>
                                        <AlertDialogFooter className="flex-row gap-3"><AlertDialogCancel className="flex-1 rounded-xl">تراجع</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(order.id)} className="bg-destructive flex-1 rounded-xl">نعم، حذف</AlertDialogAction></AlertDialogFooter>
                                    </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
            </ScrollArea>
            {allOrders.length === 0 && !ordersLoading && (
                <div className="p-20 text-center flex flex-col items-center gap-4 opacity-30">
                    <ShoppingBasket className="h-16 w-16" />
                    <p className="font-black">لا توجد طلبات في هذا الفرع حالياً.</p>
                </div>
            )}
        </div>

        <Dialog open={!!viewOrder} onOpenChange={(v) => !v && setViewOrder(null)}>
            <DialogContent className="sm:max-w-2xl max-h-[95vh] overflow-y-auto rounded-[3rem] p-0 border-none shadow-2xl bg-white dark:bg-slate-900">
                {viewOrder && (
                    <div className="flex flex-col text-right animate-in slide-in-from-bottom-4 duration-300">
                        <DialogHeader className="p-8 bg-slate-950 text-white rounded-t-[3rem] relative overflow-hidden">
                            <div className="absolute right-[-20px] top-[-20px] opacity-10"><Zap className="h-40 w-40 text-primary"/></div>
                            <div className="flex justify-between items-center flex-row-reverse relative z-10">
                                <div>
                                    <DialogTitle className="text-4xl font-black italic tracking-tighter">فاتورة #{viewOrder.orderNumber}</DialogTitle>
                                    <div className="flex items-center gap-3 justify-end mt-3">
                                        <Badge className="bg-primary text-white text-[10px] font-black h-6 px-4">{getStatusText(viewOrder.status)}</Badge>
                                        <span className="text-[10px] font-bold opacity-60 flex items-center gap-1"><RefreshCw className="h-3 w-3"/> {new Date(viewOrder.date).toLocaleString('ar-IQ')}</span>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => setViewOrder(null)} className="text-white rounded-full bg-white/10 hover:bg-white/20"><X className="h-6 w-6"/></Button>
                            </div>
                        </DialogHeader>

                        <div className="p-8 space-y-8">
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-700 space-y-6 shadow-inner">
                                <div className="flex items-center gap-3 justify-end text-primary font-black text-lg">
                                    <span>بيانات الزبون والموقع</span>
                                    <User className="h-6 w-6"/>
                                </div>
                                <div className="grid grid-cols-2 gap-6 text-right">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">الاسم</Label>
                                        <p className="font-black text-xl text-slate-800 dark:text-white">{viewOrder.address.name}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">الهاتف</Label>
                                        <p className="font-black text-2xl font-mono tracking-widest text-primary" dir="ltr">{viewOrder.address.phone}</p>
                                    </div>
                                    <div className="space-y-1 col-span-2">
                                        <Label className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">العنوان التفصيلي</Label>
                                        <p className="font-bold text-base text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 p-5 rounded-2xl border shadow-sm">{viewOrder.address.deliveryZone} - {viewOrder.address.details || 'بدون ملاحظات إضافية'}</p>
                                    </div>
                                    
                                    <div className="col-span-2 pt-2">
                                        <Button 
                                            variant="outline" 
                                            className="w-full h-14 rounded-2xl font-black gap-2 border-primary text-primary active:scale-95 transition-all"
                                            onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${viewOrder.address.latitude},${viewOrder.address.longitude}`, '_blank')}
                                        >
                                            <Navigation className="h-5 w-5" /> تحديد الموقع على الخريطة
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-primary/5 p-5 rounded-[2rem] border-2 border-primary/10 text-center">
                                    <Label className="text-[10px] font-black text-primary uppercase mb-2 block tracking-widest">المتجر المصدر</Label>
                                    <p className="font-black text-slate-800 dark:text-white flex items-center gap-2 justify-center"><Store className="h-5 w-5 text-primary"/> {viewOrder.restaurant?.name}</p>
                                </div>
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-[2rem] border-2 border-blue-100 dark:border-blue-800 text-center">
                                    <Label className="text-[10px] font-black text-blue-600 uppercase mb-2 block tracking-widest">المندوب المختار</Label>
                                    <p className="font-black text-slate-800 dark:text-white flex items-center gap-2 justify-center"><Bike className="h-5 w-5 text-blue-600"/> {viewOrder.deliveryWorker?.name || 'لم يحدد'}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-black text-xl text-slate-800 dark:text-white border-r-4 border-primary pr-4">الوجبات المطلوبة:</h3>
                                <div className="space-y-3">
                                    {viewOrder.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-5 bg-white dark:bg-slate-800 rounded-3xl border shadow-sm group hover:shadow-md transition-all">
                                            <div className="flex flex-col items-start">
                                                <span className="font-black text-primary text-2xl tracking-tighter">{formatCurrency((item.selectedSize?.price || item.product.price) * item.quantity)}</span>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-black text-lg text-slate-800 dark:text-white">{item.product.name} <span className="text-primary bg-primary/5 px-3 py-1 rounded-xl text-sm mx-2">x{item.quantity}</span></p>
                                                {item.selectedSize && <Badge variant="secondary" className="text-[9px] font-black mt-2 h-5 px-3">{item.selectedSize.name}</Badge>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4 pt-6 border-t-2 border-dashed border-slate-100 dark:border-slate-800">
                                <div className="flex justify-between items-center text-base font-black text-muted-foreground px-4">
                                    <span>أجور التوصيل:</span>
                                    <span>{formatCurrency(viewOrder.deliveryFee)}</span>
                                </div>
                                {viewOrder.appliedCoupon && (
                                    <div className="flex justify-between items-center text-base font-black text-red-600 px-4 bg-red-50 dark:bg-red-950/20 p-3 rounded-2xl">
                                        <div className="flex items-center gap-2"><Ticket className="h-5 w-5"/> كود الخصم ({viewOrder.appliedCoupon.code})</div>
                                        <span>-{formatCurrency(viewOrder.appliedCoupon.discountAmount)}</span>
                                    </div>
                                )}
                                {viewOrder.walletAmountUsed ? (
                                    <div className="flex justify-between items-center text-base font-black text-blue-600 px-4 bg-blue-50 dark:bg-blue-950/20 p-3 rounded-2xl">
                                        <div className="flex items-center gap-2"><Wallet className="h-5 w-5"/> خصم المحفظة</div>
                                        <span>-{formatCurrency(viewOrder.walletAmountUsed)}</span>
                                    </div>
                                ) : null}

                                <div className="p-8 bg-slate-950 text-white rounded-[3rem] flex justify-between items-center shadow-3xl mt-6 border-2 border-primary/20 relative overflow-hidden">
                                    <div className="absolute right-0 bottom-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mb-16" />
                                    <div className="relative z-10 flex flex-col">
                                        <div className="flex items-center gap-2 mb-1"><ReceiptText className="h-6 w-6 text-primary"/> <span className="font-black text-xl italic">صافي الكاش</span></div>
                                        <span className="text-[10px] font-bold opacity-50 uppercase tracking-widest">المبلغ المستلم من الزبون</span>
                                    </div>
                                    <span className="text-6xl font-black tracking-tighter text-green-400 relative z-10 drop-shadow-2xl">{formatCurrency(viewOrder.total)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>

        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
            <DialogContent className="sm:max-w-md rounded-[3rem] border-none shadow-2xl p-0 overflow-hidden">
                <DialogHeader className="p-6 bg-orange-600 text-white"><DialogTitle className="text-3xl font-black text-right italic">إسناد مندوب فوراً</DialogTitle></DialogHeader>
                <div className="p-6 space-y-4">
                    <p className="text-xs font-black text-slate-500 text-right leading-relaxed mb-4">عند تعيين مندوب، سيتم توجيه الطلب له مباشرة دون انتظار محرك البحث التلقائي.</p>
                    <ScrollArea className="h-[450px] pr-2">
                        <div className="space-y-2">
                            {deliveryWorkers.filter(w => w.isOnline && w.isActive !== false).map(worker => (
                                <button 
                                    key={worker.id}
                                    onClick={() => handleManualAssign(worker)}
                                    className="w-full p-5 flex items-center justify-between bg-slate-50 dark:bg-slate-800 hover:bg-primary/10 rounded-[1.5rem] border-2 border-transparent hover:border-primary/20 transition-all active:scale-95 group"
                                >
                                    <div className="p-3 bg-white dark:bg-slate-700 rounded-2xl shadow-sm group-hover:bg-primary group-hover:text-white transition-all"><ChevronRight className="h-5 w-5 rotate-180"/></div>
                                    <div className="text-right">
                                        <p className="font-black text-lg text-slate-800 dark:text-white">{worker.name}</p>
                                        <p className="text-[10px] font-bold text-muted-foreground mt-1" dir="ltr">{worker.id}</p>
                                    </div>
                                </button>
                            ))}
                            {deliveryWorkers.filter(w => w.isOnline).length === 0 && (
                                <div className="text-center py-20 opacity-30 italic font-bold">لا يوجد مناديب متصلين حالياً.</div>
                            )}
                        </div>
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    </div>
  );
}
