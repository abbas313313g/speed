"use client";

import { useContext, useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { RestaurantContext } from '@/contexts/RestaurantContext';
import { useOrders } from '@/hooks/useOrders';
import { Button } from '@/components/ui/button';
import { LogOut, Loader2, BellRing, Volume2, VolumeX, PackageOpen, Clock, CheckCircle2, ReceiptText, ShieldCheck } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import type { Order } from '@/lib/types';
import { formatCurrency, cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface RestaurantDashboardPageProps {
    onNavigate: (tab: number) => void;
}

export default function RestaurantDashboardPage({ onNavigate }: RestaurantDashboardPageProps) {
    const context = useContext(RestaurantContext);
    const { allOrders, isLoading: ordersLoading } = useOrders();
    const { toast } = useToast();
    
    const [newOrderAlert, setNewOrderAlert] = useState<Order | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [handledOrderIds, setHandledOrderIds] = useState<Set<string>>(new Set());
    const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            setNotifPermission(Notification.permission);
        }
    }, []);

    const requestNotifPermission = () => {
        if (!('Notification' in window)) {
            toast({ title: "المتصفح لا يدعم الإشعارات", variant: "destructive" });
            return;
        }

        // دعم الطريقة القديمة والحديثة لطلب الإذن
        const handlePermission = (permission: NotificationPermission) => {
            setNotifPermission(permission);
            if (permission === 'granted') {
                toast({ title: "تم تفعيل الإشعارات بنجاح" });
                // محاولة تشغيل الصوت للتأكد من تفاعل المستخدم
                if (audioRef.current) {
                    audioRef.current.play().then(() => {
                        audioRef.current?.pause();
                        audioRef.current!.currentTime = 0;
                    }).catch(() => {});
                }
            } else {
                toast({ title: "تم رفض التنبيهات الخارجية", variant: "destructive" });
            }
        };

        try {
            const promise = Notification.requestPermission(handlePermission);
            if (promise) promise.then(handlePermission);
        } catch (e) {
            Notification.requestPermission(handlePermission);
        }
    };

    const myNewOrders = useMemo(() => {
        if (!context?.restaurant || !allOrders) return [];
        return allOrders.filter(order => 
            order.restaurant?.id === context.restaurant?.id && 
            order.status === 'unassigned' &&
            !handledOrderIds.has(order.id)
        );
    }, [context?.restaurant, allOrders, handledOrderIds]);
    
    const myPreparingOrders = useMemo(() => {
        if (!context?.restaurant || !allOrders) return [];
        return allOrders.filter(order => 
            order.restaurant?.id === context.restaurant?.id && 
            ['preparing', 'confirmed', 'pending_assignment'].includes(order.status)
        );
    }, [context?.restaurant, allOrders]);
    
     const myReadyOrders = useMemo(() => {
        if (!context?.restaurant || !allOrders) return [];
        return allOrders.filter(order => 
            order.restaurant?.id === context.restaurant?.id && 
            order.status === 'ready_for_pickup'
        );
    }, [context?.restaurant, allOrders]);

    const stopAlert = useCallback(() => {
        setNewOrderAlert(null);
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
    }, []);

    useEffect(() => {
        if (myNewOrders.length > 0 && !newOrderAlert) {
            const latestOrder = myNewOrders[0];
            setNewOrderAlert(latestOrder);
            
            if (!isMuted && audioRef.current) {
                audioRef.current.play().catch(() => {});
            }

            if (notifPermission === 'granted') {
                try {
                    new Notification("سبيد شوب: طلب جديد!", {
                        body: `وصلك طلب جديد بقيمة ${formatCurrency(latestOrder.total)}`,
                        icon: 'https://placehold.co/100x100.png'
                    });
                } catch (e) {}
            }
        } else if (myNewOrders.length === 0 && newOrderAlert) {
            stopAlert();
        }
    }, [myNewOrders, newOrderAlert, isMuted, notifPermission, stopAlert]);

    const handleAcceptOrder = async (orderId: string) => {
        setHandledOrderIds(prev => new Set(prev).add(orderId));
        stopAlert();
        if (context) {
            await context.updateRestaurantOrderStatus(orderId, 'preparing');
            toast({ title: "تم قبول الطلب، ابدأ التحضير!" });
        }
    };

    const handleRejectOrder = async (orderId: string) => {
        setHandledOrderIds(prev => new Set(prev).add(orderId));
        stopAlert();
        if (context) {
            await context.updateRestaurantOrderStatus(orderId, 'cancelled');
            toast({ title: "تم رفض الطلب", variant: 'destructive' });
        }
    };

    if (!context || !context.restaurant) {
        return <div className="flex h-screen w-full items-center justify-center bg-background"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
    }

    const { restaurant, logout, updateRestaurantOrderStatus, isProcessing } = context;

    return (
        <div className="flex flex-col min-h-screen bg-muted/10 relative overflow-x-hidden">
            <audio ref={audioRef} loop src="https://assets.mixkit.co/active_storage/sfx/2861/2861-preview.mp3" />

            <header className="p-4 bg-white border-b shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 shrink-0 z-50 sticky top-0">
                <div className="flex items-center gap-4 text-right w-full md:w-auto">
                    <div className="p-3 bg-primary/10 rounded-2xl">
                        <BellRing className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-primary">لوحة {restaurant.name}</h1>
                        <p className="text-muted-foreground text-xs font-bold">رقم المتجر: {restaurant.restaurantNumber}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                     <Button 
                        variant="outline" 
                        className={cn(
                            "font-black border-2 rounded-xl h-12 flex-1 md:flex-none shadow-sm",
                            notifPermission === 'granted' ? "border-green-500 text-green-600 bg-green-50" : "border-blue-500 text-blue-600 bg-blue-50"
                        )} 
                        onClick={requestNotifPermission}
                     >
                        <ShieldCheck className="ml-2 h-4 w-4"/> 
                        {notifPermission === 'granted' ? "التنبيهات مفعلة" : "تفعيل التنبيهات"}
                     </Button>
                     <Button variant="outline" size="icon" onClick={() => setIsMuted(!isMuted)} className="h-12 w-12">
                        {isMuted ? <VolumeX className="h-5 w-5 text-destructive"/> : <Volume2 className="h-5 w-5 text-primary"/>}
                     </Button>
                     <Button variant="outline" className="font-bold border-2 rounded-xl h-12" onClick={() => onNavigate(2)}>السجل</Button>
                     <Button variant="ghost" size="icon" onClick={logout} className="text-destructive h-12 w-12"><LogOut className="h-5 w-5"/></Button>
                </div>
            </header>

            <main className="flex-1 p-4 md:p-6 pb-40">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* طلبات جديدة */}
                    <section className="space-y-4">
                        <h2 className="text-lg font-black flex items-center gap-2 pr-2"><PackageOpen className="text-blue-500"/> طلبات جديدة ({myNewOrders.length})</h2>
                        <div className="rounded-[2.5rem] border-2 border-blue-100 p-4 bg-blue-50/30 min-h-[300px]">
                            {myNewOrders.length > 0 ? myNewOrders.map(order => (
                                <Card key={order.id} className="mb-4 rounded-2xl shadow-md border-none overflow-hidden text-right">
                                    <div className="bg-blue-500 p-2 text-white text-[10px] font-bold text-center">طلب جديد # {order.id.substring(0,6)}</div>
                                    <CardHeader className="p-4 pb-2">
                                        <CardTitle className="text-base font-black flex justify-between items-center flex-row-reverse">
                                            <span>محتويات الطلب</span>
                                            <span className="text-xs text-muted-foreground">{new Date(order.date).toLocaleTimeString('ar-IQ', {hour: '2-digit', minute:'2-digit'})}</span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-4 pt-0">
                                        <ul className="space-y-1">
                                            {order.items.map(item => (
                                                <li key={item.product.id + (item.selectedSize?.name || '')} className="flex justify-between text-sm flex-row-reverse font-bold">
                                                    <span>{item.quantity}x {item.product.name}</span>
                                                    {item.selectedSize && <span className="text-xs text-muted-foreground font-medium">({item.selectedSize.name})</span>}
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>
                                    <CardFooter className="p-4 grid grid-cols-2 gap-2 bg-muted/20">
                                         <Button variant="ghost" className="text-destructive font-bold" onClick={() => handleRejectOrder(order.id)} disabled={isProcessing}>رفض</Button>
                                         <Button className="bg-green-600 hover:bg-green-700 font-black rounded-xl" onClick={() => handleAcceptOrder(order.id)} disabled={isProcessing}>قبول</Button>
                                    </CardFooter>
                                </Card>
                            )) : <p className="text-center text-muted-foreground/50 py-20 font-bold">لا توجد طلبات جديدة</p>}
                        </div>
                    </section>

                    {/* قيد التحضير */}
                    <section className="space-y-4">
                        <h2 className="text-lg font-black flex items-center gap-2 justify-end pl-2"><Clock className="text-orange-500"/> قيد التحضير ({myPreparingOrders.length})</h2>
                        <div className="rounded-[2.5rem] border-2 border-orange-100 p-4 bg-orange-50/30 min-h-[300px]">
                             {myPreparingOrders.length > 0 ? myPreparingOrders.map(order => (
                                <Card key={order.id} className="mb-4 rounded-2xl shadow-md border-none text-right">
                                    <CardHeader className="p-4">
                                        <CardTitle className="text-base font-black flex justify-between flex-row-reverse">
                                            <span>طلب #{order.id.substring(0,6)}</span>
                                            <Badge variant="outline" className="bg-white text-orange-600 border-orange-200">تحضير</Badge>
                                        </CardTitle>
                                    </CardHeader>
                                     <CardContent className="p-4 pt-0">
                                         <ul className="space-y-1 mb-3">
                                            {order.items.map(item => (
                                                <li key={item.product.id + (item.selectedSize?.name || '')} className="text-xs font-bold flex justify-between flex-row-reverse opacity-80">
                                                    <span>{item.quantity}x {item.product.name}</span>
                                                </li>
                                            ))}
                                        </ul>
                                        <div className="text-[10px] text-muted-foreground font-black text-center p-2 bg-white rounded-xl border border-dashed">
                                            {order.deliveryWorker ? `الكابتن ${order.deliveryWorker.name} قادم للاستلام` : "بانتظار تعيين كابتن..."}
                                        </div>
                                    </CardContent>
                                    <CardFooter className="p-4">
                                        <Button className="w-full bg-orange-500 hover:bg-orange-600 font-black rounded-xl py-6" onClick={() => updateRestaurantOrderStatus(order.id, 'ready_for_pickup')} disabled={isProcessing}>
                                            جاهز للتسليم ✓
                                        </Button>
                                    </CardFooter>
                                </Card>
                             )) : <p className="text-center text-muted-foreground/50 py-20 font-bold">لا يوجد طلبات قيد التحضير</p>}
                        </div>
                    </section>

                    {/* جاهز للاستلام */}
                    <section className="space-y-4">
                        <h2 className="text-lg font-black flex items-center gap-2 justify-end pl-2"><CheckCircle2 className="text-green-500"/> جاهز للاستلام ({myReadyOrders.length})</h2>
                        <div className="rounded-[2.5rem] border-2 border-green-100 p-4 bg-green-50/30 min-h-[300px]">
                             {myReadyOrders.length > 0 ? myReadyOrders.map(order => (
                                <Card key={order.id} className="mb-4 rounded-2xl shadow-md border-none bg-green-500 text-white text-right">
                                    <CardHeader className="p-4">
                                        <CardTitle className="text-base font-black">جاهز #{order.id.substring(0,6)}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-4 pt-0">
                                        <div className="bg-white/20 rounded-xl p-3">
                                            <p className="text-xs font-bold">بانتظار الكابتن للاستلام</p>
                                            {order.deliveryWorker && <p className="font-black text-sm mt-1">المندوب: {order.deliveryWorker.name}</p>}
                                        </div>
                                    </CardContent>
                                </Card>
                             )) : <p className="text-center text-muted-foreground/50 py-20 font-bold">لا توجد طلبات جاهزة</p>}
                        </div>
                    </section>
                </div>
            </main>

            {/* تنبيه الطلب الجديد */}
            <Dialog open={!!newOrderAlert} onOpenChange={() => {}}>
                <DialogContent className="sm:max-w-md bg-white rounded-t-[3rem] border-none shadow-2xl p-0 overflow-hidden">
                    <div className="bg-primary p-6 text-white text-center">
                        <BellRing className="h-12 w-12 mx-auto animate-bounce mb-2"/>
                        <DialogTitle className="text-3xl font-black italic">طلب جديد وصل!</DialogTitle>
                    </div>
                    
                    <div className="p-6 space-y-4 text-right">
                        <p className="text-xl font-black text-primary border-b-2 border-dashed pb-4 flex justify-between flex-row-reverse">
                            <span>رقم الطلب:</span>
                            <span dir="ltr">#{newOrderAlert?.id.substring(0, 6)}</span>
                        </p>
                        
                        <div className="max-h-[30vh] overflow-y-auto rounded-2xl bg-muted/20 p-3 space-y-3">
                            {newOrderAlert?.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center p-3 bg-white rounded-xl shadow-sm flex-row-reverse font-bold text-sm">
                                    <span>{item.quantity}x {item.product.name}</span>
                                    <span className="text-primary">{formatCurrency((item.selectedSize?.price ?? item.product.price) * item.quantity)}</span>
                                </div>
                            ))}
                        </div>

                        <div className="pt-2 flex justify-between items-center px-2 flex-row-reverse font-black text-lg">
                            <span>المجموع للمطعم:</span>
                            <span className="text-2xl text-primary">{formatCurrency(
                                newOrderAlert?.items.reduce((acc, item) => acc + ((item.selectedSize?.price ?? item.product.price) * item.quantity), 0) || 0
                            )}</span>
                        </div>
                    </div>

                    <DialogFooter className="p-6 pt-0 flex-col gap-3">
                        <Button className="w-full h-16 text-2xl font-black bg-primary rounded-2xl shadow-xl" onClick={() => handleAcceptOrder(newOrderAlert!.id)} disabled={isProcessing}>
                            {isProcessing ? <Loader2 className="animate-spin h-6 w-6"/> : "قبول وتحضير"}
                        </Button>
                        <Button variant="ghost" className="w-full text-destructive font-bold h-12" onClick={() => handleRejectOrder(newOrderAlert!.id)} disabled={isProcessing}>رفض الطلب</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}