
"use client";

import { useContext, useMemo, useState, useEffect, useRef } from 'react';
import { RestaurantContext } from '@/contexts/RestaurantContext';
import { useOrders } from '@/hooks/useOrders';
import { Button } from '@/components/ui/button';
import { LogOut, Loader2, PackageSearch, History, CheckCircle2, Clock, Volume2, VolumeX, BellRing, PackageCheck, Truck, XCircle, Info, Eye, PlayCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
    const [notifEnabled, setNotifEnabled] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const prevOrdersCount = useRef(0);

    const myOrders = useMemo(() => {
        if (!context?.restaurant || !allOrders) return [];
        return allOrders.filter(o => o.restaurant?.id === context.restaurant?.id);
    }, [context?.restaurant, allOrders]);

    const newOrders = myOrders.filter(o => o.status === 'unassigned' || o.status === 'pending_assignment');
    const preparingOrders = myOrders.filter(o => o.status === 'preparing');
    const readyOrders = myOrders.filter(o => o.status === 'ready_for_pickup');
    const onTheWayOrders = myOrders.filter(o => o.status === 'on_the_way');
    const deliveredOrders = myOrders.filter(o => o.status === 'delivered').slice(0, 10);
    const cancelledOrders = myOrders.filter(o => o.status === 'cancelled').slice(0, 10);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.load();
            audioRef.current = audio;
        }
    }, []);

    // تفعيل الصوت برمجياً عند الضغط لفتح صلاحية Play للمتصفح
    const unlockAudio = () => {
        if (audioRef.current) {
            audioRef.current.play().then(() => {
                audioRef.current?.pause();
                audioRef.current!.currentTime = 0;
                setAudioUnlocked(true);
                toast({ title: "تم تفعيل نظام التنبيه المباشر" });
            }).catch(e => console.log("Audio unlock failed:", e));
        }
    };

    useEffect(() => {
        if (audioUnlocked && newOrders.length > prevOrdersCount.current && !isMuted) {
            if (audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.loop = true;
                audioRef.current.play().catch(() => console.log("Sound blocked by browser"));
            }
        }
        if (newOrders.length === 0 || isMuted) {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.loop = false;
            }
        }
        prevOrdersCount.current = newOrders.length;
    }, [newOrders.length, isMuted, audioUnlocked]);

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

    const handleUpdateStatus = async (orderId: string, status: OrderStatus) => {
        await updateOrderStatus(orderId, status);
        toast({ title: `تم تحديث الحالة` });
        setSelectedOrder(null);
    };

    if (!context?.restaurant || oLoading) return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;

    const OrderItemsList = ({ order }: { order: Order }) => (
        <div className="space-y-4 py-2">
            {order.items.map((item, idx) => {
                const itemPrice = item.selectedSize?.price || item.product.discountPrice || item.product.price;
                const img = item.product.image || 'https://placehold.co/100x100.png';
                return (
                    <div key={idx} className="flex items-center gap-4 bg-muted/20 p-3 rounded-2xl border">
                        <div className="relative h-16 w-16 shrink-0">
                            <Image src={img} alt={item.product.name} fill className="object-cover rounded-xl" unoptimized={true}/>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="font-black text-sm truncate">{item.product.name}</h4>
                            {item.selectedSize && <p className="text-[10px] font-bold text-muted-foreground">{item.selectedSize.name}</p>}
                            <div className="flex justify-between items-center mt-1">
                                <span className="font-bold text-xs">الكمية: {item.quantity}</span>
                                <span className="font-black text-primary text-xs">{formatCurrency(itemPrice * item.quantity)}</span>
                            </div>
                        </div>
                    </div>
                )
            })}
            <Separator className="my-2" />
            <div className="flex justify-between items-center bg-primary/5 p-4 rounded-2xl">
                <span className="font-black">المجموع الصافي:</span>
                <span className="text-xl font-black text-primary">{formatCurrency(order.total - order.deliveryFee)}</span>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col min-h-full bg-muted/10 pb-60">
            <header className="p-4 bg-white border-b shadow-sm flex justify-between items-center sticky top-0 z-50">
                <div className="text-right">
                    <h1 className="text-xl font-black text-primary leading-none">{context.restaurant.name}</h1>
                    <p className="text-[10px] font-bold text-muted-foreground mt-1">المراقبة المباشرة</p>
                </div>
                <div className="flex gap-2">
                    <Button 
                        variant="outline" 
                        size="icon" 
                        className={cn("rounded-xl h-10 w-10 transition-all", !isMuted && newOrders.length > 0 && "animate-bounce bg-red-50 text-red-600 border-red-200")}
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

            {!audioUnlocked && (
                <div className="p-4 bg-primary text-white text-center font-bold text-sm flex items-center justify-center gap-3 animate-pulse cursor-pointer" onClick={unlockAudio}>
                    <PlayCircle className="h-5 w-5" />
                    اضغط هنا لتفعيل تنبيهات الصوت المباشرة
                </div>
            )}

            <nav className="p-4 grid grid-cols-2 gap-3 sticky top-[73px] bg-muted/5 z-40 backdrop-blur-md">
                <Button onClick={() => onNavigate(2)} className="rounded-2xl h-14 bg-white text-primary border-2 border-primary/20 shadow-sm flex flex-col gap-0 active:scale-95 transition-all">
                    <PackageSearch className="h-5 w-5"/>
                    <span className="text-[10px] font-black">إدارة المنيو</span>
                </Button>
                <Button onClick={() => onNavigate(3)} className="rounded-2xl h-14 bg-white text-muted-foreground border-2 border-muted shadow-sm flex flex-col gap-0 active:scale-95 transition-all">
                    <History className="h-5 w-5"/>
                    <span className="text-[10px] font-black">الحسابات والتقارير</span>
                </Button>
            </nav>

            <main className="p-4 space-y-8">
                {/* 1. الطلبات الجديدة */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <h2 className="text-lg font-black flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full bg-red-500 animate-ping"/>
                            طلبات بانتظار الموافقة ({newOrders.length})
                        </h2>
                    </div>
                    {newOrders.length === 0 ? (
                        <div className="text-center py-10 bg-white/50 rounded-[2.5rem] border-2 border-dashed border-muted">
                            <Info className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                            <p className="text-muted-foreground text-xs font-bold">المتجر جاهز لاستقبال الطلبات الجديدة.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {newOrders.map(order => (
                                <Card key={order.id} className="rounded-[2rem] border-2 border-primary/20 shadow-lg overflow-hidden bg-white animate-in zoom-in duration-300">
                                    <CardHeader className="p-4 pb-2 bg-primary/5 flex flex-row items-center justify-between">
                                        <div>
                                            <CardTitle className="text-sm font-black">طلب #{order.id.substring(0, 6)}</CardTitle>
                                            <CardDescription className="text-[10px] font-bold">منذ {Math.floor((Date.now() - new Date(order.date).getTime()) / 60000)} دقيقة</CardDescription>
                                        </div>
                                        <Badge className="bg-red-500 animate-pulse">جديد</Badge>
                                    </CardHeader>
                                    <CardContent className="p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="font-black text-primary text-lg">{formatCurrency(order.total - order.deliveryFee)}</span>
                                            <span className="text-xs font-bold bg-muted px-2 py-1 rounded-lg">{order.items.length} منتجات</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <Button variant="outline" className="rounded-xl font-bold h-12" onClick={() => setSelectedOrder(order)}>
                                                <Eye className="ml-1 h-4 w-4"/> التفاصيل
                                            </Button>
                                            <Button className="rounded-xl font-black h-12 shadow-lg shadow-primary/20" onClick={() => handleUpdateStatus(order.id, 'preparing')}>
                                                قبول وبدء
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </section>

                {/* 2. التحضير والاستلام */}
                <div className="grid grid-cols-1 gap-6">
                    <section className="space-y-3">
                        <h2 className="text-sm font-black flex items-center gap-2 px-1 text-orange-500">
                            <Clock className="h-4 w-4"/> قيد التحضير ({preparingOrders.length})
                        </h2>
                        {preparingOrders.map(order => (
                            <div key={order.id} className="bg-white p-3 rounded-2xl shadow-sm border flex items-center justify-between">
                                <div onClick={() => setSelectedOrder(order)} className="cursor-pointer">
                                    <p className="font-black text-xs">#{order.id.substring(0, 6)}</p>
                                    <p className="text-[10px] text-muted-foreground font-bold">{order.items.length} قطع - {formatCurrency(order.total - order.deliveryFee)}</p>
                                </div>
                                <Button size="sm" variant="secondary" className="rounded-lg h-9 font-black px-4 bg-orange-50 text-orange-600 border border-orange-100" onClick={() => handleUpdateStatus(order.id, 'ready_for_pickup')}>تجهيز</Button>
                            </div>
                        ))}
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-sm font-black flex items-center gap-2 px-1 text-green-600">
                            <PackageCheck className="h-4 w-4"/> جاهز للاستلام ({readyOrders.length})
                        </h2>
                        {readyOrders.map(order => (
                            <div key={order.id} className="bg-white p-3 rounded-2xl shadow-sm border border-green-100 border-r-4 border-r-green-500 flex items-center justify-between animate-pulse">
                                <div onClick={() => setSelectedOrder(order)} className="cursor-pointer">
                                    <p className="font-black text-xs">#{order.id.substring(0, 6)}</p>
                                    <p className="text-[10px] text-green-600 font-bold">بانتظار المندوب...</p>
                                </div>
                                <div className="p-2 bg-green-50 rounded-lg"><Truck className="h-4 w-4 text-green-600"/></div>
                            </div>
                        ))}
                    </section>
                </div>

                 {/* 3. الإلغاءات الأخيرة */}
                 {cancelledOrders.length > 0 && (
                    <section className="space-y-3 opacity-60">
                        <h2 className="text-sm font-black flex items-center gap-2 px-1 text-destructive">
                            <XCircle className="h-4 w-4"/> طلبات ملغاة مؤخراً
                        </h2>
                        <div className="space-y-2">
                            {cancelledOrders.map(order => (
                                <div key={order.id} className="flex justify-between items-center p-3 bg-red-50 rounded-xl text-[10px] font-bold border border-red-100">
                                    <span>#{order.id.substring(0, 6)}</span>
                                    <span className="text-destructive">ملغي</span>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedOrder(order)}><Eye className="h-3 w-3"/></Button>
                                </div>
                            ))}
                        </div>
                    </section>
                 )}

                 {/* 4. تم التوصيل */}
                 <section className="space-y-3 opacity-50">
                    <h2 className="text-sm font-black flex items-center gap-2 px-1 text-muted-foreground">
                        <Truck className="h-4 w-4"/> آخر التوصيلات الناجحة
                    </h2>
                    <div className="space-y-2">
                        {deliveredOrders.map(order => (
                            <div key={order.id} className="flex justify-between items-center p-3 bg-white rounded-xl text-[10px] font-bold">
                                <span>#{order.id.substring(0, 6)}</span>
                                <span className="text-primary">تم التوصيل</span>
                                <span className="font-black">{formatCurrency(order.total - order.deliveryFee)}</span>
                            </div>
                        ))}
                    </div>
                </section>
            </main>

            {/* نافذة تفاصيل الطلب */}
            <Dialog open={!!selectedOrder} onOpenChange={(v) => !v && setSelectedOrder(null)}>
                <DialogContent className="max-w-[90vw] sm:max-w-md rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
                    <DialogHeader className="p-6 bg-primary text-white">
                        <DialogTitle className="text-2xl font-black text-right">تفاصيل طلب #{selectedOrder?.id.substring(0, 6)}</DialogTitle>
                    </DialogHeader>
                    <div className="p-6 max-h-[60vh] overflow-y-auto scrollbar-hide">
                        {selectedOrder && <OrderItemsList order={selectedOrder} />}
                    </div>
                    <DialogFooter className="p-6 bg-muted/10 border-t flex flex-row gap-3">
                        <Button variant="outline" className="flex-1 rounded-xl font-bold" onClick={() => setSelectedOrder(null)}>إغلاق</Button>
                        {selectedOrder?.status === 'unassigned' && (
                            <Button className="flex-1 rounded-xl font-black" onClick={() => handleUpdateStatus(selectedOrder.id, 'preparing')}>قبول الطلب</Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
