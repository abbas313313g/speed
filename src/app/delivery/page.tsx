
"use client";

import { useEffect, useState, useMemo, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatCurrency, calculateDistance } from '@/lib/utils';
import { LogOut, CircleDot, Loader2, PackageCheck, AlertTriangle, Shield, Check, X, Map } from 'lucide-react';
import type { Order, OrderStatus } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useOrders } from '@/hooks/useOrders';
import { useDeliveryWorkers } from '@/hooks/useDeliveryWorkers';
import Link from 'next/link';
import { useRestaurants } from '@/hooks/useRestaurants';

type DriverStatus = 'offline' | 'searching' | 'viewing_order';

function OrderCard({ order, onAccept, onReject, isProcessing }: { order: Order, onAccept: (id: string) => void, onReject: (id: string) => void, isProcessing: boolean }) {
    const { restaurants } = useRestaurants();

    const { distance, mapUrl } = useMemo(() => {
        const orderRestaurant = restaurants.find(r => r.id === order.restaurant?.id);
        if (!order.address.latitude || !order.address.longitude || !orderRestaurant?.latitude || !orderRestaurant?.longitude) {
            return { distance: null, mapUrl: null };
        }
        const dist = calculateDistance(orderRestaurant.latitude, orderRestaurant.longitude, order.address.latitude, order.address.longitude);
        const url = `https://www.google.com/maps/dir/?api=1&origin=${orderRestaurant.latitude},${orderRestaurant.longitude}&destination=${order.address.latitude},${order.address.longitude}`;
        return { distance: dist, mapUrl: url };
    }, [order.address, order.restaurant, restaurants]);

    return (
        <Card className="w-full max-w-md animate-in fade-in-50">
            <CardHeader>
                <CardTitle>لديك طلب جديد!</CardTitle>
                <CardDescription>الرجاء مراجعة تفاصيل الطلب وقبوله أو رفضه.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span className="font-semibold">ربحك من التوصيل</span>
                    <span className="text-lg font-bold text-green-600">{formatCurrency(order.deliveryFee)}</span>
                </div>
                 <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span className="font-semibold">المبلغ الإجمالي للاستلام</span>
                    <span className="text-lg font-bold text-primary">{formatCurrency(order.total)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">المنطقة</span>
                    <span className="font-semibold">{order.address.deliveryZone}</span>
                </div>
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">المسافة التقريبية</span>
                    <span className="font-semibold">{distance ? `~${distance.toFixed(1)} كم` : 'غير معروفة'}</span>
                </div>

                {mapUrl && (
                    <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="w-full">
                         <Button variant="outline" className="w-full"><Map className="ml-2 h-4 w-4"/>عرض المسار على الخريطة</Button>
                    </a>
                )}

                <div className="grid grid-cols-2 gap-2 pt-4">
                    <Button variant="destructive" size="lg" onClick={() => onReject(order.id)} disabled={isProcessing}>
                        {isProcessing ? <Loader2 className="h-4 w-4 animate-spin"/> : <X className="ml-2 h-4 w-4"/>}
                        رفض
                    </Button>
                    <Button size="lg" className="bg-green-600 hover:bg-green-700" onClick={() => onAccept(order.id)} disabled={isProcessing}>
                         {isProcessing ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="ml-2 h-4 w-4"/>}
                        قبول
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

export default function DeliveryPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [workerId, setWorkerId] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const { allOrders, isLoading: ordersLoading, updateOrderStatus } = useOrders();
    const { deliveryWorkers, isLoading: workersLoading, updateWorkerStatus } = useDeliveryWorkers();

    useEffect(() => {
        const id = localStorage.getItem('deliveryWorkerId');
        if (!id) {
            router.replace('/delivery/login');
        } else {
            setWorkerId(id);
        }
    }, [router]);
    
    const worker = useMemo(() => {
        if (!workerId || !deliveryWorkers) return null;
        return deliveryWorkers.find(w => w.id === workerId);
    }, [workerId, deliveryWorkers]);

    const assignedOrder = useMemo(() => {
        if (!workerId || !allOrders) return null;
        return allOrders.find(o => o.status === 'pending_assignment' && o.assignedToWorkerId === workerId) || null;
    }, [workerId, allOrders]);
    
    const myCurrentOrder = useMemo(() => {
        if (!workerId || !allOrders) return null;
        return allOrders.find(o => o.deliveryWorkerId === workerId && ['confirmed', 'preparing', 'on_the_way'].includes(o.status));
    }, [workerId, allOrders]);


    const driverStatus: DriverStatus = useMemo(() => {
        if (!worker?.isOnline) return 'offline';
        if (assignedOrder) return 'viewing_order';
        return 'searching';
    }, [worker, assignedOrder]);

    const handleAcceptOrder = async (orderId: string) => {
        if (!workerId) return;
        setIsProcessing(true);
        try {
            await updateOrderStatus(orderId, 'confirmed', workerId);
            toast({ title: "تم قبول الطلب بنجاح!" });
            router.push(`/delivery/order/${orderId}`);
        } catch (error: any) {
            // Error is already toasted by the hook
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleRejectOrder = async (orderId: string) => {
        if (!workerId) return;
        setIsProcessing(true);
        try {
            await updateOrderStatus(orderId, 'unassigned', workerId);
            toast({ title: "تم رفض الطلب" });
        } catch (error: any) {
             // Error is already toasted by the hook
        } finally {
             setIsProcessing(false);
        }
    };
    
    const handleLogout = () => {
        if (workerId) {
            updateWorkerStatus(workerId, false);
        }
        localStorage.removeItem('deliveryWorkerId');
        router.replace('/delivery/login');
    };
    
    const handleToggleOnlineStatus = () => {
        if (workerId && worker) {
            const newStatus = !worker.isOnline;
            updateWorkerStatus(workerId, newStatus);
            toast({ title: newStatus ? "أنت متصل الآن" : "أنت غير متصل الآن" });
        }
    };
    
    const isLoading = ordersLoading || workersLoading || !workerId;
    if (isLoading) return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

    const renderContent = () => {
        if (myCurrentOrder) {
            return (
                 <div className="text-center space-y-4">
                    <PackageCheck className="mx-auto h-16 w-16 text-primary"/>
                    <h2 className="text-2xl font-bold">لديك طلب قيد التنفيذ</h2>
                    <p className="text-muted-foreground">أكمل طلبك الحالي لمتابعة استلام طلبات جديدة.</p>
                     <Button size="lg" asChild>
                        <Link href={`/delivery/order/${myCurrentOrder.id}`}>
                            متابعة الطلب الحالي
                        </Link>
                    </Button>
                </div>
            )
        }

        switch (driverStatus) {
            case 'offline':
                return (
                    <div className="text-center space-y-4">
                        <AlertTriangle className="mx-auto h-16 w-16 text-yellow-500"/>
                        <h2 className="text-2xl font-bold">أنت غير متصل</h2>
                        <p className="text-muted-foreground">لن تتلقى أي طلبات جديدة. اضغط على الزر أدناه لبدء العمل.</p>
                        <Button size="lg" onClick={handleToggleOnlineStatus}>
                           <CircleDot className="ml-2 h-5 w-5"/> بدء العمل
                        </Button>
                    </div>
                );
            case 'searching':
                return (
                     <div className="text-center space-y-4">
                        <Loader2 className="mx-auto h-16 w-16 animate-spin text-primary"/>
                        <h2 className="text-2xl font-bold">جارِ البحث عن طلب...</h2>
                        <p className="text-muted-foreground">سيتم إشعارك فور توفر طلب جديد في منطقتك.</p>
                    </div>
                );
            case 'viewing_order':
                if (assignedOrder) {
                    return <OrderCard order={assignedOrder} onAccept={handleAcceptOrder} onReject={handleRejectOrder} isProcessing={isProcessing}/>;
                }
                return null;
        }
    }

    return (
        <div className="p-4 space-y-6 flex flex-col min-h-screen">
            <header className="flex justify-between items-center">
                 <div>
                    <h1 className="text-2xl font-bold">مرحباً {worker?.name}</h1>
                    <div className="flex items-center gap-2 text-sm cursor-pointer" onClick={handleToggleOnlineStatus}>
                        <CircleDot className={`h-4 w-4 ${worker?.isOnline ? 'text-green-500' : 'text-gray-400'}`} />
                        <span className="text-muted-foreground">{worker?.isOnline ? 'أنت متصل' : 'أنت غير متصل'}</span>
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

            <main className="flex-grow flex items-center justify-center">
               {renderContent()}
            </main>
        </div>
    );
}

    
