
"use client";

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowRight, XCircle, Store, ChevronDown, ChevronUp, Navigation, MapPin, User, Hash } from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
        <div className="p-4 space-y-4 bg-background h-full">
            <Skeleton className="h-12 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-[2rem]" />
            <Skeleton className="h-64 w-full rounded-[2rem]" />
        </div>
    );
  }

  if (!order) {
      return (
          <div className="text-center p-8 flex flex-col items-center justify-center h-full bg-background">
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

  const openNavigation = (app: 'google' | 'waze') => {
      if (!order.address.latitude || !order.address.longitude) {
          toast({ title: "الموقع غير متوفر", variant: "destructive" });
          return;
      }
      
      const { latitude, longitude } = order.address;
      if (app === 'google') {
          window.open(`https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`, '_blank');
      } else {
          // ويز يستخدم تنسيق خاص للروابط
          window.open(`https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`, '_blank');
      }
  };

  return (
    <div className="flex flex-col bg-background pb-32 h-full overflow-y-auto text-right">
        <header className="flex items-center gap-4 sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-30 p-4 border-b dark:border-slate-800">
            <button onClick={onBack} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-primary active:scale-75 transition-all shadow-sm">
                <ArrowRight className="h-6 w-6"/>
            </button>
            <div className="flex-1 text-right">
                <h1 className="text-xl font-black text-slate-800 dark:text-white leading-none">طلب #{order.orderNumber || order.id.substring(0,6)}</h1>
                <p className="text-[10px] font-bold text-primary mt-1 uppercase tracking-widest">{getStatusText(order.status)}</p>
            </div>
        </header>

        <div className="p-4 space-y-6">
            {/* خيارات الملاحة الجمالية */}
            <div className="space-y-4">
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button 
                            size="lg"
                            className="w-full h-20 rounded-[2rem] shadow-xl shadow-primary/20 flex flex-col items-center justify-center gap-1 active:scale-95 transition-all bg-primary hover:bg-primary/95 text-white"
                        >
                            <div className="flex items-center gap-2">
                                <Navigation className="h-7 w-7 text-white animate-pulse" />
                                <span className="text-xl font-black">افتح نظام الملاحة (GPS)</span>
                            </div>
                            <span className="text-[10px] font-bold text-white/70 italic">اضغط للاختيار بين جوجل ماب أو ويز</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="rounded-[2rem] w-[320px] p-2 bg-white dark:bg-slate-900 border-none shadow-2xl" align="center">
                        <DropdownMenuItem onClick={() => openNavigation('google')} className="h-16 rounded-2xl font-black gap-4 text-lg cursor-pointer focus:bg-primary/10 transition-colors">
                            <div className="p-3 bg-blue-100 rounded-xl"><MapPin className="text-blue-600 h-6 w-6"/></div>
                            <span className="text-slate-800 dark:text-white">خرائط جوجل (Google)</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openNavigation('waze')} className="h-16 rounded-2xl font-black gap-4 text-lg cursor-pointer focus:bg-sky-100 transition-colors">
                            <div className="p-3 bg-sky-100 rounded-xl"><Navigation className="text-sky-500 h-6 w-6"/></div>
                            <span className="text-slate-800 dark:text-white">تطبيق ويز (Waze)</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* بطاقات البيانات المزدوجة - وضوح كامل في المظلم */}
            <div className="grid grid-cols-1 gap-4">
                <Card className="rounded-[2rem] border-none shadow-md overflow-hidden bg-white dark:bg-slate-900">
                    <CardHeader className="p-4 pb-2 border-b dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                        <div className="flex items-center justify-end gap-2 text-primary font-black">
                            <span className="text-xs">معلومات العميل المستلم</span>
                            <User className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent className="p-5 space-y-4 text-right">
                         <div className="space-y-1">
                            <p className="text-[10px] font-black text-muted-foreground uppercase">الاسم الكامل</p>
                            <p className="text-xl font-black text-slate-800 dark:text-white">{order.address.name}</p>
                         </div>
                         <Separator className="opacity-50" />
                         <div className="space-y-1">
                            <p className="text-[10px] font-black text-primary uppercase">رقم الهاتف (واضح للآيفون)</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-white tracking-widest font-mono" dir="ltr">
                                {order.address.phone}
                            </p>
                         </div>
                         <div className="space-y-1 pt-2">
                            <p className="text-[10px] font-black text-muted-foreground uppercase">عنوان التوصيل والملاحظات</p>
                            <div className="p-3 bg-muted/30 dark:bg-slate-800 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-300 leading-relaxed border dark:border-slate-700">
                                <p className="text-primary font-black mb-1">{order.address.deliveryZone}</p>
                                <p>{order.address.details || 'لا توجد ملاحظات إضافية.'}</p>
                            </div>
                         </div>
                    </CardContent>
                </Card>

                <Card className="rounded-[2rem] border-none shadow-md overflow-hidden bg-white dark:bg-slate-900">
                    <CardHeader className="p-4 pb-2 border-b dark:border-slate-800 bg-primary/5 dark:bg-primary/10">
                         <div className="flex items-center justify-end gap-2 text-primary font-black">
                            <span className="text-xs">المتجر المصدر للوجبات</span>
                            <Store className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent className="p-5 space-y-2 text-right">
                         <p className="text-xl font-black text-slate-800 dark:text-white">{order.restaurant?.name || 'غير معروف'}</p>
                         <Button 
                            variant="ghost" 
                            size="sm" 
                            className="w-full h-12 rounded-xl text-xs font-black text-primary bg-primary/5 hover:bg-primary/10 transition-all border border-primary/10" 
                            onClick={() => window.open(`https://www.google.com/maps?q=${order.restaurant?.latitude},${order.restaurant?.longitude}`, '_blank')}
                         >
                            <Store className="ml-2 h-4 w-4"/> عرض موقع المتجر على الخريطة
                         </Button>
                    </CardContent>
                </Card>
            </div>

            {/* تفاصيل الفاتورة - وضوح الألوان */}
            <Card className="rounded-[2.5rem] border-none shadow-lg overflow-hidden bg-white dark:bg-slate-900 border dark:border-slate-800">
                <button 
                    onClick={() => setShowBill(!showBill)}
                    className="w-full p-5 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                    <span className="font-black text-sm text-slate-800 dark:text-white">تفاصيل الطلبية ({order.items.length} وجبة)</span>
                    {showBill ? <ChevronUp className="h-5 w-5 text-primary"/> : <ChevronDown className="h-5 w-5 text-primary"/>}
                </button>
                {showBill && (
                    <CardContent className="p-6 space-y-5 animate-in slide-in-from-top-2 duration-300">
                        {order.items.map((item, idx) => {
                            const unitPrice = item.selectedSize?.price || item.product.discountPrice || item.product.price || 0;
                            return (
                                <div key={idx} className="flex justify-between items-center text-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="font-black p-2.5 bg-primary/10 dark:bg-primary/20 rounded-xl text-primary min-w-[36px] text-center">x{item.quantity}</div>
                                        <div className="text-right">
                                            <p className="font-black text-slate-800 dark:text-white">{item.product.name}</p>
                                            {item.selectedSize && <Badge variant="secondary" className="text-[8px] font-black px-2 py-0.5 mt-1 bg-slate-100 dark:bg-slate-700">{item.selectedSize.name}</Badge>}
                                        </div>
                                    </div>
                                    <span className="font-black text-slate-600 dark:text-slate-400">{formatCurrency(unitPrice * item.quantity)}</span>
                                </div>
                            )
                        })}
                        <Separator className="border-dashed dark:border-slate-800"/>
                        <div className="flex justify-between items-center text-xs font-bold text-muted-foreground">
                            <span>أجرة التوصيل الصافية للمندوب:</span>
                            <span className="text-primary font-black">{formatCurrency(order.deliveryFee)}</span>
                        </div>
                    </CardContent>
                )}
                <div className="bg-primary text-white p-6 flex justify-between items-center shadow-inner">
                    <div className="flex flex-col">
                        <span className="font-black text-xs opacity-80">الإجمالي الواجب استلامه كاش:</span>
                        <p className="text-[9px] font-bold opacity-60">شامل أجور التوصيل والوجبات</p>
                    </div>
                    <span className="text-3xl font-black tracking-tighter drop-shadow-md">{formatCurrency(order.total)}</span>
                </div>
            </Card>
            
            {/* أزرار التحكم في الحالة */}
            {nextStatus[order.status] && (
                <div className="flex flex-col gap-4">
                    <Button 
                        size="lg" 
                        className="w-full h-20 rounded-[2rem] text-2xl font-black shadow-2xl shadow-primary/30 transition-all active:scale-95 bg-primary hover:bg-primary/95 text-white" 
                        onClick={handleUpdateStatus}
                    >
                        تحديث الحالة: {getStatusText(nextStatus[order.status]!)}
                    </Button>
                    
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button size="lg" variant="ghost" className="w-full text-destructive font-black h-12 hover:bg-destructive/5 rounded-xl">
                                <XCircle className="ml-2 h-5 w-5" />
                                لا أستطيع توصيل هذا الطلب (إلغاء)
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl bg-white dark:bg-slate-900">
                            <AlertDialogHeader>
                                <AlertDialogTitle className="text-right font-black text-slate-800 dark:text-white text-xl">هل تريد الانسحاب من المهمة؟</AlertDialogTitle>
                                <AlertDialogDescription className="text-right font-bold text-muted-foreground leading-relaxed">
                                    سيتم إرجاع الطلب للمكتب وإتاحته لمناديب آخرين. هذا الإجراء قد يؤثر على تقييمك في النظام.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="flex-row gap-3 mt-4">
                                <AlertDialogCancel className="flex-1 h-14 rounded-2xl font-black border-2 dark:border-slate-800">تراجع</AlertDialogCancel>
                                <AlertDialogAction onClick={handleCancelOrder} className="flex-1 h-14 rounded-2xl bg-destructive hover:bg-destructive/90 font-black text-white shadow-lg shadow-destructive/20">نعم، انسحاب</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            )}

            {order.status === 'delivered' && (
                <div className="text-center font-black text-green-600 dark:text-green-400 p-10 bg-green-50 dark:bg-green-900/20 rounded-[3rem] border-4 border-white dark:border-slate-800 shadow-inner animate-in zoom-in">
                    <div className="text-5xl mb-4">🏆</div>
                    <p className="text-xl">تم التوصيل بنجاح!</p>
                    <p className="text-[10px] opacity-60 mt-2 font-bold italic">تمت إضافة أرباح التوصيل إلى محفظتك</p>
                </div>
            )}
        </div>
    </div>
  );
}
