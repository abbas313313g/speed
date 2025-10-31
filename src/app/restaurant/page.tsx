"use client";

import { useContext, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { RestaurantContext } from '@/contexts/RestaurantContext';
import { useOrders } from '@/hooks/useOrders';
import { Button } from '@/components/ui/button';
import { LogOut, Loader2, Check, X, Bike } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function RestaurantDashboardPage() {
    const router = useRouter();
    const context = useContext(RestaurantContext);

    if (!context) {
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    const { restaurant, logout, updateRestaurantOrderStatus, isProcessing } = context;
    const { allOrders, isLoading: ordersLoading } = useOrders();

    const myNewOrders = useMemo(() => {
        if (!restaurant || !allOrders) return [];
        return allOrders.filter(order => order.restaurant?.id === restaurant.id && order.status === 'unassigned');
    }, [restaurant, allOrders]);
    
    const myPreparingOrders = useMemo(() => {
        if (!restaurant || !allOrders) return [];
        // Show orders that are being prepared OR have been confirmed by a driver but not yet picked up
        return allOrders.filter(order => order.restaurant?.id === restaurant.id && ['preparing', 'confirmed'].includes(order.status));
    }, [restaurant, allOrders]);
    
     const myReadyOrders = useMemo(() => {
        if (!restaurant || !allOrders) return [];
        return allOrders.filter(order => order.restaurant?.id === restaurant.id && order.status === 'ready_for_pickup');
    }, [restaurant, allOrders]);

    if (!restaurant) {
        router.replace('/restaurant/login');
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }
    
    if (ordersLoading) {
         return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="p-4 md:p-8 space-y-6">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">لوحة تحكم {restaurant.name}</h1>
                    <p className="text-muted-foreground">إدارة الطلبات الواردة</p>
                </div>
                <div className="flex items-center gap-2">
                     <Button asChild variant="outline"><Link href="/restaurant/history">سجل الطلبات</Link></Button>
                     <Button variant="ghost" size="icon" onClick={logout}><LogOut className="h-5 w-5"/></Button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* New Orders Column */}
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-center">طلبات جديدة ({myNewOrders.length})</h2>
                    <ScrollArea className="h-[calc(100vh-12rem)] rounded-md border p-4 bg-muted/20">
                        {myNewOrders.length > 0 ? myNewOrders.map(order => (
                            <Card key={order.id} className="mb-4">
                                <CardHeader>
                                    <CardTitle>طلب #{order.id.substring(0,6)}</CardTitle>
                                    <CardDescription>{new Date(order.date).toLocaleTimeString('ar-IQ')}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ul className="text-sm space-y-1">
                                        {order.items.map(item => (
                                            <li key={item.product.id + (item.selectedSize?.name || '')} className="flex justify-between">
                                                <span>{item.quantity}x {item.product.name} {item.selectedSize ? `(${item.selectedSize.name})` : ''}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                                <CardFooter className="grid grid-cols-2 gap-2">
                                     <Button variant="destructive" onClick={() => updateRestaurantOrderStatus(order.id, 'cancelled')} disabled={isProcessing}>
                                        {isProcessing ? <Loader2 className="animate-spin"/> : <X className="ml-2"/>} رفض
                                     </Button>
                                     <Button className="bg-green-600 hover:bg-green-700" onClick={() => updateRestaurantOrderStatus(order.id, 'preparing')} disabled={isProcessing}>
                                        {isProcessing ? <Loader2 className="animate-spin"/> : <Check className="ml-2"/>} قبول
                                     </Button>
                                </CardFooter>
                            </Card>
                        )) : <p className="text-center text-muted-foreground pt-10">لا توجد طلبات جديدة.</p>}
                    </ScrollArea>
                </div>

                {/* Preparing Orders Column */}
                <div className="space-y-4">
                     <h2 className="text-xl font-semibold text-center">قيد التحضير ({myPreparingOrders.length})</h2>
                     <ScrollArea className="h-[calc(100vh-12rem)] rounded-md border p-4 bg-muted/20">
                         {myPreparingOrders.length > 0 ? myPreparingOrders.map(order => (
                            <Card key={order.id} className="mb-4">
                                <CardHeader>
                                    <CardTitle>طلب #{order.id.substring(0,6)}</CardTitle>
                                    <CardDescription>{new Date(order.date).toLocaleTimeString('ar-IQ')}</CardDescription>
                                </CardHeader>
                                 <CardContent>
                                    {order.status === 'confirmed' && order.deliveryWorker ? (
                                        <Badge variant="secondary" className="flex items-center gap-2">
                                            <Bike className="h-4 w-4" />
                                            <span>تم تعيين السائق: {order.deliveryWorker.name}</span>
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline">بانتظار قبول سائق</Badge>
                                    )}
                                </CardContent>
                                <CardFooter>
                                    <Button className="w-full" onClick={() => updateRestaurantOrderStatus(order.id, 'ready_for_pickup')} disabled={isProcessing}>
                                         {isProcessing ? <Loader2 className="animate-spin"/> : null}
                                        نقل إلى "جاهز للاستلام"
                                    </Button>
                                </CardFooter>
                            </Card>
                         )) : <p className="text-center text-muted-foreground pt-10">لا توجد طلبات قيد التحضير.</p>}
                     </ScrollArea>
                </div>

                {/* Ready for Pickup Column */}
                <div className="space-y-4">
                     <h2 className="text-xl font-semibold text-center">جاهز للاستلام ({myReadyOrders.length})</h2>
                     <ScrollArea className="h-[calc(100vh-12rem)] rounded-md border p-4 bg-muted/20">
                         {myReadyOrders.length > 0 ? myReadyOrders.map(order => (
                            <Card key={order.id} className="mb-4">
                                <CardHeader>
                                    <CardTitle>طلب #{order.id.substring(0,6)}</CardTitle>
                                    <CardDescription>{new Date(order.date).toLocaleTimeString('ar-IQ')}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Badge>بانتظار السائق للاستلام</Badge>
                                     {order.deliveryWorker && (
                                        <div className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
                                            <Bike className="h-4 w-4" />
                                            <span>{order.deliveryWorker.name}</span>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                         )) : <p className="text-center text-muted-foreground pt-10">لا توجد طلبات جاهزة.</p>}
                     </ScrollArea>
                </div>
            </div>
        </div>
    )
}
