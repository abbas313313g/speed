
"use client";

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatCurrency, calculateDistance } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, MapPin, Package, RefreshCw, BarChart3, Clock, Shield, Store, CircleDot, Loader2 } from 'lucide-react';
import type { Order } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useOrders } from '@/hooks/useOrders';
import { useRestaurants } from '@/hooks/useRestaurants';
import { useDeliveryWorkers } from '@/hooks/useDeliveryWorkers';

export default function DeliveryPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [workerId, setWorkerId] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState<string | null>(null); // orderId being processed

    const { allOrders, isLoading: ordersLoading, updateOrderStatus } = useOrders();
    const { restaurants, isLoading: restaurantsLoading } = useRestaurants();
    const { deliveryWorkers, isLoading: workersLoading, updateWorkerStatus } = useDeliveryWorkers();

    useEffect(() => {
        const id = localStorage.getItem('deliveryWorkerId');
        if (!id) {
            router.replace('/delivery/login');
        } else {
            setWorkerId(id);
        }
    }, [router]);
    
    const { availableOrders, myOrders } = useMemo(() => {
        if (!allOrders || !workerId) return { availableOrders: [], myOrders: [] };
        return {
            availableOrders: allOrders.filter(o => o.status === 'pending_assignment' && o.assignedToWorkerId === workerId),
            myOrders: allOrders.filter(o => o.deliveryWorkerId === workerId && o.status !== 'delivered' && o.status !== 'cancelled')
        }
    }, [allOrders, workerId]);


    const handleAcceptOrder = async (orderId: string) => {
        if (workerId && updateOrderStatus) {
            setIsProcessing(orderId);
            try {
                await updateOrderStatus(orderId, 'confirmed', workerId);
                toast({title: "تم قبول الطلب بنجاح!"})
            } catch (error: any) {
                toast({title: "فشل قبول الطلب", description: error.message, variant: "destructive"});
            } finally {
                setIsProcessing(null);
            }
        }
    };

     const handleRejectOrder = async (orderId: string) => {
        if (workerId && updateOrderStatus && allOrders) {
            setIsProcessing(orderId);
             try {
                await updateOrderStatus(orderId, 'unassigned', workerId); 
                toast({title: "تم رفض الطلب", variant: 'default'});
            } catch (error: any) {
                toast({title: "فشل رفض الطلب", description: error.message, variant: "destructive"});
            } finally {
                setIsProcessing(null);
            }
        }
    };
    
    const handleLogout = () => {
        if(workerId) {
            updateWorkerStatus(workerId, false);
        }
        localStorage.removeItem('deliveryWorkerId');
        router.replace('/delivery/login');
    };
    
    const isLoading = ordersLoading || restaurantsLoading || workersLoading || !workerId;
    if (isLoading) return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    
    const worker = deliveryWorkers?.find(w => w.id === workerId);
    
    const OrderCard = ({order, isMyOrder}: {order: Order, isMyOrder: boolean}) => {
        const orderRestaurant = useMemo(() => {
            if (!restaurants || order.items.length === 0) return null;
            return restaurants.find(r => r.id === order.items[0].product.restaurantId);
        }, [order.items, restaurants]);

        const distance = useMemo(() => {
            if (!orderRestaurant || !orderRestaurant.latitude || !orderRestaurant.longitude || !order.address.latitude || !order.address.longitude) return null;
            return calculateDistance(order.address.latitude, order.address.longitude, orderRestaurant.latitude, orderRestaurant.longitude);
        }, [order.address, orderRestaurant]);
        
        const isThisCardProcessing = isProcessing === order.id;

        return (
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>طلب #{order.id.substring(0, 6)}</CardTitle>
                            <CardDescription>{order.address.name} - {order.address.deliveryZone}</CardDescription>
                        </div>
                         {orderRestaurant && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Store className="h-4 w-4"/>
                                <span>{orderRestaurant.name}</span>
                            </div>
                         )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-2">
                    <div className="flex justify-between">
                        <span>المنتجات:</span>
                        <span>{order.items.length}</span>
                    </div>
                    {distance !== null && (
                         <div className="flex justify-between">
                            <span>مسافة التوصيل:</span>
                            <span className="font-bold">{distance.toFixed(1)} كم</span>
                        </div>
                    )}
                    <div className="flex justify-between">
                        <span>المجموع:</span>
                        <span className="font-bold">{formatCurrency(order.total)}</span>
                    </div>
                    <div className="flex justify-between text-primary font-bold">
                        <span>ربحك من التوصيل:</span>
                        <span>{formatCurrency(order.deliveryFee)}</span>
                    </div>
                </CardContent>
                <CardFooter className="flex gap-2">
                     <a href={`https://www.google.com/maps?q=${order.address.latitude},${order.address.longitude}`} target="_blank" rel="noopener noreferrer" className="flex-1">
                        <Button variant="outline" className="w-full" disabled={isThisCardProcessing}>
                            <MapPin className="ml-2 h-4 w-4"/>
                            عرض على الخريطة
                        </Button>
                    </a>
                    {!isMyOrder && (
                        <>
                            <Button variant="destructive" className="flex-1" onClick={() => handleRejectOrder(order.id)} disabled={isThisCardProcessing}>
                                {isThisCardProcessing ? <Loader2 className="h-4 w-4 animate-spin"/> : 'رفض'}
                            </Button>
                            <Button className="flex-1" onClick={() => handleAcceptOrder(order.id)} disabled={isThisCardProcessing}>
                                {isThisCardProcessing ? <Loader2 className="h-4 w-4 animate-spin"/> : 'قبول'}
                            </Button>
                        </>
                    )}
                     {isMyOrder && (
                        <Link href={`/delivery/order/${order.id}`} className="flex-1">
                           <Button className="w-full">
                                <Package className="ml-2 h-4 w-4"/>
                                تفاصيل الطلب
                           </Button>
                        </Link>
                     )}
                </CardFooter>
            </Card>
        )
    };

    return (
        <div className="p-4 space-y-6">
            <header className="flex justify-between items-center">
                 <div>
                    <h1 className="text-2xl font-bold">مرحباً {worker?.name}</h1>
                    <div className="flex items-center gap-2 text-sm">
                        <CircleDot className={`h-4 w-4 ${worker?.isOnline ? 'text-green-500' : 'text-gray-400'}`} />
                        <span className="text-muted-foreground">{worker?.isOnline ? 'أنت متصل الآن' : 'أنت غير متصل'}</span>
                    </div>
                 </div>
                 <div className="flex gap-2">
                     <Button variant="ghost" size="icon" asChild>
                        <Link href="/delivery/stats">
                            <Shield className="h-5 w-5"/>
                        </Link>
                    </Button>
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/delivery/stats">
                            <BarChart3 className="h-5 w-5"/>
                        </Link>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={handleLogout}>
                        <LogOut className="h-5 w-5"/>
                    </Button>
                 </div>
            </header>

            <Tabs defaultValue="available">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="available" className="relative">
                        طلبات جديدة
                        {availableOrders.length > 0 && <Badge variant="destructive" className="absolute -top-2 -left-2 h-5 w-5 p-0 flex items-center justify-center text-xs">{availableOrders.length}</Badge>}
                        </TabsTrigger>
                    <TabsTrigger value="my-orders">طلباتي الحالية ({myOrders.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="available" className="space-y-4 pt-4">
                    {availableOrders.length > 0 ? (
                        availableOrders.map(order => <OrderCard key={order.id} order={order} isMyOrder={false} />)
                    ) : (
                        <div className="text-center py-10 text-muted-foreground">
                            <Clock className="mx-auto h-12 w-12 mb-4"/>
                            <p className="font-semibold">لا توجد طلبات جديدة في انتظارك حالياً.</p>
                            <p className="text-sm">سيتم إشعارك عند توفر طلب جديد.</p>
                        </div>
                    )}
                </TabsContent>
                <TabsContent value="my-orders" className="space-y-4 pt-4">
                    {myOrders.length > 0 ? (
                        myOrders.map(order => <OrderCard key={order.id} order={order} isMyOrder={true}/>)
                    ) : (
                        <div className="text-center py-10 text-muted-foreground">
                            <Package className="mx-auto h-12 w-12 mb-4"/>
                            <p className="font-semibold">ليس لديك أي طلبات قيد التوصيل حالياً.</p>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
