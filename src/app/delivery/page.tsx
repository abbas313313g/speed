
"use client";

import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatCurrency, calculateDistance } from '@/lib/utils';
import { LogOut, CircleDot, Loader2, PackageCheck, AlertTriangle, Shield, Check, X, Map, Inbox } from 'lucide-react';
import type { Order } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useOrders } from '@/hooks/useOrders';
import { useDeliveryWorkers } from '@/hooks/useDeliveryWorkers';
import { useRestaurants } from '@/hooks/useRestaurants';

interface DeliveryPageProps {
    onNavigate: (tab: number) => void;
    onViewOrder: (id: string) => void;
}

function AvailableOrderCard({ order, onAccept, onReject, isProcessing }: { order: Order, onAccept: (id: string) => void, onReject: (id: string) => void, isProcessing: boolean }) {
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
        <Card className="w-full animate-in fade-in-50 border-primary/20 shadow-md">
            <CardHeader className="pb-2">
                 <CardTitle className="text-primary">طلب مسند إليك!</CardTitle>
                 <CardDescription className="font-bold text-foreground">من متجر: {order.restaurant?.name}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-primary/5 rounded-2xl border border-primary/10">
                    <span className="font-bold text-sm">ربحك الصافي:</span>
                    <span className="text-xl font-black text-primary">{formatCurrency(order.deliveryFee)}</span>
                </div>
                 <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                    <div className="p-2 bg-muted rounded-xl">
                         <p className="text-muted-foreground mb-1">المنطقة</p>
                         <p className="truncate">{order.address.deliveryZone}</p>
                    </div>
                    <div className="p-2 bg-muted rounded-xl">
                         <p className="text-muted-foreground mb-1">المسافة</p>
                         <p>{distance ? `~${distance.toFixed(1)} كم` : 'غير محددة'}</p>
                    </div>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                    {mapUrl && (
                        <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="w-full">
                             <Button variant="outline" className="w-full h-11 rounded-xl font-bold"><Map className="ml-2 h-4 w-4"/>رؤية المسار</Button>
                        </a>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                        <Button variant="ghost" className="h-14 rounded-xl text-destructive font-bold border-2 border-destructive/10" onClick={() => onReject(order.id)} disabled={isProcessing}>
                             تجاهل
                        </Button>
                        <Button size="lg" className="h-14 rounded-xl text-lg font-black bg-green-600 hover:bg-green-700 shadow-lg shadow-green-200" onClick={() => onAccept(order.id)} disabled={isProcessing}>
                            {isProcessing ? <Loader2 className="h-5 w-5 animate-spin"/> : <Check className="ml-2 h-6 w-6"/>}
                            قبول
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export default function DeliveryPage({ onNavigate, onViewOrder }: DeliveryPageProps) {
    const { toast } = useToast();
    const [workerId, setWorkerId] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [ignoredOrders, setIgnoredOrders] = useState<Set<string>>(new Set());

    const { allOrders, isLoading: ordersLoading, updateOrderStatus } = useOrders();
    const { deliveryWorkers, isLoading: workersLoading, updateWorkerStatus } = useDeliveryWorkers();

    useEffect(() => {
        const id = localStorage.getItem('deliveryWorkerId');
        if (id) {
            setWorkerId(id);
        }
    }, []);
    
    const worker = useMemo(() => {
        if (!workerId || !deliveryWorkers) return null;
        return deliveryWorkers.find(w => w.id === workerId);
    }, [workerId, deliveryWorkers]);

    const myAssignedOrders = useMemo(() => {
        if (!workerId || !allOrders) return [];
        return allOrders.filter(o => 
            o.deliveryWorkerId === workerId && 
            o.status === 'confirmed' && 
            !ignoredOrders.has(o.id)
        );
    }, [workerId, allOrders, ignoredOrders]);
    
    const myCurrentOrder = useMemo(() => {
        if (!workerId || !allOrders) return null;
        return allOrders.find(o => o.deliveryWorkerId === workerId && ['preparing', 'ready_for_pickup', 'on_the_way'].includes(o.status));
    }, [workerId, allOrders]);


    const driverStatus: 'offline' | 'searching' | 'has_active_order' = useMemo(() => {
        if (!worker?.isOnline) return 'offline';
        if (myCurrentOrder) return 'has_active_order';
        return 'searching';
    }, [worker, myCurrentOrder]);

    const handleAcceptOrder = async (orderId: string) => {
        if (!workerId) return;
        setIsProcessing(true);
        try {
            await updateOrderStatus(orderId, 'preparing', workerId);
            toast({ title: "تم قبول الطلب! اذهب للمطعم الآن" });
        } catch (error: any) {
             toast({ title: "عذراً، حدث خطأ", variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRejectOrder = (orderId: string) => {
        setIgnoredOrders(prev => new Set(prev).add(orderId));
        toast({ title: "تم تجاهل الطلب" });
    };
    
    const handleLogout = () => {
        if (workerId) {
            updateWorkerStatus(workerId, false);
        }
        localStorage.removeItem('deliveryWorkerId');
        window.location.reload();
    };
    
    const handleToggleOnlineStatus = () => {
        if (workerId && worker) {
            const newStatus = !worker.isOnline;
            updateWorkerStatus(workerId, newStatus);
            toast({ title: newStatus ? "أنت متصل وجاهز للطلبات" : "أنت خارج الخدمة الآن" });
        }
    };
    
    const isLoading = ordersLoading || workersLoading || !workerId;
    if (isLoading) return <div className="flex h-screen w-full flex-col items-center justify-center bg-background"><Loader2 className="h-10 w-10 animate-spin text-primary" /><p className="mt-4 font-bold text-muted-foreground animate-pulse">جارِ جلب المهام...</p></div>;

    const renderContent = () => {
        switch (driverStatus) {
            case 'offline':
                return (
                    <div className="text-center space-y-6 p-8 animate-in zoom-in duration-300 py-20">
                        <div className="p-8 bg-yellow-50 rounded-full w-fit mx-auto border-4 border-white shadow-xl">
                            <AlertTriangle className="h-20 w-20 text-yellow-500"/>
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-foreground">أنت غير متصل</h2>
                            <p className="text-muted-foreground font-bold mt-2">لن تصلك أي طلبات في هذه الحالة. ابدأ العمل الآن!</p>
                        </div>
                        <Button size="lg" className="w-full h-16 rounded-2xl text-xl font-black shadow-xl" onClick={handleToggleOnlineStatus}>
                           <CircleDot className="ml-2 h-6 w-6"/> ابدأ استقبال الطلبات
                        </Button>
                    </div>
                );
            case 'has_active_order':
                 return (
                     <div className="text-center space-y-6 p-8 animate-in slide-in-from-bottom duration-500 py-20">
                        <div className="p-8 bg-primary/10 rounded-full w-fit mx-auto">
                            <PackageCheck className="h-20 w-20 text-primary animate-bounce"/>
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-primary">لديك طلب نشط</h2>
                            <p className="text-muted-foreground font-bold mt-2">أكمل مهمتك الحالية لتتمكن من استلام المزيد.</p>
                        </div>
                         <Button size="lg" className="w-full h-16 rounded-2xl text-xl font-black shadow-lg" onClick={() => onViewOrder(myCurrentOrder!.id)}>
                            تفاصيل المهمة الحالية
                        </Button>
                    </div>
                );
            case 'searching':
                if (myAssignedOrders.length > 0) {
                    return (
                        <div className="w-full space-y-6 p-4 animate-in fade-in slide-in-from-top duration-500 pb-20">
                            <div className="text-center space-y-1">
                                <h2 className="text-2xl font-black text-primary">وصلتك طلبات! ({myAssignedOrders.length})</h2>
                                <p className="text-xs font-bold text-muted-foreground">اضغط قبول لبدء المهمة فوراً</p>
                            </div>
                            {myAssignedOrders.map(order => (
                                <AvailableOrderCard 
                                    key={order.id} 
                                    order={order} 
                                    onAccept={handleAcceptOrder} 
                                    onReject={handleRejectOrder}
                                    isProcessing={isProcessing} 
                                />
                            ))}
                        </div>
                    );
                }
                return (
                     <div className="text-center space-y-6 p-8 opacity-60 py-40">
                        <Inbox className="mx-auto h-24 w-24 text-muted-foreground animate-pulse"/>
                        <div>
                            <h2 className="text-2xl font-bold">بانتظار طلب جديد...</h2>
                            <p className="text-muted-foreground font-medium">ابقَ قريباً من المناطق الحيوية لزيادة فرصك.</p>
                        </div>
                    </div>
                );
        }
    }

    return (
        <div className="flex flex-col bg-background min-h-full pb-20">
            <header className="p-4 flex justify-between items-center bg-card border-b shadow-sm sticky top-0 z-20">
                 <div>
                    <h1 className="text-xl font-black text-primary leading-none">أهلاً {worker?.name?.split(' ')[0]}</h1>
                    <button className="flex items-center gap-2 mt-1 active:scale-95 transition-all" onClick={handleToggleOnlineStatus}>
                        <div className={`h-2.5 w-2.5 rounded-full ${worker?.isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                        <span className="text-[10px] font-black text-muted-foreground">{worker?.isOnline ? 'أنت متصل الآن' : 'أوفلاين'}</span>
                    </button>
                 </div>
                 <div className="flex gap-2">
                     <Button variant="secondary" size="icon" className="rounded-xl h-10 w-10 shadow-sm" onClick={() => onNavigate(2)}>
                        <Shield className="h-5 w-5 text-primary"/>
                    </Button>
                    <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10 text-destructive" onClick={handleLogout}>
                        <LogOut className="h-5 w-5"/>
                    </Button>
                 </div>
            </header>

            <div className="flex-1">
               {renderContent()}
            </div>
        </div>
    );
}
