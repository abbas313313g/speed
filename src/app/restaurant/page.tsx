
"use client";

import { useContext, useMemo, useState, useEffect, useRef } from 'react';
import { RestaurantContext } from '@/contexts/RestaurantContext';
import { useOrders } from '@/hooks/useOrders';
import { Button } from '@/components/ui/button';
import { LogOut, Loader2, PackageSearch, History, Clock, Volume2, VolumeX, PackageCheck, Truck, AlertCircle, PlayCircle, Info } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import Image from 'next/image';
import type { Order, OrderStatus } from '@/lib/types';

export default function RestaurantDashboardPage({ onNavigate }: { onNavigate: (tab: number) => void }) {
    const context = useContext(RestaurantContext);
    const { allOrders, updateOrderStatus, isLoading: oLoading } = useOrders();
    const { toast } = useToast();

    const [isMuted, setIsMuted] = useState(false);
    const [audioUnlocked, setAudioUnlocked] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [incomingOrder, setIncomingOrder] = useState<Order | null>(null);
    
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const prevNewOrdersCount = useRef(0);

    const myOrders = useMemo(() => {
        if (!context?.restaurant || !allOrders) return [];
        return allOrders.filter(o => o.restaurant?.id === context.restaurant?.id);
    }, [context?.restaurant, allOrders]);

    const newOrders = myOrders.filter(o => o.status === 'unassigned' || o.status === 'pending_assignment');
    const preparingOrders = myOrders.filter(o => o.status === 'preparing');
    const readyOrders = myOrders.filter(o => o.status === 'ready_for_pickup');

    // تهيئة الصوت كملف مدمج لضمان العمل
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.preload = 'auto';
            audio.loop = true;
            audioRef.current = audio;
        }
    }, []);

    // تفعيل قناة الصوت - ضروري جداً لمتصفحات الجوال
    const unlockAudio = () => {
        if (audioRef.current) {
            audioRef.current.play().then(() => {
                audioRef.current?.pause();
                audioRef.current!.currentTime = 0;
                setAudioUnlocked(true);
                toast({ title: "تم تفعيل نظام التنبيه الصوتي بنجاح ✅" });
            }).catch(e => {
                console.error("Audio unlock failed:", e);
                toast({ title: "فشل تفعيل الصوت، يرجى المحاولة مرة أخرى", variant: "destructive" });
            });
        }
    };

    // مراقبة الطلبات الجديدة
    useEffect(() => {
        if (newOrders.length > prevNewOrdersCount.current) {
            const latestOrder = newOrders[0];
            setIncomingOrder(latestOrder);
            
            if (audioUnlocked && !isMuted && audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play().catch(e => console.log("Sound play error:", e));
            }
        }

        if (newOrders.length === 0) {
            setIncomingOrder(null);
            if (audioRef.current) audioRef.current.pause();
        }
        
        prevNewOrdersCount.current = newOrders.length;
    }, [newOrders, audioUnlocked, isMuted]);

    const handleUpdateStatus = async (orderId: string, status: OrderStatus) => {
        await updateOrderStatus(orderId, status);
        if (status === 'preparing') {
            toast({ title: "تم قبول الطلب، ابدأ التحضير!" });
            setIncomingOrder(null);
            if (audioRef.current) audioRef.current.pause();
        }
        setSelectedOrder(null);
    };

    const handleReject = async (orderId: string) => {
        await updateOrderStatus(orderId, 'cancelled');
        toast({ title: "تم رفض وإلغاء الطلب", variant: "destructive" });
        setIncomingOrder(null);
        if (audioRef.current) audioRef.current.pause();
    };

    if (!context?.restaurant || oLoading) return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
            <Loader2 className="animate-spin h-12 w-12 text-primary" />
            <p className="mt-4 font-bold text-muted-foreground">جارِ مزامنة طلبات المتجر...</p>
        </div>
    );

    const OrderItemsList = ({ order }: { order: Order }) => (
        <div className="space-y-4 py-2">
            {order.items.map((item, idx) => {
                const itemPrice = item.selectedSize?.price || item.product.discountPrice || item.product.price;
                const img = item.product.image || 'https://placehold.co/100x100.png';
                return (
                    <div key={idx} className="flex items-center gap-4 bg-white p-3 rounded-2xl border shadow-sm">
                        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border">
                            <Image src={img} alt={item.product.name} fill className="object-cover" unoptimized={true}/>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="font-black text-sm truncate">{item.product.name}</h4>
                            {item.selectedSize && <Badge variant="secondary" className="text-[9px] font-black mt-0.5">{item.selectedSize.name}</Badge>}
                            <div className="flex justify-between items-center mt-1">
                                <span className="font-bold text-xs">الكمية: {item.quantity}</span>
                                <span className="font-black text-primary text-xs">{formatCurrency(itemPrice * item.quantity)}</span>
                            </div>
                        </div>
                    </div>
                )
            })}
            <Separator className="my-2" />
            <div className="flex justify-between items-center bg-primary/5 p-4 rounded-2xl border border-primary/10">
                <span className="font-black text-sm">صافي دخل المتجر:</span>
                <span className="text-2xl font-black text-primary tracking-tighter">{formatCurrency(order.total - order.deliveryFee)}</span>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col min-h-full bg-muted/5 pb-60">
            <header className="p-4 bg-white border-b shadow-sm flex justify-between items-center sticky top-0 z-50">
                <div className="text-right">
                    <h1 className="text-xl font-black text-primary leading-none">{context.restaurant.name}</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        <p className="text-[10px] font-bold text-muted-foreground">متصل - استقبال فوري</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button 
                        variant="outline" 
                        size="icon" 
                        className={cn("rounded-xl h-10 w-10 transition-all", !isMuted && incomingOrder && "animate-bounce bg-red-50 text-red-600 border-red-200")}
                        onClick={() => {
                            setIsMuted(!isMuted);
                            if (audioRef.current) audioRef.current.pause();
                        }}
                    >
                        {isMuted ? <VolumeX className="h-5 w-5"/> : <Volume2 className="h-5 w-5"/>}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={context.logout} className="text-destructive rounded-xl hover:bg-destructive/5"><LogOut className="h-5 w-5"/></Button>
                </div>
            </header>

            {!audioUnlocked && (
                <div className="p-4 bg-primary text-white text-center font-bold text-sm flex items-center justify-center gap-3 animate-in slide-in-from-top duration-500 cursor-pointer shadow-lg z-40" onClick={unlockAudio}>
                    <PlayCircle className="h-5 w-5 animate-pulse" />
                    <span>اضغط هنا لتفعيل جرس التنبيه (ضروري جداً)</span>
                </div>
            )}

            <nav className="p-4 grid grid-cols-2 gap-3 sticky top-[73px] bg-background/50 z-40 backdrop-blur-md">
                <Button onClick={() => onNavigate(2)} variant="outline" className="rounded-2xl h-14 bg-white text-primary border-2 border-primary/10 shadow-sm flex flex-col gap-0 active:scale-95 transition-all">
                    <PackageSearch className="h-5 w-5"/>
                    <span className="text-[10px] font-black">إدارة المنيو</span>
                </Button>
                <Button onClick={() => onNavigate(3)} variant="outline" className="rounded-2xl h-14 bg-white text-muted-foreground border-2 border-muted shadow-sm flex flex-col gap-0 active:scale-95 transition-all">
                    <History className="h-5 w-5"/>
                    <span className="text-[10px] font-black">السجل والحسابات</span>
                </Button>
            </nav>

            <main className="p-4 space-y-8">
                <section className="space-y-4">
                    <h2 className="text-lg font-black flex items-center gap-2 px-1">
                        <Clock className="h-5 w-5 text-orange-500"/>
                        طلبات قيد التحضير ({preparingOrders.length})
                    </h2>
                    {preparingOrders.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-[2.5rem] border-2 border-dashed border-muted opacity-60">
                            <Info className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                            <p className="text-muted-foreground text-xs font-bold">لا توجد طلبات للتحضير حالياً.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {preparingOrders.map(order => (
                                <Card key={order.id} className="rounded-2xl border-none shadow-sm flex items-center justify-between p-4 bg-white">
                                    <div onClick={() => setSelectedOrder(order)} className="cursor-pointer">
                                        <p className="font-black text-sm">#{order.id.substring(0, 6)}</p>
                                        <p className="text-[10px] text-muted-foreground font-bold">{order.items.length} قطع - {formatCurrency(order.total - order.deliveryFee)}</p>
                                    </div>
                                    <Button size="sm" className="rounded-xl h-10 font-black px-6 shadow-md" onClick={() => handleUpdateStatus(order.id, 'ready_for_pickup')}>تجهيز</Button>
                                </Card>
                            ))}
                        </div>
                    )}
                </section>

                <section className="space-y-4">
                    <h2 className="text-sm font-black flex items-center gap-2 px-1 text-green-600">
                        <PackageCheck className="h-5 w-5"/> بانتظار استلام المندوب ({readyOrders.length})
                    </h2>
                    <div className="space-y-3">
                        {readyOrders.map(order => (
                            <div key={order.id} className="bg-white p-4 rounded-2xl shadow-sm border-r-4 border-r-green-500 flex items-center justify-between animate-pulse">
                                <div>
                                    <p className="font-black text-sm">#{order.id.substring(0, 6)}</p>
                                    <p className="text-[10px] text-green-600 font-bold">المندوب في طريقه إليكم...</p>
                                </div>
                                <Truck className="h-5 w-5 text-green-600"/>
                            </div>
                        ))}
                    </div>
                </section>
            </main>

            {/* نافذة التنبيه الفوري - نصف شاشة احترافي */}
            <Dialog open={!!incomingOrder} onOpenChange={() => {}}>
                <DialogContent className="max-w-[100vw] sm:max-w-md rounded-t-[3rem] p-0 overflow-hidden border-none shadow-2xl animate-in slide-in-from-bottom duration-500 bottom-0 top-auto translate-y-0 translate-x-[-50%] fixed left-[50%]">
                    <DialogHeader className="p-6 bg-red-600 text-white flex flex-col items-center gap-2">
                        <div className="p-3 bg-white/20 rounded-full animate-bounce">
                            <AlertCircle className="h-8 w-8 text-white" />
                        </div>
                        <DialogTitle className="text-2xl font-black text-center">طلب جديد وصل! 🍔</DialogTitle>
                        <p className="text-white/80 text-xs font-bold text-center">لن يتوقف جرس التنبيه حتى يتم القبول</p>
                    </DialogHeader>
                    
                    <div className="p-6 bg-background max-h-[50vh] overflow-y-auto scrollbar-hide">
                        {incomingOrder && <OrderItemsList order={incomingOrder} />}
                    </div>

                    <DialogFooter className="p-6 bg-white border-t flex flex-col gap-3">
                        <Button 
                            className="w-full h-16 rounded-[1.8rem] text-xl font-black shadow-xl shadow-primary/20 bg-green-600 hover:bg-green-700" 
                            onClick={() => incomingOrder && handleUpdateStatus(incomingOrder.id, 'preparing')}
                        >
                            قبول وبدء التحضير
                        </Button>
                        <Button 
                            variant="ghost" 
                            className="w-full h-12 text-destructive font-bold rounded-xl" 
                            onClick={() => incomingOrder && handleReject(incomingOrder.id)}
                        >
                            رفض الطلب
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!selectedOrder} onOpenChange={(v) => !v && setSelectedOrder(null)}>
                <DialogContent className="max-w-[90vw] sm:max-w-md rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
                    <DialogHeader className="p-6 bg-primary text-white">
                        <DialogTitle className="text-2xl font-black text-right">تفاصيل طلب #{selectedOrder?.id.substring(0, 6)}</DialogTitle>
                    </DialogHeader>
                    <div className="p-6 max-h-[60vh] overflow-y-auto">
                        {selectedOrder && <OrderItemsList order={selectedOrder} />}
                    </div>
                    <DialogFooter className="p-6 bg-muted/5 border-t">
                        <Button variant="outline" className="w-full rounded-xl font-bold h-12" onClick={() => setSelectedOrder(null)}>إغلاق</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
