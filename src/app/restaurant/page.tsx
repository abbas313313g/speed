
"use client";

import { useContext, useMemo, useState, useEffect, useRef } from 'react';
import { RestaurantContext } from '@/contexts/RestaurantContext';
import { useOrders } from '@/hooks/useOrders';
import { Button } from '@/components/ui/button';
import { LogOut, Loader2, PackageSearch, History, Clock, Volume2, VolumeX, PackageCheck, Truck, AlertCircle, PlayCircle, Info } from 'lucide-react';
import { Card } from '@/components/ui/card';
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
    const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);
    
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const myOrders = useMemo(() => {
        if (!context?.restaurant || !allOrders) return [];
        return allOrders.filter(o => o.restaurant?.id === context.restaurant?.id);
    }, [context?.restaurant, allOrders]);

    // تحسين المنطق: الطلبات الجديدة تظل موجودة حتى لو تم تعيين سائق
    const newOrders = myOrders.filter(o => ['unassigned', 'pending_assignment', 'confirmed'].includes(o.status));
    const preparingOrders = myOrders.filter(o => o.status === 'preparing');
    const readyOrders = myOrders.filter(o => o.status === 'ready_for_pickup');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.loop = true;
            audioRef.current = audio;
        }
    }, []);

    useEffect(() => {
        if (newOrders.length > 0 && audioUnlocked && !isMuted && audioRef.current) {
            audioRef.current.play().catch(() => {});
        } else if (audioRef.current) {
            audioRef.current.pause();
        }
    }, [newOrders.length, audioUnlocked, isMuted]);

    const handleUpdateStatus = async (orderId: string, status: OrderStatus) => {
        setProcessingOrderId(orderId);
        const success = await updateOrderStatus(orderId, status);
        if (success) {
            toast({ title: "تم تحديث حالة الطلب بنجاح ✅" });
            setSelectedOrder(null);
        } else {
            toast({ title: "فشل التحديث، حاول مرة أخرى", variant: "destructive" });
        }
        setProcessingOrderId(null);
    };

    if (!context?.restaurant || oLoading) return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
            <Loader2 className="animate-spin h-10 w-10 text-primary" />
            <p className="mt-4 font-bold text-muted-foreground">جاري جلب الطلبات...</p>
        </div>
    );

    const OrderItemsList = ({ order }: { order: Order }) => (
        <div className="space-y-4 py-2">
            {order.items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-4 bg-white p-3 rounded-2xl border shadow-sm">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border">
                        <Image src={item.product.image || 'https://placehold.co/100x100.png'} alt="" fill className="object-cover" unoptimized={true}/>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="font-black text-sm truncate">{item.product.name}</h4>
                        <div className="flex justify-between items-center mt-1">
                            <span className="font-bold text-xs text-primary">الكمية: {item.quantity}</span>
                        </div>
                    </div>
                </div>
            ))}
            <Separator className="my-2" />
            <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 flex justify-between items-center">
                <span className="font-black text-xs">صافي دخل المتجر:</span>
                <span className="text-xl font-black text-primary">{formatCurrency(order.total - order.deliveryFee)}</span>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col min-h-full bg-muted/5 pb-40">
            <header className="p-4 bg-white border-b shadow-sm flex justify-between items-center sticky top-0 z-50">
                <div className="text-right">
                    <h1 className="text-xl font-black text-primary">{context.restaurant.name}</h1>
                    <p className="text-[10px] font-bold text-muted-foreground">اللوحة تعمل أونلاين</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="icon" className="rounded-xl" onClick={() => setIsMuted(!isMuted)}>
                        {isMuted ? <VolumeX className="h-5 w-5"/> : <Volume2 className="h-5 w-5"/>}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={context.logout} className="text-destructive rounded-xl"><LogOut className="h-5 w-5"/></Button>
                </div>
            </header>

            {!audioUnlocked && (
                <div className="p-3 bg-primary text-white text-center font-bold text-xs flex items-center justify-center gap-2 cursor-pointer" onClick={() => { audioRef.current?.play().then(() => { audioRef.current?.pause(); setAudioUnlocked(true); }) }}>
                    <PlayCircle className="h-4 w-4 animate-pulse" /> اضغط هنا لتفعيل جرس التنبيه
                </div>
            )}

            <div className="p-4 grid grid-cols-2 gap-3">
                <Button onClick={() => onNavigate(2)} variant="outline" className="rounded-2xl h-14 bg-white shadow-sm flex flex-col gap-1">
                    <PackageSearch className="h-5 w-5 text-primary"/>
                    <span className="text-[10px] font-black">إدارة المنيو</span>
                </Button>
                <Button onClick={() => onNavigate(3)} variant="outline" className="rounded-2xl h-14 bg-white shadow-sm flex flex-col gap-1">
                    <History className="h-5 w-5 text-muted-foreground"/>
                    <span className="text-[10px] font-black">الحسابات</span>
                </Button>
            </div>

            <main className="p-4 space-y-8">
                <section className="space-y-4">
                    <h2 className="text-lg font-black flex items-center gap-2 px-1 text-red-600">
                        <AlertCircle className="h-5 w-5 animate-pulse"/> طلبات جديدة ({newOrders.length})
                    </h2>
                    {newOrders.map(order => (
                        <Card key={order.id} className="rounded-2xl p-4 border-none shadow-sm flex items-center justify-between bg-white">
                            <div className="flex-1 cursor-pointer" onClick={() => setSelectedOrder(order)}>
                                <p className="font-black text-sm">#{order.id.substring(0, 6)}</p>
                                <p className="text-[10px] text-muted-foreground font-bold">{order.items.length} وجبات - {formatCurrency(order.total - order.deliveryFee)}</p>
                            </div>
                            <Button className="rounded-xl h-10 font-black px-6 shadow-md bg-green-600 hover:bg-green-700" disabled={processingOrderId === order.id} onClick={() => handleUpdateStatus(order.id, 'preparing')}>
                                {processingOrderId === order.id ? <Loader2 className="animate-spin h-4 w-4"/> : "قبول"}
                            </Button>
                        </Card>
                    ))}
                </section>

                <section className="space-y-4">
                    <h2 className="text-lg font-black flex items-center gap-2 px-1 text-orange-500">
                        <Clock className="h-5 w-5"/> قيد التحضير ({preparingOrders.length})
                    </h2>
                    {preparingOrders.map(order => (
                        <Card key={order.id} className="rounded-2xl p-4 border-none shadow-sm flex items-center justify-between bg-white border-r-4 border-r-orange-500">
                            <div className="flex-1 cursor-pointer" onClick={() => setSelectedOrder(order)}>
                                <p className="font-black text-sm">#{order.id.substring(0, 6)}</p>
                                {!order.deliveryWorkerId && <Badge variant="outline" className="text-[8px] animate-pulse text-orange-600">جارِ البحث عن سائق...</Badge>}
                            </div>
                            <Button className="rounded-xl h-10 font-black px-6 shadow-md" disabled={processingOrderId === order.id} onClick={() => handleUpdateStatus(order.id, 'ready_for_pickup')}>
                                {processingOrderId === order.id ? <Loader2 className="animate-spin h-4 w-4"/> : "تجهيز"}
                            </Button>
                        </Card>
                    ))}
                </section>

                {readyOrders.length > 0 && (
                    <section className="space-y-4">
                        <h2 className="text-sm font-black flex items-center gap-2 px-1 text-green-600">
                            <PackageCheck className="h-5 w-5"/> جاهز للاستلام ({readyOrders.length})
                        </h2>
                        {readyOrders.map(order => (
                            <div key={order.id} onClick={() => setSelectedOrder(order)} className="bg-white p-4 rounded-2xl shadow-sm border-r-4 border-r-green-500 flex items-center justify-between cursor-pointer">
                                <p className="font-black text-sm">#{order.id.substring(0, 6)}</p>
                                <Truck className="h-5 w-5 text-green-600 animate-bounce"/>
                            </div>
                        ))}
                    </section>
                )}
            </main>

            <Dialog open={!!selectedOrder} onOpenChange={(v) => !v && setSelectedOrder(null)}>
                <DialogContent className="max-w-[90vw] sm:max-w-md rounded-[2.5rem] p-0 border-none shadow-2xl">
                    <DialogHeader className="p-6 bg-primary text-white"><DialogTitle className="text-2xl font-black text-right">تفاصيل الطلب</DialogTitle></DialogHeader>
                    <div className="p-6 max-h-[50vh] overflow-y-auto">{selectedOrder && <OrderItemsList order={selectedOrder} />}</div>
                    <DialogFooter className="p-4 bg-muted/5 border-t"><Button variant="outline" className="w-full rounded-xl font-bold h-12" onClick={() => setSelectedOrder(null)}>إغلاق</Button></DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
