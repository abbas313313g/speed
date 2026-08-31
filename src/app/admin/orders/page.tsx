
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
import { MoreHorizontal, Trash2, Loader2, Search, CheckSquare, Phone, Store, User, MapPin, Receipt, X } from 'lucide-react';
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

export default function AdminOrdersPage({ branchId }: { branchId: string }) {
  const { toast } = useToast();
  const { allOrders, isLoading, deleteOrder, updateOrderStatus } = useOrders(branchId);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  
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
            case 'confirmed': return "بانتظار موافقة المندوب";
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
                <AlertDialogContent className="rounded-[2.5rem] bg-background">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-right font-black dark:text-white">تأكيد الحذف الجماعي؟</AlertDialogTitle>
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
          <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] border dark:border-slate-800 shadow-xl overflow-hidden">
            <Table>
                <TableHeader className="bg-muted/50 dark:bg-slate-800/50">
                <TableRow>
                    <TableHead className="w-[50px]">
                        <Checkbox 
                            checked={selectedOrderIds.length === allOrders.length && allOrders.length > 0}
                            onCheckedChange={toggleSelectAll}
                        />
                    </TableHead>
                    <TableHead className="font-black text-right dark:text-slate-200">رقم الطلب</TableHead>
                    <TableHead className="font-black text-right dark:text-slate-200">العميل</TableHead>
                    <TableHead className="font-black text-right dark:text-slate-200">السائق</TableHead>
                    <TableHead className="font-black text-right dark:text-slate-200">التاريخ</TableHead>
                    <TableHead className="font-black text-right dark:text-slate-200">المبلغ</TableHead>
                    <TableHead className="font-black text-right dark:text-slate-200">الحالة</TableHead>
                    <TableHead className="font-black text-center dark:text-slate-200">إجراءات</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {allOrders.map((order) => (
                    <TableRow key={order.id} className={cn("hover:bg-muted/30 dark:hover:bg-slate-800 transition-colors cursor-pointer", selectedOrderIds.includes(order.id) && "bg-primary/5")} onClick={() => setViewOrder(order)}>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox 
                            checked={selectedOrderIds.includes(order.id)}
                            onCheckedChange={() => toggleSelectOrder(order.id)}
                        />
                    </TableCell>
                    <TableCell className="font-bold dark:text-white">#{order.orderNumber || order.id.substring(0, 6)}</TableCell>
                    <TableCell className="font-bold dark:text-white">{order.address.name}</TableCell>
                    <TableCell className="text-xs font-bold text-muted-foreground dark:text-slate-400">{order.deliveryWorker?.name || 'لم يعين'}</TableCell>
                    <TableCell className="text-[10px] font-bold text-muted-foreground dark:text-slate-400">{new Date(order.date).toLocaleString('ar-IQ')}</TableCell>
                    <TableCell className="font-black text-primary">{formatCurrency(order.total)}</TableCell>
                    <TableCell>
                        <Badge className={cn("text-white font-black rounded-lg", getStatusVariant(order.status))}>
                            {getStatusText(order.status)}
                        </Badge>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-center items-center gap-2">
                            <AlertDialog>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0 dark:text-slate-200">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="rounded-xl font-bold bg-background">
                                <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'unassigned')}>بانتظار سائق</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'confirmed')}>بانتظار المندوب</DropdownMenuItem>
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
                            <AlertDialogContent className="rounded-[2.5rem] bg-background">
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="text-right dark:text-white">تأكيد الحذف</AlertDialogTitle>
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
                        </div>
                    </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
          </div>
        ) : (
            <div className="p-20 text-center bg-white dark:bg-slate-900 rounded-[2rem] border-2 border-dashed dark:border-slate-800">
                <p className="text-muted-foreground font-bold italic">لا توجد طلبات لهذا الفرع حالياً.</p>
            </div>
        )}

        <Dialog open={!!viewOrder} onOpenChange={(v) => !v && setViewOrder(null)}>
            <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] p-0 border-none shadow-2xl bg-background">
                {viewOrder && (
                    <div className="flex flex-col text-right">
                        <DialogHeader className="p-6 bg-primary text-white">
                            <div className="flex justify-between items-center flex-row-reverse">
                                <DialogTitle className="text-2xl font-black italic">تفاصيل الطلب #{viewOrder.orderNumber}</DialogTitle>
                                <Button variant="ghost" size="icon" onClick={() => setViewOrder(null)} className="text-white hover:bg-white/10 rounded-full"><X className="h-6 w-6"/></Button>
                            </div>
                            <p className="text-xs font-bold text-white/70 mt-1">{new Date(viewOrder.date).toLocaleString('ar-IQ')}</p>
                        </DialogHeader>

                        <div className="p-6 space-y-8">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <h3 className="text-[10px] font-black text-muted-foreground dark:text-slate-400 uppercase flex items-center gap-1 justify-end"><Store className="h-3 w-3"/> المتجر المصدر</h3>
                                    <p className="font-black text-lg text-slate-800 dark:text-white">{viewOrder.restaurant?.name || 'غير معروف'}</p>
                                    <Badge variant="secondary" className="font-bold">عمولة النظام: {viewOrder.restaurant?.commissionRate || 10}%</Badge>
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-[10px] font-black text-muted-foreground dark:text-slate-400 uppercase flex items-center gap-1 justify-end"><User className="h-3 w-3"/> العميل المستلم</h3>
                                    <p className="font-black text-lg text-slate-800 dark:text-white">{viewOrder.address.name}</p>
                                    <p className="text-xs font-bold text-primary flex items-center gap-1 justify-end" dir="ltr"><Phone className="h-3 w-3"/> {viewOrder.address.phone}</p>
                                </div>
                            </div>

                            <Separator className="border-dashed dark:border-slate-800" />

                            <div className="space-y-4">
                                <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2 justify-end"><Receipt className="h-5 w-5 text-primary"/> محتويات القائمة</h3>
                                <div className="space-y-3">
                                    {viewOrder.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                                            <div className="font-black text-primary bg-primary/10 px-4 py-1 rounded-xl">x{item.quantity}</div>
                                            <div className="text-right flex-1 px-4">
                                                <p className="font-black text-sm dark:text-white">{item.product.name}</p>
                                                {item.selectedSize && <Badge variant="outline" className="text-[8px] font-bold mt-0.5">{item.selectedSize.name}</Badge>}
                                            </div>
                                            <div className="font-bold text-xs text-slate-600 dark:text-slate-400">
                                                {formatCurrency((item.selectedSize?.price || item.product.discountPrice || item.product.price) * item.quantity)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-primary/5 p-6 rounded-[2rem] border-2 border-primary/10 space-y-3">
                                <div className="flex justify-between items-center text-xs font-bold text-slate-500 dark:text-slate-400">
                                    <span>{formatCurrency(viewOrder.deliveryFee)}</span>
                                    <span>أجور التوصيل:</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-3xl font-black text-primary tracking-tighter">{formatCurrency(viewOrder.total)}</span>
                                    <span className="font-black text-slate-700 dark:text-slate-200">المجموع الكلي:</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-[10px] font-black text-muted-foreground dark:text-slate-400 uppercase flex items-center gap-1 justify-end"><MapPin className="h-3 w-3"/> عنوان التوصيل</h3>
                                <div className="p-4 bg-muted/20 dark:bg-slate-900 rounded-2xl text-xs font-bold leading-relaxed dark:text-slate-300">
                                    <p className="text-primary font-black mb-1">{viewOrder.address.deliveryZone}</p>
                                    <p>{viewOrder.address.details || 'لا توجد ملاحظات إضافية.'}</p>
                                </div>
                                <Button variant="outline" className="w-full h-12 rounded-xl gap-2 font-bold" onClick={() => window.open(`https://www.google.com/maps?q=${viewOrder.address.latitude},${viewOrder.address.longitude}`, '_blank')}>
                                    <MapPin className="h-4 w-4" /> فتح الموقع على الخريطة
                                </Button>
                            </div>
                        </div>

                        <DialogFooter className="p-6 bg-slate-50 dark:bg-slate-900 border-t dark:border-slate-800">
                            <Button onClick={() => setViewOrder(null)} className="w-full h-14 rounded-2xl font-black text-lg">إغلاق النافذة</Button>
                        </DialogFooter>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    </div>
  );
}
