
"use client";

import { useContext, useMemo, useState, useEffect, useRef } from 'react';
import { RestaurantContext } from '@/contexts/RestaurantContext';
import { useOrders } from '@/hooks/useOrders';
import { Button } from '@/components/ui/button';
import { LogOut, Loader2, BellRing, Volume2, VolumeX, PackageOpen, Clock, CheckCircle2, Bike, ReceiptText } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import type { Order } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

interface RestaurantDashboardPageProps {
    onNavigate: (tab: number) => void;
}

export default function RestaurantDashboardPage({ onNavigate }: RestaurantDashboardPageProps) {
    const context = useContext(RestaurantContext);
    const { allOrders, isLoading: ordersLoading } = useOrders();
    
    const [newOrderAlert, setNewOrderAlert] = useState<Order | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [handledOrderIds, setHandledOrderIds] = useState<Set<string>>(new Set());
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // تصفية الطلبات حسب المطعم والحالة مع تجاهل الطلبات التي تم التعامل معها محلياً لمنع التكرار
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
        return allOrders.filter(order => order.restaurant?.id === context.restaurant?.id && ['preparing', 'confirmed'].includes(order.status));
    }, [context?.restaurant, allOrders]);
    
     const myReadyOrders = useMemo(() => {
        if (!context?.restaurant || !allOrders) return [];
        return allOrders.filter(order => order.restaurant?.id === context.restaurant?.id && order.status === 'ready_for_pickup');
    }, [context?.restaurant, allOrders]);

    // منطق التنبيه عند وصول طلب جديد
    useEffect(() => {
        if (myNewOrders.length > 0 && !newOrderAlert) {
            const latestOrder = myNewOrders[0];
            setNewOrderAlert(latestOrder);
            if (!isMuted && audioRef.current) {
                audioRef.current.play().catch(e => console.log("Autoplay blocked, waiting for interaction"));
            }
        } else if (myNewOrders.length === 0 && newOrderAlert) {
            stopAlert();
        }
    }, [myNewOrders, newOrderAlert, isMuted]);

    const stopAlert = () => {
        setNewOrderAlert(null);
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
    };

    const handleAcceptOrder = async (orderId: string) => {
        setHandledOrderIds(prev => new Set(prev).add(orderId));
        stopAlert();
        if (context) {
            await context.updateRestaurantOrderStatus(orderId, 'preparing');
        }
    };

    const handleRejectOrder = async (orderId: string) => {
        setHandledOrderIds(prev => new Set(prev).add(orderId));
        stopAlert();
        if (context) {
            await context.updateRestaurantOrderStatus(orderId, 'cancelled');
        }
    };

    if (!context || !context.restaurant) {
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    const { restaurant, logout, updateRestaurantOrderStatus, isProcessing } = context;

    return (
        <div className="flex flex-col h-screen bg-muted/10">
            <audio ref={audioRef} loop src="https://assets.mixkit.co/active_storage/sfx/2861/2861-preview.mp3" />

            <header className="p-4 md:p-6 bg-white border-b shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-2xl">
                        <BellRing className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-primary">لوحة تحكم {restaurant.name}</h1>
                        <p className="text-muted-foreground text-sm font-bold">بوابة إدارة الطلبات اللحظية</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                     <Button variant="outline" size="icon" onClick={() => setIsMuted(!isMuted)}>
                        {isMuted ? <VolumeX className="h-5 w-5 text-destructive"/> : <Volume2 className="h-5 w-5 text-primary"/>}
                     </Button>
                     <Button variant="outline" className="font-bold border-2 rounded-xl" onClick={() => onNavigate(2)}>سجل الطلبات</Button>
                     <Button variant="ghost" size="icon" onClick={logout} className="text-destructive"><LogOut className="h-5 w-5"/></Button>
                </div>
            </header>

            <main className="flex-1 overflow-hidden p-4 md:p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
                    
                    {/* عمود: طلبات جديدة */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between px-2">
                             <h2 className="text-lg font-black flex items-center gap-2"><PackageOpen className="text-blue-500"/> طلبات جديدة ({myNewOrders.length})</h2>
                        </div>
                        <ScrollArea className="flex-1 rounded-[2rem] border-2 border-blue-100 p-4 bg-blue-50/30">
                            {myNewOrders.length > 0 ? myNewOrders.map(order => (
                                <Card key={order.id} className="mb-4 rounded-2xl shadow-sm border-none overflow-hidden hover:shadow-md transition-shadow">
                                    <div className="bg-blue-500 p-2 text-white text-[10px] font-bold text-center">طلب جديد # {order.id.substring(0,6)}</div>
                                    <CardHeader className="p-4 pb-2">
                                        <CardTitle className="text-base font-black flex justify-between items-center">
                                            <span>تفاصيل الطلب</span>
                                            <span className="text-xs text-muted-foreground font-bold">{new Date(order.date).toLocaleTimeString('ar-IQ', {hour: '2-digit', minute:'2-digit'})}</span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-4 pt-0">
                                        <ul className="space-y-1">
                                            {order.items.map(item => (
                                                <li key={item.product.id + (item.selectedSize?.name || '')} className="flex justify-between text-sm">
                                                    <span className="font-bold">{item.quantity}x {item.product.name}</span>
                                                    {item.selectedSize && <span className="text-xs text-muted-foreground">({item.selectedSize.name})</span>}
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>
                                    <CardFooter className="p-4 grid grid-cols-2 gap-2 bg-muted/20">
                                         <Button variant="ghost" className="text-destructive font-bold" onClick={() => handleRejectOrder(order.id)} disabled={isProcessing}>رفض</Button>
                                         <Button className="bg-green-600 hover:bg-green-700 font-black rounded-xl" onClick={() => handleAcceptOrder(order.id)} disabled={isProcessing}>قبول وتحضير</Button>
                                    </CardFooter>
                                </Card>
                            )) : (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground/40 py-20">
                                    <PackageOpen className="h-16 w-16 mb-2"/>
                                    <p className="font-bold text-sm">لا توجد طلبات جديدة</p>
                                </div>
                            )}
                        </ScrollArea>
                    </div>

                    {/* عمود: قيد التحضير */}
                    <div className="flex flex-col gap-4">
                        <div className="px-2"><h2 className="text-lg font-black flex items-center gap-2"><Clock className="text-orange-500"/> قيد التحضير ({myPreparingOrders.length})</h2></div>
                        <ScrollArea className="flex-1 rounded-[2rem] border-2 border-orange-100 p-4 bg-orange-50/30">
                             {myPreparingOrders.length > 0 ? myPreparingOrders.map(order => (
                                <Card key={order.id} className="mb-4 rounded-2xl shadow-sm border-none hover:shadow-md transition-shadow">
                                    <CardHeader className="p-4">
                                        <div className="flex justify-between items-start">
                                            <CardTitle className="text-base font-black">طلب #{order.id.substring(0,6)}</CardTitle>
                                            <Badge variant="outline" className="bg-white text-orange-600 border-orange-200">يتم التحضير</Badge>
                                        </div>
                                    </CardHeader>
                                     <CardContent className="p-4 pt-0">
                                        {order.status === 'confirmed' && order.deliveryWorker ? (
                                            <div className="flex items-center gap-2 p-2 bg-green-50 rounded-xl text-green-700 border border-green-100 mb-3">
                                                <Bike className="h-4 w-4" />
                                                <span className="text-xs font-black">السائق {order.deliveryWorker.name} في الطريق إليكم</span>
                                            </div>
                                        ) : (
                                            <div className="text-[10px] text-muted-foreground font-bold mb-3 italic">بانتظار قبول سائق للطلب...</div>
                                        )}
                                         <ul className="space-y-1 opacity-80">
                                            {order.items.map(item => (
                                                <li key={item.product.id + (item.selectedSize?.name || '')} className="text-xs font-bold flex justify-between">
                                                    <span>{item.quantity}x {item.product.name}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>
                                    <CardFooter className="p-4">
                                        <Button className="w-full bg-orange-500 hover:bg-orange-600 font-black rounded-xl py-6" onClick={() => updateRestaurantOrderStatus(order.id, 'ready_for_pickup')} disabled={isProcessing}>
                                            جاهز للتسليم ✓
                                        </Button>
                                    </CardFooter>
                                </Card>
                             )) : (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground/40 py-20">
                                    <Clock className="h-16 w-16 mb-2"/>
                                    <p className="font-bold text-sm">لا توجد طلبات قيد التحضير</p>
                                </div>
                             )}
                        </ScrollArea>
                    </div>

                    {/* عمود: جاهز للاستلام */}
                    <div className="flex flex-col gap-4">
                        <div className="px-2"><h2 className="text-lg font-black flex items-center gap-2"><CheckCircle2 className="text-green-500"/> جاهز للاستلام ({myReadyOrders.length})</h2></div>
                        <ScrollArea className="flex-1 rounded-[2rem] border-2 border-green-100 p-4 bg-green-50/30">
                             {myReadyOrders.length > 0 ? myReadyOrders.map(order => (
                                <Card key={order.id} className="mb-4 rounded-2xl shadow-sm border-none bg-green-500 text-white">
                                    <CardHeader className="p-4">
                                        <CardTitle className="text-base font-black">طلب جاهز #{order.id.substring(0,6)}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-4 pt-0">
                                        <div className="bg-white/20 rounded-xl p-3 mb-2">
                                            <p className="text-xs font-bold">بانتظار السائق للاستلام</p>
                                            {order.deliveryWorker && (
                                                <div className="mt-2 flex items-center gap-2">
                                                    <Bike className="h-4 w-4" />
                                                    <span className="font-black text-sm">{order.deliveryWorker.name}</span>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                             )) : (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground/40 py-20">
                                    <CheckCircle2 className="h-16 w-16 mb-2"/>
                                    <p className="font-bold text-sm">لا توجد طلبات جاهزة</p>
                                </div>
                             )}
                        </ScrollArea>
                    </div>
                </div>
            </main>

            {/* نافذة التنبيه بالطلب الجديد - تفاصيل كاملة */}
            <Dialog open={!!newOrderAlert} onOpenChange={() => {}}>
                <DialogContent className="sm:max-w-md bg-white rounded-t-[3rem] border-none shadow-2xl p-0 overflow-hidden">
                    <DialogHeader className="p-0">
                        <div className="bg-primary p-6 text-white text-center space-y-2">
                            <BellRing className="h-12 w-12 mx-auto animate-bounce"/>
                            <DialogTitle className="text-3xl font-black italic">طلب جديد وصل!</DialogTitle>
                            <DialogDescription className="text-white/90 font-bold">يرجى تأكيد الطلب للبدء بالتحضير</DialogDescription>
                        </div>
                    </DialogHeader>
                    
                    <div className="p-6 space-y-4">
                        <div className="flex justify-between items-center text-xl font-black text-primary border-b-2 border-dashed pb-4">
                            <span className="flex items-center gap-2"><ReceiptText className="h-5 w-5"/> رقم الطلب:</span>
                            <span dir="ltr">#{newOrderAlert?.id.substring(0, 6)}</span>
                        </div>
                        
                        <div className="space-y-1">
                            <p className="text-sm font-black text-muted-foreground pr-2">المنتجات المطلوبة:</p>
                            <ScrollArea className="max-h-[35vh] rounded-2xl border-2 border-muted bg-muted/20 p-2">
                                <ul className="space-y-3">
                                    {newOrderAlert?.items.map((item, idx) => {
                                        const unitPrice = item.selectedSize?.price ?? item.product.discountPrice ?? item.product.price;
                                        const subtotal = unitPrice * item.quantity;
                                        return (
                                            <li key={idx} className="flex justify-between items-center p-3 bg-white rounded-xl shadow-sm">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-base">{item.quantity}x {item.product.name}</span>
                                                    {item.selectedSize && <Badge variant="secondary" className="w-fit text-[9px] mt-1">{item.selectedSize.name}</Badge>}
                                                </div>
                                                <div className="text-left">
                                                    <p className="font-black text-primary text-sm">{formatCurrency(subtotal)}</p>
                                                    <p className="text-[9px] text-muted-foreground">({formatCurrency(unitPrice)} للواحد)</p>
                                                </div>
                                            </li>
                                        )
                                    })}
                                </ul>
                            </ScrollArea>
                        </div>

                        <div className="pt-2 flex justify-between items-center px-2">
                            <span className="text-lg font-black">المجموع الصافي للمطعم:</span>
                            <span className="text-2xl font-black text-primary">{formatCurrency(
                                newOrderAlert?.items.reduce((acc, item) => {
                                    const price = item.selectedSize?.price ?? item.product.discountPrice ?? item.product.price;
                                    return acc + (price * item.quantity);
                                }, 0) || 0
                            )}</span>
                        </div>
                    </div>

                    <DialogFooter className="p-6 pt-0 flex-col gap-3">
                        <Button 
                            className="w-full py-8 text-2xl font-black bg-primary rounded-[1.5rem] shadow-xl shadow-primary/20 active:scale-95 transition-all"
                            onClick={() => handleAcceptOrder(newOrderAlert!.id)}
                            disabled={isProcessing}
                        >
                            {isProcessing ? <Loader2 className="animate-spin h-6 w-6 ml-2"/> : "استلام وتحضير الطلب"}
                        </Button>
                        <Button 
                            variant="ghost" 
                            className="w-full text-destructive font-bold h-12"
                            onClick={() => handleRejectOrder(newOrderAlert!.id)}
                            disabled={isProcessing}
                        >
                            رفض واستبعاد
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
