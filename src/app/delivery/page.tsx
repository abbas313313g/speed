
"use client";

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatCurrency, calculateDistance } from '@/lib/utils';
import { LogOut, MapPin, Package, BarChart3, Clock, Shield, Store, CircleDot, Loader2, PlayCircle, Search } from 'lucide-react';
import type { Order } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useOrders } from '@/hooks/useOrders';
import { useRestaurants } from '@/hooks/useRestaurants';
import { useDeliveryWorkers } from '@/hooks/useDeliveryWorkers';
import Image from 'next/image';

type DriverStatus = 'IDLE' | 'SEARCHING' | 'ORDER_ASSIGNED';

export default function DeliveryPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [workerId, setWorkerId] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState<string | null>(null); // orderId being processed
    const [driverStatus, setDriverStatus] = useState<DriverStatus>('IDLE');

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
    
    const assignedOrder = useMemo(() => {
        if (!allOrders || !workerId) return null;
        // Find the first order that is pending assignment for this worker
        return allOrders.find(o => o.status === 'pending_assignment' && o.assignedToWorkerId === workerId);
    }, [allOrders, workerId]);
    
    // Update driver status based on assignedOrder
    useEffect(() => {
        if (driverStatus === 'SEARCHING' && assignedOrder) {
            setDriverStatus('ORDER_ASSIGNED');
        } else if (driverStatus === 'ORDER_ASSIGNED' && !assignedOrder) {
            setDriverStatus('SEARCHING');
        }
    }, [assignedOrder, driverStatus]);


    const handleAcceptOrder = async (orderId: string) => {
        if (workerId && updateOrderStatus) {
            setIsProcessing(orderId);
            try {
                await updateOrderStatus(orderId, 'confirmed', workerId);
                toast({title: "تم قبول الطلب بنجاح!"})
                // Navigate to the full details page after accepting
                router.push(`/delivery/order/${orderId}`);
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
                // Go back to searching state
                setDriverStatus('SEARCHING');
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
    
    const handleStartWork = () => {
        if(workerId) {
            updateWorkerStatus(workerId, true);
            setDriverStatus('SEARCHING');
            toast({ title: "أنت متصل الآن", description: "جاري البحث عن طلبات..." });
        }
    }
    
    const isLoading = ordersLoading || restaurantsLoading || workersLoading || !workerId;
    if (isLoading) return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    
    const worker = deliveryWorkers?.find(w => w.id === workerId);
    
    const OrderCard = ({order}: {order: Order}) => {
        const orderRestaurant = useMemo(() => {
            if (!restaurants || order.items.length === 0) return null;
            return restaurants.find(r => r.id === order.items[0].product.restaurantId);
        }, [order.items, restaurants]);

        const { distance, mapUrl } = useMemo(() => {
            if (!orderRestaurant?.latitude || !orderRestaurant?.longitude || !order.address.latitude || !order.address.longitude) {
                 return { distance: null, mapUrl: null };
            }
            const dist = calculateDistance(order.address.latitude, order.address.longitude, orderRestaurant.latitude, orderRestaurant.longitude);
            // Construct a Google Maps URL with both origin (restaurant) and destination (customer)
            const url = `https://www.google.com/maps/dir/?api=1&origin=${orderRestaurant.latitude},${orderRestaurant.longitude}&destination=${order.address.latitude},${order.address.longitude}`;
            return { distance: dist, mapUrl: url };
        }, [order.address, orderRestaurant]);
        
        const isThisCardProcessing = isProcessing === order.id;

        return (
            <Card className="w-full max-w-md mx-auto shadow-xl">
                <CardHeader>
                    <CardTitle className="text-center text-2xl">لديك طلب جديد!</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {mapUrl && (
                        <div className="aspect-video w-full rounded-lg overflow-hidden border">
                            <iframe
                                width="100%"
                                height="100%"
                                style={{ border: 0 }}
                                loading="lazy"
                                allowFullScreen
                                src={`https://www.google.com/maps/embed/v1/directions?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&origin=${orderRestaurant?.latitude},${orderRestaurant?.longitude}&destination=${order.address.latitude},${order.address.longitude}`}>
                            </iframe>
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-4 text-center">
                        <div className="p-2 bg-muted rounded-lg">
                            <p className="text-sm text-muted-foreground">ربحك من التوصيل</p>
                            <p className="font-bold text-lg text-primary">{formatCurrency(order.deliveryFee)}</p>
                        </div>
                        <div className="p-2 bg-muted rounded-lg">
                            <p className="text-sm text-muted-foreground">المسافة المقدرة</p>
                            <p className="font-bold text-lg">{distance ? `${distance.toFixed(1)} كم` : 'غير معروف'}</p>
                        </div>
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/50 rounded-lg text-center">
                        <p className="text-sm text-blue-600 dark:text-blue-300">المبلغ المطلوب من الزبون</p>
                        <p className="font-bold text-2xl text-blue-700 dark:text-blue-200">{formatCurrency(order.total)}</p>
                    </div>

                    <div className="flex justify-between items-center text-sm pt-2 border-t">
                        <div className="flex items-center gap-2">
                             <Store className="h-4 w-4 text-muted-foreground"/>
                             <span>المتجر:</span>
                             <span className="font-semibold">{orderRestaurant?.name || 'غير معروف'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                             <MapPin className="h-4 w-4 text-muted-foreground"/>
                             <span>المنطقة:</span>
                             <span className="font-semibold">{order.address.deliveryZone}</span>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="grid grid-cols-2 gap-4">
                    <Button variant="destructive" size="lg" onClick={() => handleRejectOrder(order.id)} disabled={isThisCardProcessing}>
                        {isThisCardProcessing ? <Loader2 className="h-5 w-5 animate-spin"/> : 'رفض'}
                    </Button>
                    <Button size="lg" className="bg-green-600 hover:bg-green-700" onClick={() => handleAcceptOrder(order.id)} disabled={isThisCardProcessing}>
                        {isThisCardProcessing ? <Loader2 className="h-5 w-5 animate-spin"/> : 'قبول الطلب'}
                    </Button>
                </CardFooter>
            </Card>
        )
    };

    return (
        <div className="p-4 space-y-6 flex flex-col min-h-[calc(100vh-1rem)]">
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
                    <Button variant="ghost" size="icon" onClick={handleLogout}>
                        <LogOut className="h-5 w-5"/>
                    </Button>
                 </div>
            </header>

            <main className="flex-grow flex flex-col items-center justify-center">
                {driverStatus === 'IDLE' && (
                    <div className="text-center">
                        <Card className="p-8 shadow-lg">
                           <PlayCircle className="mx-auto h-20 w-20 text-primary mb-4"/>
                           <h2 className="text-2xl font-bold mb-6">أنت غير متصل حالياً</h2>
                           <Button size="lg" onClick={handleStartWork} className="w-full">
                               بدء العمل واستلام الطلبات
                           </Button>
                        </Card>
                    </div>
                )}
                
                 {driverStatus === 'SEARCHING' && (
                    <div className="text-center text-muted-foreground animate-pulse">
                        <Search className="mx-auto h-24 w-24 mb-4"/>
                        <p className="font-semibold text-xl">جاري البحث عن طلب...</p>
                        <p>سيتم إشعارك عند توفر طلب جديد.</p>
                    </div>
                )}

                {driverStatus === 'ORDER_ASSIGNED' && assignedOrder && (
                     <OrderCard order={assignedOrder} />
                )}
            </main>

        </div>
    );
}
