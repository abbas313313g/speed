
"use client";

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShoppingBag, User, XCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn, formatCurrency } from '@/lib/utils';
import type { Order, OrderStatus } from '@/lib/types';
import Image from 'next/image';
import { getWorkerLevel } from '@/lib/workerLevels';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
import { useDeliveryWorkers } from '@/hooks/useDeliveryWorkers';

export default function OrdersPage() {
    const { toast } = useToast();
    const [userId, setUserId] = useState<string | null>(null);
    const [cancellingOrderId, setProcessingOrderId] = useState<string | null>(null);

    const { allOrders, isLoading: ordersLoading, updateOrderStatus } = useOrders();
    const { deliveryWorkers, isLoading: workersLoading } = useDeliveryWorkers();
    
    useEffect(() => {
        const id = localStorage.getItem('speedShopUserId');
        if (id) setUserId(id);
    }, []);

    const myOrders = useMemo(() => {
      if (!userId || !allOrders) return [];
      return allOrders.filter(o => o.userId === userId);
    }, [userId, allOrders]);


    const handleCancelOrder = async (orderId: string) => {
        setProcessingOrderId(orderId);
        try {
            await updateOrderStatus(orderId, 'cancelled');
            toast({ title: "تم إلغاء طلبك بنجاح ✅", variant: "default"});
        } catch (e) {
            toast({ title: "فشل الإلغاء، يرجى المحاولة لاحقاً", variant: "destructive"});
        } finally {
            setProcessingOrderId(null);
        }
    }

    const workerLevels = useMemo(() => {
        const levels = new Map<string, ReturnType<typeof getWorkerLevel>>();
        deliveryWorkers.forEach(worker => {
            const deliveredCount = allOrders.filter(o => o.deliveryWorkerId === worker.id && o.status === 'delivered').length;
            levels.set(worker.id, getWorkerLevel(worker, deliveredCount, new Date()));
        });
        return levels;
    }, [deliveryWorkers, allOrders]);

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
    }
     const getStatusText = (status: OrderStatus) => {
        switch (status) {
            case 'unassigned': return "بانتظار سائق";
            case 'pending_assignment': return "جارِ التعيين...";
            case 'confirmed': return "تم التأكيد";
            case 'preparing': return "تحضير الطلب";
            case 'ready_for_pickup': return "جاهز للاستلام";
            case 'on_the_way': return "في الطريق";
            case 'delivered': return "تم التوصيل";
            case 'cancelled': return "ملغي";
            default: return status;
        }
    }

    if (ordersLoading || workersLoading) {
        return <div className="p-8 text-center animate-pulse font-black text-primary">جارِ مزامنة طلباتك...</div>;
    }

    if (myOrders.length === 0 && !ordersLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] text-center p-4">
                <ShoppingBag className="h-24 w-24 text-muted-foreground/50 mb-4" />
                <h2 className="text-2xl font-bold">لا يوجد طلبات بعد!</h2>
                <p className="text-muted-foreground mt-2">عندما تقوم بطلب ما، ستجده هنا.</p>
                <Button asChild className="mt-6">
                    <Link href="/home">اطلب الآن</Link>
                </Button>
            </div>
        );
    }
    
    return (
        <TooltipProvider>
            <div className="p-4 space-y-6">
                <header>
                    <h1 className="text-3xl font-black text-primary">متابعة طلباتك</h1>
                    <p className="text-muted-foreground font-bold">تتبع حالة وجباتك في الوقت الفعلي</p>
                </header>

                <div className="space-y-4">
                    {myOrders.map(order => {
                        const workerLevelData = order.deliveryWorkerId ? workerLevels.get(order.deliveryWorkerId) : null;
                        const LevelIcon = workerLevelData?.level?.icon;
                        const canCancel = ['unassigned', 'pending_assignment', 'confirmed'].includes(order.status);
                        const isProcessing = cancellingOrderId === order.id;

                        return (
                            <Card key={order.id} className="rounded-[1.8rem] border-none shadow-md bg-white overflow-hidden">
                                <CardHeader className="pb-3 border-b border-muted/50">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="text-lg font-black">طلب #{order.orderNumber || '...'}</CardTitle>
                                            <CardDescription className="text-[10px] font-bold">{new Date(order.date).toLocaleString('ar-IQ')}</CardDescription>
                                        </div>
                                        <Badge className={cn("text-white font-black rounded-xl", getStatusVariant(order.status))}>
                                            {getStatusText(order.status)}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-4">
                                <div className="flex flex-wrap gap-2">
                                    {order.items.slice(0,3).map(item => {
                                        const imageUrl = item.product.image || 'https://placehold.co/40x40.png';
                                        return (
                                        <div key={item.product.id + (item.selectedSize?.name || '')} className="relative">
                                            <Image src={imageUrl} alt={item.product.name} width={40} height={40} className="rounded-xl object-cover" unoptimized={true}/>
                                            <Badge className="absolute -top-2 -right-2 text-[8px] px-1.5 py-0.5 bg-primary border-white">x{item.quantity}</Badge>
                                        </div>
                                    )})}
                                    {order.items.length > 3 && <div className="flex items-center justify-center w-10 h-10 bg-muted rounded-xl text-xs font-black">+{order.items.length-3}</div>}
                                </div>
                                {order.deliveryWorker && (
                                    <div className="flex items-center gap-2 pt-3 border-t text-[11px] font-bold">
                                        <div className="p-1.5 bg-primary/10 rounded-lg"><User className="h-3.5 w-3.5 text-primary"/></div>
                                        <span className="text-muted-foreground">الكابتن:</span>
                                        <span className="font-black text-slate-800">{order.deliveryWorker.name}</span>
                                        {LevelIcon && workerLevelData?.level && (
                                             <Tooltip>
                                                <TooltipTrigger>
                                                    <LevelIcon className="h-4 w-4" />
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>المستوى: {workerLevelData.level.name}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        )}
                                        <a href={`tel:${order.deliveryWorker.id}`} className="font-black text-primary mr-auto border-b border-primary/20">اتصال</a>
                                    </div>
                                )}
                                </CardContent>
                                <CardFooter className="flex justify-between items-center bg-muted/20 p-4">
                                    <div className="flex items-center gap-2">
                                        <span className="font-black text-xs text-muted-foreground">{order.items.length} قطع</span>
                                        {canCancel && (
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="text-destructive font-black text-[10px] h-8 hover:bg-destructive/5 rounded-lg" disabled={isProcessing}>
                                                        {isProcessing ? <Loader2 className="h-3 w-3 animate-spin ml-1"/> : <XCircle className="ml-1 h-3.5 w-3.5"/>}
                                                        إلغاء
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent className="rounded-[2rem]">
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle className="text-right font-black">إلغاء الطلب؟</AlertDialogTitle>
                                                        <AlertDialogDescription className="text-right font-bold">
                                                            سيتم إلغاء الطلب فوراً من النظام. لا يمكن التراجع.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter className="flex-row gap-2">
                                                        <AlertDialogCancel className="flex-1 rounded-xl">تراجع</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleCancelOrder(order.id)} className="bg-destructive hover:bg-destructive/90 flex-1 rounded-xl">نعم، إلغاء</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        )}
                                    </div>
                                    <span className="text-xl font-black text-primary tracking-tighter">{formatCurrency(order.total)}</span>
                                </CardFooter>
                            </Card>
                        )
                    })}
                </div>
            </div>
        </TooltipProvider>
    );
}
