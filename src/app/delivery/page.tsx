
"use client";

import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatCurrency, calculateDistance, cn } from '@/lib/utils';
import { LogOut, CircleDot, Loader2, AlertTriangle, Shield, Check, Map, Inbox, Clock, ChevronLeft, ShieldAlert } from 'lucide-react';
import type { Order, OrderStatus } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useOrders } from '@/hooks/useOrders';
import { useDeliveryWorkers } from '@/hooks/useDeliveryWorkers';
import { useRestaurants } from '@/hooks/useRestaurants';
import { Badge } from '@/components/ui/badge';

interface DeliveryPageProps {
    onNavigate: (tab: number) => void;
    onViewOrder: (id: string) => void;
}

function AvailableOrderCard({ order, onAccept, onReject, isProcessing }: { order: Order, onAccept: (id: string) => void, onReject: (id: string) => void, isProcessing: boolean }) {
    const { restaurants } = useRestaurants();
    const [timeLeft, setTimeLeft] = useState(20);

    useEffect(() => {
        if (!order.confirmedAt) return;
        const timer = setInterval(() => {
            const confirmedTime = new Date(order.confirmedAt!).getTime();
            const now = new Date().getTime();
            const diff = 20 - Math.floor((now - confirmedTime) / 1000);
            setTimeLeft(Math.max(0, diff));
        }, 1000);
        return () => clearInterval(timer);
    }, [order.confirmedAt]);

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
        <Card className="w-full animate-in zoom-in duration-300 border-primary/50 shadow-2xl relative overflow-hidden bg-white rounded-[2.5rem]">
            <div className="absolute top-0 left-0 h-1.5 bg-primary transition-all duration-1000" style={{ width: `${(timeLeft / 20) * 100}%` }} />
            <CardHeader className="pb-2 text-right">
                 <div className="flex justify-between items-center mb-1">
                    <Badge variant="outline" className="text-[10px] font-black border-primary text-primary px-3 py-1 rounded-full bg-primary/5 animate-pulse">تنتهي خلال: {timeLeft}ث</Badge>
                    <CardTitle className="text-primary text-2xl font-black italic">طلب جديد!</CardTitle>
                 </div>
                 <CardDescription className="font-black text-slate-800 text-lg">{order.restaurant?.name || 'متجر جديد'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
                <div className="flex justify-between items-center p-4 bg-primary/5 rounded-2xl border-2 border-primary/10">
                    <span className="font-black text-sm text-slate-600">صافي ربحك:</span>
                    <span className="text-3xl font-black text-primary tracking-tighter">{formatCurrency(order.deliveryFee)}</span>
                </div>
                 <div className="grid grid-cols-2 gap-3 text-xs font-bold text-right">
                    <div className="p-3 bg-muted/30 rounded-2xl border">
                         <p className="text-muted-foreground text-[10px] mb-1 uppercase">الوجهة</p>
                         <p className="truncate font-black">{order.address.deliveryZone}</p>
                    </div>
                    <div className="p-3 bg-muted/30 rounded-2xl border">
                         <p className="text-muted-foreground text-[10px] mb-1 uppercase">المسافة</p>
                         <p className="font-black">{distance ? `~${distance.toFixed(1)} كم` : 'غير محددة'}</p>
                    </div>
                </div>

                <div className="flex flex-col gap-3 pt-2">
                    <div className="grid grid-cols-2 gap-3">
                        <Button variant="outline" className="h-16 rounded-2xl text-destructive font-black border-2 border-destructive/10 bg-destructive/5 hover:bg-destructive/10" onClick={() => onReject(order.id)} disabled={isProcessing}>
                             تجاهل
                        </Button>
                        <Button size="lg" className="h-16 rounded-2xl text-xl font-black bg-green-600 hover:bg-green-700 shadow-xl shadow-green-100 transition-all active:scale-90" onClick={() => onAccept(order.id)} disabled={isProcessing}>
                            {isProcessing ? <Loader2 className="h-6 w-6 animate-spin"/> : <Check className="ml-2 h-7 w-7"/>}
                            قبول الطلب
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function ActiveOrderListItem({ order, onClick }: { order: Order, onClick: () => void }) {
    const getStatusText = (status: OrderStatus) => {
        switch (status) {
            case 'preparing': return "قيد التحضير";
            case 'ready_for_pickup': return "جاهز للاستلام";
            case 'on_the_way': return "في الطريق";
            default: return "نشط";
        }
    }
    
    const getStatusColor = (status: OrderStatus) => {
        switch (status) {
            case 'preparing': return "text-orange-600 bg-orange-50 border-orange-100";
            case 'ready_for_pickup': return "text-green-600 bg-green-50 border-green-100";
            case 'on_the_way': return "text-blue-600 bg-blue-50 border-blue-100";
            default: return "text-primary bg-primary/5 border-primary/10";
        }
    }

    return (
        <button 
            onClick={onClick}
            className="w-full flex items-center gap-4 p-5 bg-white rounded-[2rem] shadow-md border border-slate-50 transition-all active:scale-95 text-right hover:shadow-lg"
        >
            <div className={cn("p-4 rounded-2xl border", getStatusColor(order.status))}>
                <Clock className="h-7 w-7" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-black text-slate-800 text-lg truncate">#{order.id.substring(0, 6)} - {order.restaurant?.name || 'متجر'}</p>
                <div className="flex items-center gap-2 mt-1">
                    <span className={cn("text-[10px] font-black px-3 py-1 rounded-full uppercase", getStatusColor(order.status))}>
                        {getStatusText(order.status)}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-black bg-muted/40 px-2 py-1 rounded-lg italic">{order.address.deliveryZone}</span>
                </div>
            </div>
            <div className="p-2 bg-slate-50 rounded-full"><ChevronLeft className="h-5 w-5 text-slate-400" /></div>
        </button>
    );
}

export default function DeliveryPage({ onNavigate, onViewOrder }: DeliveryPageProps) {
    const { toast } = useToast();
    const [workerId, setWorkerId] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const { allOrders, isLoading: ordersLoading, updateOrderStatus } = useOrders();
    const { deliveryWorkers, isLoading: workersLoading, updateWorkerStatus } = useDeliveryWorkers();

    useEffect(() => {
        const id = localStorage.getItem('deliveryWorkerId');
        if (id) setWorkerId(id);
    }, []);
    
    const worker = useMemo(() => {
        if (!workerId || !deliveryWorkers) return null;
        return deliveryWorkers.find(w => w.id === workerId) || null;
    }, [workerId, deliveryWorkers]);

    const myAssignedOrders = useMemo(() => {
        if (!workerId || !allOrders) return [];
        return allOrders.filter(o => o.deliveryWorkerId === workerId && o.status === 'confirmed');
    }, [workerId, allOrders]);
    
    const myActiveOrders = useMemo(() => {
        if (!workerId || !allOrders) return [];
        return allOrders.filter(o => 
            o.deliveryWorkerId === workerId && 
            ['preparing', 'ready_for_pickup', 'on_the_way'].includes(o.status)
        );
    }, [workerId, allOrders]);

    const handleAcceptOrder = async (orderId: string) => {
        if (!workerId) return;
        setIsProcessing(true);
        try {
            await updateOrderStatus(orderId, 'preparing', workerId);
            toast({ title: "تم قبول العمل! انطلق الآن 🚀" });
        } catch (error) {
             toast({ title: "عذراً، حدث خطأ", variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRejectOrder = async (orderId: string) => {
        setIsProcessing(true);
        try {
            await updateOrderStatus(orderId, 'unassigned');
            toast({ title: "تم الرفض بنجاح" });
        } catch (e) {} finally {
            setIsProcessing(false);
        }
    };
    
    const handleLogout = () => {
        if (workerId) updateWorkerStatus(workerId, false);
        localStorage.removeItem('deliveryWorkerId');
        window.location.reload();
    };
    
    const handleToggleOnlineStatus = () => {
        if (workerId && worker) {
            const newStatus = !worker.isOnline;
            updateWorkerStatus(workerId, newStatus);
            toast({ title: newStatus ? "أنت متصل وجاهز للطلبات 🟢" : "أنت في استراحة الآن ⚪" });
        }
    };

    if (ordersLoading || workersLoading || !workerId) return <div className="flex h-screen items-center justify-center animate-pulse font-black text-primary">جار جلب مهامك...</div>;

    return (
        <div className="block bg-slate-50 pb-60 h-full overflow-y-auto">
            <header className="p-5 flex justify-between items-center bg-white border-b shadow-sm sticky top-0 z-50 rounded-b-[2rem]">
                 <div className="text-right">
                    <h1 className="text-2xl font-black text-primary italic leading-none">كابتن {worker?.name?.split(' ')[0] || 'سبيد'}</h1>
                    <button className="flex items-center gap-2 mt-1.5 active:scale-95 transition-all bg-muted/30 px-3 py-1 rounded-full" onClick={handleToggleOnlineStatus}>
                        <div className={`h-2.5 w-2.5 rounded-full ${worker?.isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                        <span className="text-[10px] font-black text-slate-600">{worker?.isOnline ? 'متاح لاستلام الطلبات' : 'خارج الخدمة'}</span>
                    </button>
                 </div>
                 <div className="flex gap-3">
                     <Button variant="secondary" size="icon" className="rounded-2xl h-12 w-12 shadow-md border-2 border-primary/20 bg-white" onClick={() => onNavigate(2)}>
                        <Shield className="h-6 w-6 text-primary"/>
                    </Button>
                    <Button variant="ghost" size="icon" className="rounded-2xl h-12 w-12 text-destructive bg-destructive/5" onClick={handleLogout}>
                        <LogOut className="h-6 w-6"/>
                    </Button>
                 </div>
            </header>

            <div className="p-4 space-y-8 mt-4">
                {!worker?.isOnline ? (
                    <div className="text-center space-y-6 p-8 animate-in slide-in-from-bottom duration-500 py-24 bg-white rounded-[3rem] shadow-xl border-4 border-white shadow-slate-200">
                        <div className="p-10 bg-yellow-50 rounded-full w-fit mx-auto border-4 border-white shadow-xl">
                            <AlertTriangle className="h-24 w-24 text-yellow-500 animate-bounce"/>
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-slate-800">أنت في استراحة</h2>
                            <p className="text-muted-foreground font-bold mt-2 px-10 leading-relaxed">لن تصلك أي طلبات في هذه الحالة. فعل نشاطك لتبدأ العمل!</p>
                        </div>
                        <Button size="lg" className="w-full h-20 rounded-[2.5rem] text-2xl font-black shadow-2xl shadow-primary/30 transition-all active:scale-95" onClick={handleToggleOnlineStatus}>
                           <CircleDot className="ml-3 h-8 w-8"/> تفعيل الحالة الآن
                        </Button>
                    </div>
                ) : (
                    <>
                        {myAssignedOrders.length > 0 && (
                            <div className="space-y-4 animate-in slide-in-from-top-4 duration-500">
                                <div className="text-right px-2 flex justify-between items-end">
                                    <Badge className="bg-red-500 animate-bounce font-black">{myAssignedOrders.length}</Badge>
                                    <div>
                                        <h2 className="text-2xl font-black text-primary italic">طلبات جديدة مخصصة</h2>
                                        <p className="text-[10px] font-bold text-muted-foreground">قم بالقبول فوراً لضمان عدم سحب الطلب</p>
                                    </div>
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
                        )}

                        <div className="space-y-4">
                             <div className="text-right px-2">
                                <h2 className="text-xl font-black text-slate-800">مهامك النشطة ({myActiveOrders.length})</h2>
                                <p className="text-[10px] font-bold text-muted-foreground">اضغط على البطاقة لتحديث حالة التوصيل</p>
                            </div>
                            {myActiveOrders.length > 0 ? (
                                <div className="space-y-4">
                                    {myActiveOrders.map(order => (
                                        <ActiveOrderListItem 
                                            key={order.id} 
                                            order={order} 
                                            onClick={() => onViewOrder(order.id)} 
                                        />
                                    ))}
                                </div>
                            ) : (
                                myAssignedOrders.length === 0 && (
                                    <div className="text-center space-y-6 p-10 opacity-60 py-48 bg-white/50 rounded-[3rem] border-4 border-dashed">
                                        <Inbox className="mx-auto h-24 w-24 text-primary/20 animate-pulse"/>
                                        <div>
                                            <h2 className="text-2xl font-black text-slate-400">بانتظار عمل جديد...</h2>
                                            <p className="text-muted-foreground font-bold text-sm">ابقَ قريباً من مناطق الطلب الكثيفة.</p>
                                        </div>
                                    </div>
                                )
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
