
"use client";

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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


export default function DeliveryOrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { allOrders, isLoading, updateOrderStatus } = useOrders();


  const order = useMemo(() => allOrders.find(o => o.id === id), [id, allOrders]);

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
            <p>لم يتم العثور على الطلب.</p>
            <Button onClick={() => router.back()} className="mt-4">العودة</Button>
          </div>
      )
  }

   const getStatusText = (status: OrderStatus) => {
        switch (status) {
            case 'unassigned': return "بانتظار سائق";
            case 'pending_assignment': return "جارِ التعيين...";
            case 'confirmed': return "تم التأكيد من قبل السائق";
            case 'preparing': return "قيد التحضير";
            case 'ready_for_pickup': return "جاهز للاستلام";
            case 'on_the_way': return "في الطريق";
            case 'delivered': return "تم التوصيل";
            case 'cancelled': return "ملغي";
            default: return status;
        }
    }

  const nextStatus: {[key in OrderStatus]?: OrderStatus} = {
      'ready_for_pickup': 'on_the_way',
      'on_the_way': 'delivered',
  }

  const handleUpdateStatus = async () => {
      const next = nextStatus[order.status];
      if(next) {
          await updateOrderStatus(order.id, next);
      }
  }

  const handleCancelOrder = async () => {
      if (order.status === 'delivered' || order.status === 'cancelled') return;
      await updateOrderStatus(order.id, 'cancelled');
      toast({title: "تم إلغاء الطلب", variant: 'destructive'});
      router.back();
  }


  return (
    <div className="p-4 space-y-6">
        <header className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.back()}>
                <ArrowRight className="h-5 w-5"/>
            </Button>
            <div>
                <h1 className="text-2xl font-bold">تفاصيل الطلب #{order.id.substring(0,6)}</h1>
                <p className="text-muted-foreground">الحالة الحالية: {getStatusText(order.status)}</p>
            </div>
        </header>

        <Card>
            <CardHeader>
                <CardTitle>معلومات الزبون</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="flex justify-between"><span>الاسم:</span> <span className="font-semibold">{order.address.name}</span></div>
                <div className="flex justify-between"><span>المنطقة:</span> <span className="font-semibold">{order.address.deliveryZone}</span></div>
                <div className="flex justify-between"><span>العنوان:</span> <span className="font-semibold">{order.address.details || 'لا يوجد'}</span></div>
            </CardContent>
            <CardFooter className="grid grid-cols-2 gap-2">
                <a href={`tel:${order.address.phone}`} className="w-full">
                    <Button variant="outline" className="w-full"><Phone className="ml-2 h-4 w-4"/>اتصال بالزبون</Button>
                </a>
                <a href={`https://www.google.com/maps?q=${order.address.latitude},${order.address.longitude}`} target="_blank" rel="noopener noreferrer" className="w-full">
                    <Button variant="outline" className="w-full"><MapPin className="ml-2 h-4 w-4"/>موقع الزبون</Button>
                </a>
            </CardFooter>
        </Card>
        
        {order.restaurant && (
            <Card>
                <CardHeader>
                    <CardTitle>معلومات المتجر</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                     <div className="flex justify-between"><span>الاسم:</span> <span className="font-semibold">{order.restaurant.name}</span></div>
                </CardContent>
                 <CardFooter className="grid grid-cols-1 gap-2">
                    <a href={`https://www.google.com/maps?q=${order.restaurant.latitude},${order.restaurant.longitude}`} target="_blank" rel="noopener noreferrer" className="w-full">
                        <Button variant="outline" className="w-full"><Store className="ml-2 h-4 w-4"/>موقع المتجر</Button>
                    </a>
                </CardFooter>
            </Card>
        )}

         <Card>
            <CardHeader>
                <CardTitle>تفاصيل الفاتورة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                {order.items.map(item => {
                  const itemPrice = item.selectedSize?.price ?? item.product.discountPrice ?? item.product.price;
                  const imageUrl = item.product.image && (item.product.image.startsWith('http') || item.product.image.startsWith('data:')) ? item.product.image : 'https://placehold.co/40x40.png';
                  return (
                    <div key={item.product.id + (item.selectedSize?.name || '')} className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2">
                            <Image src={imageUrl} alt={item.product.name} width={40} height={40} className="rounded-md object-cover" unoptimized={true}/>
                            <div>
                                <p>{item.product.name} {item.selectedSize ? `(${item.selectedSize.name})` : ''}</p>
                                <p className="text-xs text-muted-foreground">x{item.quantity}</p>
                            </div>
                        </div>
                        <span className="font-mono">{formatCurrency(itemPrice * item.quantity)}</span>
                    </div>
                  )
                })}
                <Separator className="my-2"/>
                 <div className="flex justify-between text-sm">
                    <span>سعر التوصيل:</span>
                    <span>{formatCurrency(order.deliveryFee)}</span>
                 </div>
                 {order.appliedCoupon && (
                     <div className="flex justify-between text-sm text-green-600">
                        <span>الخصم ({order.appliedCoupon.code}):</span>
                        <span>-{formatCurrency(order.appliedCoupon.discountAmount)}</span>
                    </div>
                 )}
                 <div className="flex justify-between font-bold text-lg">
                    <span>المبلغ الإجمالي للاستلام:</span>
                    <span>{formatCurrency(order.total)}</span>
                 </div>
            </CardContent>
        </Card>
        
        {order.status === 'confirmed' && (
             <p className="text-center font-semibold text-blue-600 p-4 bg-blue-100 rounded-lg">تم تأكيد الطلب. بانتظار أن يصبح جاهزاً للاستلام من المطعم.</p>
        )}

        {nextStatus[order.status] && (
            <div className="grid grid-cols-1 gap-2">
                <Button size="lg" className="w-full" onClick={handleUpdateStatus}>
                    تغيير الحالة إلى "{getStatusText(nextStatus[order.status]!)}"
                </Button>
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button size="lg" variant="destructive" className="w-full">
                            <XCircle className="ml-2 h-5 w-5" />
                            إلغاء الطلب
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>هل أنت متأكد من الإلغاء؟</AlertDialogTitle>
                            <AlertDialogDescription>
                                هذا الإجراء سيقوم بإلغاء الطلب بشكل نهائي. هل تريد المتابعة؟
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>تراجع</AlertDialogCancel>
                            <AlertDialogAction onClick={handleCancelOrder} className="bg-destructive hover:bg-destructive/90">نعم، قم بالإلغاء</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        )}

        {order.status === 'delivered' && (
            <p className="text-center font-semibold text-green-600 p-4 bg-green-100 rounded-lg">تم توصيل هذا الطلب بنجاح.</p>
        )}
        {order.status === 'cancelled' && (
            <p className="text-center font-semibold text-red-600 p-4 bg-red-100 rounded-lg">تم إلغاء هذا الطلب.</p>
        )}

    </div>
  );
}

    