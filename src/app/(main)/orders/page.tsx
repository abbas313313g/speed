
"use client";

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShoppingBag, User, XCircle } from 'lucide-react';
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


    const handleCancelOrder = (order: Order) => {
        updateOrderStatus(order.id, 'cancelled');
        toast({ title: "تم إلغاء طلبك بنجاح", variant: "destructive"});
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
            case 'on_the_way': return "في الطريق";
            case 'delivered': return "تم التوصيل";
            case 'cancelled': return "ملغي";
            default: return status;
        }
    }

    if (ordersLoading || workersLoading) {
        return <div>جار التحميل...</div>;
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
                    <h1 className="text-3xl font-bold">متابعة طلباتك</h1>
                    <p className="text-muted-foreground">تتبع طلباتك الحالية واطلع على طلباتك السابقة.</p>
                </header>

                <div className="space-y-4">
                    {myOrders.map(order => {
                        const workerLevelData = order.deliveryWorkerId ? workerLevels.get(order.deliveryWorkerId) : null;
                        const LevelIcon = workerLevelData?.level?.icon;
                        const canCancel = ['unassigned', 'pending_assignment'].includes(order.status);

                        return (
                            <Card key={order.id}>
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle>طلب #{order.id.substring(0, 6)}</CardTitle>
                                            <CardDescription>{new Date(order.date).toLocaleString('ar-IQ')}</CardDescription>
                                        </div>
                                        <Badge className={cn("text-white", getStatusVariant(order.status))}>
                                            {getStatusText(order.status)}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                <div className="flex flex-wrap gap-2">
                                    {order.items.slice(0,3).map(item => {
                                        const imageUrl = item.product.image && (item.product.image.startsWith('http') || item.product.image.startsWith('data:')) ? item.product.image : 'https://placehold.co/40x40.png';
                                        return (
                                        <div key={item.product.id + (item.selectedSize?.name || '')} className="relative">
                                            <Image src={imageUrl} alt={item.product.name} width={40} height={40} className="rounded-md object-cover" unoptimized={true}/>
                                            <Badge className="absolute -top-2 -right-2 text-xs px-1.5 py-0.5">{item.quantity}</Badge>
                                        </div>
                                    )})}
                                    {order.items.length > 3 && <div className="flex items-center justify-center w-10 h-10 bg-muted rounded-md text-xs">+{order.items.length-3}</div>}
                                </div>
                                {order.deliveryWorker && (
                                    <div className="flex items-center gap-2 pt-2 border-t text-sm">
                                        <User className="h-4 w-4 text-muted-foreground"/>
                                        <span>مندوب التوصيل:</span>
                                        <span className="font-semibold">{order.deliveryWorker.name}</span>
                                        {LevelIcon && workerLevelData?.level && (
                                             <Tooltip>
                                                <TooltipTrigger>
                                                    <LevelIcon className="h-5 w-5" />
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>المستوى: {workerLevelData.level.name}</p>
                                                    {workerLevelData.isFrozen && <p className="text-destructive"> (مجمد)</p>}
                                                </TooltipContent>
                                            </Tooltip>
                                        )}
                                        <a href={`tel:${order.deliveryWorker.id}`} className="font-semibold text-primary mr-auto">{order.deliveryWorker.id}</a>
                                    </div>
                                )}
                                </CardContent>
                                <CardFooter className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold">{order.items.length} منتجات</span>
                                        {canCancel && (
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="destructive" size="sm">
                                                        <XCircle className="ml-2 h-4 w-4"/>
                                                        إلغاء
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            هل تريد بالتأكيد إلغاء هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>تراجع</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleCancelOrder(order)}>نعم، قم بالإلغاء</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        )}
                                    </div>
                                    <span className="text-lg font-bold text-primary">{formatCurrency(order.total)}</span>
                                </CardFooter>
                            </Card>
                        )
                    })}
                </div>
            </div>
        </TooltipProvider>
    );
}
