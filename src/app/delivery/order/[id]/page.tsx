
"use client";

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { MapPin, Phone, ArrowRight, XCircle, Store } from 'lucide-react';
import type { OrderStatus } from '@/lib/types';
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
          <div className="text-center p-8">
            <p className="font-bold">لم يتم العثور على الطلب.</p>
            <Button onClick={onBack} className="mt-4">العودة</Button>
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

  return (
    <div className="p-4 space-y-6 bg-background pb-32 min-h-full">
        <header className="flex items-center gap-4 sticky top-0 bg-background/80 backdrop-blur-md z-10 py-2">
            <button onClick={onBack} className="p-3 bg-secondary rounded-2xl text-primary active:scale-75 transition-all shadow-sm">
                <ArrowRight className="h-6 w-6"/>
            </button>
            <div>
                <h1 className="text-xl font-black text-primary">تفاصيل الطلب #{order.id.substring(0,6)}</h1>
                <p className="text-[10px] font-bold text-muted-foreground">{getStatusText(order.status)}</p>
            </div>
        </header>

        <Card className="rounded-[1.5rem] border-none shadow-md">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-black">معلومات الزبون</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="flex justify-between text-sm"><span>الاسم:</span> <span className="font-black text-primary">{order.address.name}</span></div>
                <div className="flex justify-between text-sm"><span>المنطقة:</span> <span className="font-bold">{order.address.deliveryZone}</span></div>
                <div className="flex justify-between text-sm"><span>العنوان:</span> <span className="font-medium text-muted-foreground">{order.address.details || 'لا توجد ملاحظات'}</span></div>
            </CardContent>
            <CardFooter className="grid grid-cols-2 gap-2 border-t pt-4">
                <a href={`tel:${order.address.phone}`} className="w-full">
                    <Button variant="outline" className="w-full h-11 rounded-xl font-bold"><Phone className="ml-2 h-4 w-4"/>اتصال</Button>
                </a>
                <a href={`https://www.google.com/maps?q=${order.address.latitude},${order.address.longitude}`} target="_blank" rel="noopener noreferrer" className="w-full">
                    <Button variant="outline" className="w-full h-11 rounded-xl font-bold"><MapPin className="ml-2 h-4 w-4"/>الموقع</Button>
                </a>
            </CardFooter>
        </Card>
        
        {order.restaurant && (
            <Card className="rounded-[1.5rem] border-none shadow-md">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-black">معلومات المتجر</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                     <div className="flex justify-between text-sm"><span>الاسم:</span> <span className="font-black text-primary">{order.restaurant.name}</span></div>
                </CardContent>
                 <CardFooter className="border-t pt-4">
                    <a href={`https://www.google.com/maps?q=${order.restaurant.latitude},${order.restaurant.longitude}`} target="_blank" rel="noopener noreferrer" className="w-full">
                        <Button variant="outline" className="w-full h-11 rounded-xl font-bold"><Store className="ml-2 h-4 w-4"/>موقع المتجر</Button>
                    </a>
                </CardFooter>
            </Card>
        )}

         <Card className="rounded-[1.5rem] border-none shadow-md overflow-hidden">
            <CardHeader className="bg-muted/20 pb-4">
                <CardTitle className="text-sm font-black text-center">الفاتورة والمنتجات</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
                {order.items.map(item => {
                  const itemPrice = item.selectedSize?.price ?? item.product.discountPrice ?? item.product.price;
                  return (
                    <div key={item.product.id + (item.selectedSize?.name || '')} className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-3">
                            <div className="font-black p-2 bg-secondary rounded-lg text-primary">x{item.quantity}</div>
                            <div>
                                <p className="font-bold">{item.product.name}</p>
                                {item.selectedSize && <p className="text-[9px] text-muted-foreground">{item.selectedSize.name}</p>}
                            </div>
                        </div>
                        <span className="font-black">{formatCurrency(itemPrice * item.quantity)}</span>
                    </div>
                  )
                })}
                <Separator className="border-dashed"/>
                 <div className="flex justify-between text-xs font-bold text-muted-foreground">
                    <span>أجرة التوصيل:</span>
                    <span>{formatCurrency(order.deliveryFee)}</span>
                 </div>
                 {order.appliedCoupon && (
                     <div className="flex justify-between text-xs font-black text-green-600">
                        <span>خصم الكوبون:</span>
                        <span>-{formatCurrency(order.appliedCoupon.discountAmount)}</span>
                    </div>
                 )}
                 <div className="flex justify-between font-black text-xl text-primary bg-primary/5 p-4 rounded-xl">
                    <span>المبلغ الكلي:</span>
                    <span>{formatCurrency(order.total)}</span>
                 </div>
            </CardContent>
        </Card>
        
        {nextStatus[order.status] && (
            <div className="flex flex-col gap-3">
                <Button size="lg" className="w-full h-16 rounded-2xl text-lg font-black shadow-xl" onClick={handleUpdateStatus}>
                    تحديث الحالة: "{getStatusText(nextStatus[order.status]!)}"
                </Button>
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button size="lg" variant="ghost" className="w-full text-destructive font-bold h-12">
                            <XCircle className="ml-2 h-5 w-5" />
                            إلغاء الطلب
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-[2rem]">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-right">تأكيد الإلغاء</AlertDialogTitle>
                            <AlertDialogDescription className="text-right font-bold text-muted-foreground">
                                هل أنت متأكد من إلغاء هذا الطلب؟ سيتم إعادته لقائمة الانتظار.
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
            <div className="text-center font-black text-green-600 p-6 bg-green-50 rounded-2xl border-2 border-green-100 animate-in zoom-in">
                 تم توصيل الطلب بنجاح! 🎉
            </div>
        )}
        {order.status === 'cancelled' && (
            <div className="text-center font-black text-red-600 p-6 bg-red-50 rounded-2xl border-2 border-red-100">
                الطلب ملغي.
            </div>
        )}

    </div>
  );
}
