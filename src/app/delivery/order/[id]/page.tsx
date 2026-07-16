
"use client";

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { formatCurrency, cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { MapPin, Phone, ArrowRight, XCircle, Store, Map as MapIcon, ChevronDown, ChevronUp } from 'lucide-react';
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
import { DeliveryMap } from '@/components/DeliveryMap';
import Image from 'next/image';

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

  // coordinates for map
  const origin = order.restaurant?.latitude && order.restaurant?.longitude ? { lat: order.restaurant.latitude, lng: order.restaurant.longitude } : null;
  const destination = order.address.latitude && order.address.longitude ? { lat: order.address.latitude, lng: order.address.longitude } : null;

  return (
    <div className="block bg-background pb-60">
        <header className="flex items-center gap-4 sticky top-0 bg-background/90 backdrop-blur-md z-30 p-4 border-b">
            <button onClick={onBack} className="p-3 bg-secondary rounded-2xl text-primary active:scale-75 transition-all shadow-sm">
                <ArrowRight className="h-6 w-6"/>
            </button>
            <div className="flex-1">
                <h1 className="text-xl font-black text-primary">طلب #{order.id.substring(0,6)}</h1>
                <p className="text-[10px] font-bold text-muted-foreground">{getStatusText(order.status)}</p>
            </div>
        </header>

        <div className="p-4 space-y-6">
            {/* IN-APP MAP SECTION */}
            <div className="space-y-3">
                <div className="flex items-center justify-between px-2">
                    <h2 className="text-sm font-black text-primary flex items-center gap-2"><MapIcon className="h-4 w-4"/> مسار التوصيل الذكي</h2>
                    {origin && destination && (
                        <Badge variant="secondary" className="text-[8px] font-black bg-primary/10 text-primary border-none">
                            خريطة مدمجة
                        </Badge>
                    )}
                </div>
                {origin && destination ? (
                    <div className="h-72 w-full shadow-2xl rounded-[2.5rem]">
                         <DeliveryMap origin={origin} destination={destination} />
                    </div>
                ) : (
                    <div className="h-40 bg-muted/20 rounded-[2rem] border-2 border-dashed flex items-center justify-center text-center p-6">
                        <p className="text-[10px] font-bold text-muted-foreground leading-relaxed">
                            عذراً، إحداثيات الموقع غير متوفرة لهذا الطلب.<br/>تأكد من وجود موقع المتجر وعنوان الزبون.
                        </p>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <Card className="rounded-[1.5rem] border-none shadow-md overflow-hidden bg-white">
                    <CardHeader className="p-3 pb-1 border-b bg-muted/20"><CardTitle className="text-[10px] font-black">الزبون</CardTitle></CardHeader>
                    <CardContent className="p-3 space-y-2">
                         <p className="text-xs font-black truncate">{order.address.name}</p>
                         <p className="text-[9px] text-muted-foreground font-bold">{order.address.deliveryZone}</p>
                         <a href={`tel:${order.address.phone}`} className="block"><Button variant="outline" size="sm" className="w-full h-8 rounded-lg text-[9px] font-black"><Phone className="ml-1 h-3 w-3"/> اتصال</Button></a>
                    </CardContent>
                </Card>

                <Card className="rounded-[1.5rem] border-none shadow-md overflow-hidden bg-white">
                    <CardHeader className="p-3 pb-1 border-b bg-primary/5"><CardTitle className="text-[10px] font-black text-primary">المتجر</CardTitle></CardHeader>
                    <CardContent className="p-3 space-y-2">
                         <p className="text-xs font-black truncate">{order.restaurant?.name || 'غير معروف'}</p>
                         <p className="text-[9px] text-muted-foreground font-bold">بابل / {order.address.deliveryZone}</p>
                         <Button variant="ghost" size="sm" className="w-full h-8 rounded-lg text-[9px] font-black text-primary" onClick={() => window.open(`https://www.google.com/maps?q=${order.restaurant?.latitude},${order.restaurant?.longitude}`, '_blank')}><Store className="ml-1 h-3 w-3"/> الموقع</Button>
                    </CardContent>
                </Card>
            </div>

            <Card className="rounded-[2rem] border-none shadow-md overflow-hidden">
                <button 
                    onClick={() => setShowBill(!showBill)}
                    className="w-full p-4 flex justify-between items-center bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                    <span className="font-black text-xs">تفاصيل الفاتورة والمنتجات</span>
                    {showBill ? <ChevronUp className="h-4 w-4"/> : <ChevronDown className="h-4 w-4"/>}
                </button>
                {showBill && (
                    <CardContent className="p-4 space-y-4 animate-in slide-in-from-top-2 duration-300">
                        {order.items.map(item => {
                        const itemPrice = item.selectedSize?.price || item.product.discountPrice || item.product.price;
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
                    </CardContent>
                )}
                <div className="bg-primary/5 p-4 flex justify-between items-center">
                    <span className="font-black text-sm">المبلغ المطلوب تحصيله:</span>
                    <span className="text-xl font-black text-primary">{formatCurrency(order.total)}</span>
                </div>
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
                <div className="text-center font-black text-green-600 p-10 bg-green-50 rounded-2xl border-2 border-green-100 animate-in zoom-in">
                    تم توصيل الطلب بنجاح! 🎉
                </div>
            )}
        </div>
    </div>
  );
}
