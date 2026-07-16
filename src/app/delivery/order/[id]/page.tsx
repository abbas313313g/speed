"use client";

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Phone, ArrowRight, XCircle, Store, ChevronDown, ChevronUp, Navigation } from 'lucide-react';
import type { OrderStatus } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
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
import { useOrders } from '@/hooks/useOrders';

interface DeliveryOrderDetailPageProps {
    orderId: string;
    onBack: () => void;
}

export default function DeliveryOrderDetailPage({ orderId, onBack }: DeliveryOrderDetailPageProps) {
  const { toast } = useToast();
  const { allOrders, isLoading, updateOrderStatus } = useOrders();
  const [showBill, setShowBill] = useState(false);

  const order = useMemo(() => allOrders.find(o => o.id === orderId), [orderId, allOrders]);

  if (isLoading) {
    return (
        <div className="p-4 space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
        </div>
    );
  }

  if (!order) {
      return (
          <div className="text-center p-8 flex flex-col items-center justify-center h-full">
            <p className="font-black text-muted-foreground">عذراً، لم نتمكن من العثور على هذا الطلب.</p>
            <Button onClick={onBack} variant="outline" className="mt-4 rounded-xl">العودة للرئيسية</Button>
          </div>
      )
  }

   const getStatusText = (status: OrderStatus) => {
        switch (status) {
            case 'unassigned': return "بانتظار سائق";
            case 'pending_assignment': return "جارِ التعيين...";
            case 'confirmed': return "بانتظار موافقتك";
            case 'preparing': return "قيد التحضير في المطعم";
            case 'ready_for_pickup': return "جاهز للاستلام";
            case 'on_the_way': return "في الطريق للزبون";
            case 'delivered': return "تم التوصيل بنجاح";
            case 'cancelled': return "ملغي";
            default: return status;
        }
    }

  const nextStatus: {[key in OrderStatus]?: OrderStatus} = {
      'preparing': 'ready_for_pickup',
      'ready_for_pickup': 'on_the_way',
      'on_the_way': 'delivered',
  }

  const handleUpdateStatus = async () => {
      const next = nextStatus[order.status];
      if(next) {
          await updateOrderStatus(order.id, next);
          toast({ title: `تم تحديث الحالة إلى: ${getStatusText(next)}` });
      }
  }

  const handleCancelOrder = async () => {
      if (order.status === 'delivered' || order.status === 'cancelled') return;
      await updateOrderStatus(order.id, 'cancelled');
      toast({title: "تم إلغاء الطلب", variant: 'destructive'});
      onBack();
  }

  const handleOpenMaps = () => {
      if (order.address.latitude && order.address.longitude) {
          window.open(`https://www.google.com/maps/dir/?api=1&destination=${order.address.latitude},${order.address.longitude}`, '_blank');
      } else {
          toast({ title: "الموقع غير متوفر", description: "يرجى التواصل مع الزبون هاتفياً.", variant: "destructive" });
      }
  };

  return (
    <div className="block bg-background pb-60 h-full overflow-y-auto text-right">
        <header className="flex items-center gap-4 sticky top-0 bg-background/95 backdrop-blur-md z-30 p-4 border-b">
            <button onClick={onBack} className="p-3 bg-secondary rounded-2xl text-primary active:scale-75 transition-all shadow-sm">
                <ArrowRight className="h-6 w-6"/>
            </button>
            <div className="flex-1 text-right">
                <h1 className="text-xl font-black text-primary leading-none">طلب #{order.id.substring(0,6)}</h1>
                <p className="text-[10px] font-bold text-muted-foreground mt-1">{getStatusText(order.status)}</p>
            </div>
        </header>

        <div className="p-4 space-y-6">
            <div className="space-y-4">
                 <Button 
                    size="lg"
                    className="w-full h-20 rounded-[2rem] shadow-xl shadow-primary/20 flex flex-col items-center justify-center gap-1 active:scale-95 transition-all"
                    onClick={handleOpenMaps}
                >
                    <div className="flex items-center gap-2">
                        <Navigation className="h-7 w-7 text-white animate-pulse" />
                        <span className="text-xl font-black">بدء الملاحة (Maps)</span>
                    </div>
                    <span className="text-[10px] font-bold text-white/70 italic">اضغط للتوجه لموقع الزبون بدقة</span>
                </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <Card className="rounded-[1.5rem] border-none shadow-md overflow-hidden bg-white">
                    <CardHeader className="p-3 pb-1 border-b bg-muted/20 text-right"><CardTitle className="text-[10px] font-black">الزبون</CardTitle></CardHeader>
                    <CardContent className="p-3 space-y-2 text-right">
                         <p className="text-xs font-black truncate">{order.address.name}</p>
                         <p className="text-[9px] text-muted-foreground font-bold">{order.address.deliveryZone}</p>
                         <a href={`tel:${order.address.phone}`} className="block w-full">
                            <Button variant="outline" size="sm" className="w-full h-9 rounded-xl text-[9px] font-black border-primary text-primary">
                                <Phone className="ml-1 h-3.5 w-3.5"/> اتصال سريع
                            </Button>
                         </a>
                    </CardContent>
                </Card>

                <Card className="rounded-[1.5rem] border-none shadow-md overflow-hidden bg-white">
                    <CardHeader className="p-3 pb-1 border-b bg-primary/5 text-right"><CardTitle className="text-[10px] font-black text-primary">المتجر</CardTitle></CardHeader>
                    <CardContent className="p-3 space-y-2 text-right">
                         <p className="text-xs font-black truncate">{order.restaurant?.name || 'غير معروف'}</p>
                         <p className="text-[9px] text-muted-foreground font-bold">فرع {order.branchId === 'main' ? 'بابل' : order.branchId}</p>
                         <Button variant="ghost" size="sm" className="w-full h-9 rounded-xl text-[9px] font-black text-primary bg-primary/5" onClick={() => window.open(`https://www.google.com/maps?q=${order.restaurant?.latitude},${order.restaurant?.longitude}`, '_blank')}>
                            <Store className="ml-1 h-3.5 w-3.5"/> موقع المتجر
                         </Button>
                    </CardContent>
                </Card>
            </div>

            <Card className="rounded-[2.5rem] border-none shadow-md overflow-hidden">
                <button 
                    onClick={() => setShowBill(!showBill)}
                    className="w-full p-5 flex justify-between items-center bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                    <span className="font-black text-sm">تفاصيل الفاتورة والمنتجات</span>
                    {showBill ? <ChevronUp className="h-5 w-5"/> : <ChevronDown className="h-5 w-5"/>}
                </button>
                {showBill && (
                    <CardContent className="p-5 space-y-4 animate-in slide-in-from-top-2 duration-300">
                        {order.items.map((item, idx) => {
                            const unitPrice = item.selectedSize?.price || item.product.discountPrice || item.product.price || 0;
                            return (
                                <div key={idx} className="flex justify-between items-center text-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="font-black p-2 bg-secondary rounded-xl text-primary min-w-[32px] text-center">x{item.quantity}</div>
                                        <div className="text-right">
                                            <p className="font-bold">{item.product.name}</p>
                                            {item.selectedSize && <Badge variant="secondary" className="text-[8px] font-black px-1.5 py-0">{item.selectedSize.name}</Badge>}
                                        </div>
                                    </div>
                                    <span className="font-black">{formatCurrency(unitPrice * item.quantity)}</span>
                                </div>
                            )
                        })}
                        <Separator className="border-dashed"/>
                        <div className="flex justify-between text-xs font-bold text-muted-foreground">
                            <span>أجرة التوصيل الصافية:</span>
                            <span>{formatCurrency(order.deliveryFee)}</span>
                        </div>
                    </CardContent>
                )}
                <div className="bg-primary/5 p-6 flex justify-between items-center border-t border-primary/10">
                    <span className="font-black text-sm">الإجمالي للتحصيل كاش:</span>
                    <span className="text-3xl font-black text-primary tracking-tighter">{formatCurrency(order.total)}</span>
                </div>
            </Card>
            
            {nextStatus[order.status] && (
                <div className="flex flex-col gap-3">
                    <Button size="lg" className="w-full h-16 rounded-2xl text-xl font-black shadow-xl shadow-primary/30" onClick={handleUpdateStatus}>
                        تحديث: {getStatusText(nextStatus[order.status]!)}
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button size="lg" variant="ghost" className="w-full text-destructive font-bold h-12">
                                <XCircle className="ml-2 h-5 w-5" />
                                إلغاء تسليم هذا الطلب
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-[2rem]">
                            <AlertDialogHeader>
                                <AlertDialogTitle className="text-right font-black">تأكيد الإلغاء؟</AlertDialogTitle>
                                <AlertDialogDescription className="text-right font-bold text-muted-foreground">
                                    سيتم إرجاع الطلب للمكتب وإتاحته لمناديب آخرين. هل أنت متأكد؟
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="flex-row gap-2">
                                <AlertDialogCancel className="flex-1 rounded-xl">تراجع</AlertDialogCancel>
                                <AlertDialogAction onClick={handleCancelOrder} className="bg-destructive hover:bg-destructive/90 flex-1 rounded-xl">نعم، إلغاء</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            )}

            {order.status === 'delivered' && (
                <div className="text-center font-black text-green-600 p-10 bg-green-50 rounded-[3rem] border-4 border-white shadow-inner animate-in zoom-in">
                    <p className="text-4xl mb-2">🎉</p>
                    تم التوصيل بنجاح!<br/>
                    <span className="text-xs opacity-60">شكراً لجهودك كابتن</span>
                </div>
            )}
        </div>
    </div>
  );
}
