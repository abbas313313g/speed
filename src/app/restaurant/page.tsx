"use client";

import { useContext, useMemo, useState, useEffect, useRef } from 'react';
import { RestaurantContext } from '@/contexts/RestaurantContext';
import { useOrders } from '@/hooks/useOrders';
import { Button } from '@/components/ui/button';
import { LogOut, Loader2, PackageSearch, History, CheckCircle2, Clock, Volume2, VolumeX, BellRing, PackageCheck, Truck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

export default function RestaurantDashboardPage({ onNavigate }: { onNavigate: (tab: number) => void }) {
    const context = useContext(RestaurantContext);
    const { allOrders, updateOrderStatus, isLoading: oLoading } = useOrders();
    const { toast } = useToast();

    const [isMuted, setIsMuted] = useState(false);
    const [notifEnabled, setNotifEnabled] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const myOrders = useMemo(() => {
        if (!context?.restaurant || !allOrders) return [];
        return allOrders.filter(o => o.restaurant?.id === context.restaurant?.id);
    }, [context?.restaurant, allOrders]);

    const newOrders = myOrders.filter(o => o.status === 'unassigned' || o.status === 'pending_assignment');
    const preparingOrders = myOrders.filter(o => o.status === 'preparing');
    const readyOrders = myOrders.filter(o => o.status === 'ready_for_pickup');
    const deliveredOrders = myOrders.filter(o => ['on_the_way', 'delivered'].includes(o.status)).slice(0, 5);

    useEffect(() => {
        if (newOrders.length > 0 && !isMuted) {
            if (!audioRef.current) {
                audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                audioRef.current.loop = true;
            }
            audioRef.current.play().catch(() => console.log("Sound blocked by browser"));
        } else if (audioRef.current) {
            audioRef.current.pause();
        }
    }, [newOrders.length, isMuted]);

    const requestNotif = async () => {
        if (!("Notification" in window)) {
            toast({ title: "المتصفح لا يدعم التنبيهات", variant: "destructive" });
            return;
        }
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
            setNotifEnabled(true);
            toast({ title: "تم تفعيل التنبيهات بنجاح" });
        }
    };

    const handleUpdateStatus = async (orderId: string, status: any) => {
        await updateOrderStatus(orderId, status);
        toast({ title: "تم تحديث حالة الطلب" });
    };

    if (!context?.restaurant || oLoading) return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;

    return (
        <div className="flex flex-col min-h-full bg-muted/10 pb-60">
            <header className="p-4 bg-white border-b shadow-sm flex justify-between items-center sticky top-0 z-50">
                <div className="text-right">
                    <h1 className="text-xl font-black text-primary leading-none">{context.restaurant.name}</h1>
                    <p className="text-[10px] font-bold text-muted-foreground mt-1">لوحة الإدارة المباشرة</p>
                </div>
                <div className="flex gap-2">
                    <Button 
                        variant="outline" 
                        size="icon" 
                        className={cn("rounded-xl h-10 w-10", !isMuted && newOrders.length > 0 && "animate-bounce bg-red-50 text-red-600")}
                        onClick={() => setIsMuted(!isMuted)}
                    >
                        {isMuted ? <VolumeX className="h-5 w-5"/> : <Volume2 className="h-5 w-5"/>}
                    </Button>
                    <Button 
                        variant={notifEnabled ? "secondary" : "outline"} 
                        size="icon" 
                        className={cn("rounded-xl h-10 w-10", notifEnabled && "bg-green-100 text-green-600")} 
                        onClick={requestNotif}
                    >
                        <BellRing className="h-5 w-5"/>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={context.logout} className="text-destructive"><LogOut className="h-5 w-5"/></Button>
                </div>
            </header>

            <nav className="p-4 grid grid-cols-2 gap-3 sticky top-[73px] bg-muted/5 z-40 backdrop-blur-md">
                <Button onClick={() => onNavigate(2)} className="rounded-2xl h-14 bg-white text-primary border-2 border-primary/20 shadow-sm flex flex-col gap-0 active:scale-95 transition-all">
                    <PackageSearch className="h-5 w-5"/>
                    <span className="text-[10px] font-black">منيو المتجر</span>
                </Button>
                <Button onClick={() => onNavigate(3)} className="rounded-2xl h-14 bg-white text-muted-foreground border-2 border-muted shadow-sm flex flex-col gap-0 active:scale-95 transition-all">
                    <History className="h-5 w-5"/>
                    <span className="text-[10px] font-black">السجل والمالية</span>
                </Button>
            </nav>

            <main className="p-4 space-y-8">
                {/* 1. الطلبات الجديدة */}
                <section className="space-y-4">
                    <h2 className="text-lg font-black flex items-center gap-2 px-1">
                        <div className="h-2 w-2 rounded-full bg-red-500 animate-ping"/>
                        طلبات جديدة ({newOrders.length})
                    </h2>
                    {newOrders.length === 0 ? (
                        <div className="text-center py-8 bg-white/50 rounded-[2rem] border-2 border-dashed border-muted">
                            <p className="text-muted-foreground text-xs font-bold">لا توجد طلبات جديدة حالياً.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {newOrders.map(order => (
                                <Card key={order.id} className="rounded-[1.5rem] border-2 border-primary/20 shadow-md overflow-hidden bg-white">
                                    <CardHeader className="pb-2 bg-primary/5">
                                        <div className="flex justify-between items-center">
                                            <CardTitle className="text-sm font-black">طلب #{order.id.substring(0, 6)}</CardTitle>
                                            <Badge className="bg-red-500 text-white">جديد!</Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-4 space-y-3 text-right">
                                        <div className="text-xs space-y-1">
                                            {order.items.map((item, i) => (
                                                <div key={i} className="flex justify-between font-bold">
                                                    <span>{item.product.name} (x{item.quantity})</span>
                                                    <span>{formatCurrency((item.selectedSize?.price || item.product.price) * item.quantity)}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <Separator className="border-dashed"/>
                                        <Button className="w-full h-12 rounded-xl font-black text-lg" onClick={() => handleUpdateStatus(order.id, 'preparing')}>
                                            قبول وبدء التحضير
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </section>

                {/* 2. قيد التنفيذ */}
                <section className="space-y-4">
                    <h2 className="text-lg font-black flex items-center gap-2 px-1 text-orange-500">
                        <Clock className="h-5 w-5"/>
                        قيد التحضير ({preparingOrders.length})
                    </h2>
                    <div className="space-y-3">
                        {preparingOrders.map(order => (
                            <Card key={order.id} className="rounded-2xl border-none shadow-sm bg-white">
                                <CardContent className="p-4 flex items-center justify-between text-right">
                                    <div>
                                        <p className="text-[10px] font-bold text-muted-foreground">#{order.id.substring(0, 6)}</p>
                                        <h3 className="font-black text-primary">{order.items.length} منتجات</h3>
                                    </div>
                                    <Button variant="outline" className="rounded-xl font-black border-primary text-primary h-10 px-4" onClick={() => handleUpdateStatus(order.id, 'ready_for_pickup')}>
                                        تم التجهيز
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </section>

                {/* 3. جاهز للاستلام */}
                <section className="space-y-4">
                    <h2 className="text-lg font-black flex items-center gap-2 px-1 text-green-600">
                        <PackageCheck className="h-5 w-5"/>
                        جاهز للاستلام ({readyOrders.length})
                    </h2>
                    <div className="space-y-3">
                        {readyOrders.map(order => (
                            <Card key={order.id} className="rounded-2xl border-none shadow-sm bg-white border-r-4 border-r-green-500">
                                <CardContent className="p-4 flex items-center justify-between text-right">
                                    <div>
                                        <p className="text-[10px] font-bold text-muted-foreground">#{order.id.substring(0, 6)}</p>
                                        <h3 className="font-black text-foreground">بانتظار المندوب</h3>
                                    </div>
                                    <div className="p-2 bg-green-50 rounded-full">
                                        <CheckCircle2 className="h-6 w-6 text-green-500 animate-pulse"/>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </section>

                 {/* 4. تم التوصيل (نظرة سريعة) */}
                 <section className="space-y-4 opacity-70">
                    <h2 className="text-lg font-black flex items-center gap-2 px-1 text-muted-foreground">
                        <Truck className="h-5 w-5"/>
                        آخر الطلبات الموصلة
                    </h2>
                    <div className="space-y-3">
                        {deliveredOrders.map(order => (
                            <div key={order.id} className="flex justify-between items-center p-3 bg-white/50 rounded-xl text-xs font-bold">
                                <span>#{order.id.substring(0, 6)}</span>
                                <span className="text-muted-foreground">{order.status === 'delivered' ? 'تم التوصيل' : 'في الطريق'}</span>
                                <span className="text-primary">{formatCurrency(order.total - order.deliveryFee)}</span>
                            </div>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
}