
"use client";

import { useContext, useMemo, useState, useEffect, useRef } from 'react';
import { RestaurantContext } from '@/contexts/RestaurantContext';
import { useOrders } from '@/hooks/useOrders';
import { Button } from '@/components/ui/button';
import { LogOut, Loader2, PackageSearch, History, Clock, Volume2, VolumeX, AlertCircle, PlayCircle, Receipt, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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

    // نظام منع تكرار الطلبات (Deduplication System)
    const myOrders = useMemo(() => {
        if (!context?.restaurant || !allOrders) return [];
        
        const filtered = allOrders.filter(o => o.restaurant?.id === context.restaurant?.id);
        
        const uniqueOrdersMap = new Map();
        filtered.forEach(order => {
            if (!uniqueOrdersMap.has(order.id)) {
                uniqueOrdersMap.set(order.id, order);
            }
        });
        
        return Array.from(uniqueOrdersMap.values());
    }, [context?.restaurant, allOrders]);

    // الطلبات الجديدة هي فقط التي لم يقبلها المتجر بعد
    const newOrders = myOrders.filter(o => o.status === 'unassigned');
    
    // الطلبات قيد التحضير تشمل: انتظار التعيين، انتظار المندوب، والتحضير الفعلي
    const preparingOrders = myOrders.filter(o => ['pending_assignment', 'confirmed', 'preparing'].includes(o.status));
    
    const activeAndHistoryOrders = myOrders.filter(o => ['ready_for_pickup', 'on_the_way', 'delivered', 'cancelled'].includes(o.status));

    useEffect(() => {
        if (selectedOrder) {
            const liveOrder = allOrders.find(o => o.id === selectedOrder.id);
            if (liveOrder && JSON.stringify(liveOrder.items) !== JSON.stringify(selectedOrder.items)) {
                setSelectedOrder(liveOrder);
            }
        }
    }, [allOrders, selectedOrder]);

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
        try {
            await updateOrderStatus(orderId, status);
            toast({ title: status === 'cancelled' ? "تم رفض الطلب ❌" : (status === 'pending_assignment' ? "تم قبول الطلب، جاري البحث عن مندوب..." : "تم تحديث الحالة بنجاح") });
            setSelectedOrder(null);
        } catch (e) {
            toast({ title: "فشل التحديث، حاول لاحقاً", variant: "destructive" });
        } finally {
            setProcessingOrderId(null);
        }
    };

    if (!context?.restaurant || oLoading) return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
            <Loader2 className="animate-spin h-10 w-10 text-primary" />
            <p className="mt-4 font-black text-primary">جارِ فتح لوحة التحكم...</p>
        </div>
    );

    return (
        <div className="flex flex-col min-h-full bg-slate-50 pb-40 text-right">
            <header className="p-4 bg-white border-b shadow-sm flex justify-between items-center sticky top-0 z-50">
                <div className="text-right">
                    <h1 className="text-xl font-black text-primary italic leading-none">{context.restaurant.name}</h1>
                    <div className="flex items-center gap-1 mt-1">
                        <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"/>
                        <span className="text-[9px] font-bold text-muted-foreground">متصل الآن</span>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="icon" className="rounded-xl border-2" onClick={() => setIsMuted(!isMuted)}>
                        {isMuted ? <VolumeX className="h-5 w-5 text-muted-foreground"/> : <Volume2 className="h-5 w-5 text-primary"/>}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={context.logout} className="text-destructive rounded-xl hover:bg-destructive/5"><LogOut className="h-5 w-5"/></Button>
                </div>
            </header>

            {!audioUnlocked && (
                <div className="mx-4 mt-4 p-4 bg-primary rounded-2xl text-white text-center font-black text-sm flex items-center justify-center gap-3 cursor-pointer shadow-lg shadow-primary/20" onClick={() => { audioRef.current?.play().then(() => { audioRef.current?.pause(); setAudioUnlocked(true); }) }}>
                    <PlayCircle className="h-6 w-6 animate-bounce" /> اضغط هنا لتفعيل جرس التنبيه للطلبات الجديدة
                </div>
            )}

            <div className="p-4 grid grid-cols-2 gap-3">
                <Button onClick={() => onNavigate(2)} variant="outline" className="rounded-[1.5rem] h-16 bg-white border-2 border-primary/10 shadow-sm flex flex-col gap-1 active:bg-primary/5 transition-all">
                    <PackageSearch className="h-6 w-6 text-primary"/>
                    <span className="text-[10px] font-black">قائمة الوجبات</span>
                </Button>
                <Button onClick={() => onNavigate(3)} variant="outline" className="rounded-[1.5rem] h-16 bg-white border-2 border-slate-100 shadow-sm flex flex-col gap-1 active:bg-slate-50 transition-all">
                    <History className="h-6 w-6 text-slate-400"/>
                    <span className="text-[10px] font-black">كشف الحساب</span>
                </Button>
            </div>

            <main className="p-4 space-y-8">
                <section className="space-y-4">
                    <div className="flex justify-between items-center px-1">
                        <Badge className="bg-red-500 text-white font-black rounded-lg">{newOrders.length}</Badge>
                        <h2 className="text-lg font-black flex items-center gap-2 text-slate-800">
                             طلبات جديدة <AlertCircle className="h-5 w-5 text-red-500"/>
                        </h2>
                    </div>
                    {newOrders.map(order => (
                        <Card 
                            key={order.id} 
                            onClick={() => setSelectedOrder(order)}
                            className="rounded-[2rem] overflow-hidden border-none shadow-md bg-white border-r-8 border-r-red-500 animate-in slide-in-from-right-4 duration-300 cursor-pointer active:scale-95 transition-all"
                        >
                            <div className="p-5 space-y-2">
                                <div className="flex justify-between items-start">
                                     <span className="text-[10px] font-bold text-muted-foreground">{new Date(order.date).toLocaleTimeString('ar-IQ', {hour:'2-digit', minute:'2-digit'})}</span>
                                     <p className="font-black text-sm">طلب #{order.orderNumber || '...'}</p>
                                </div>
                                <div className="text-xs font-bold text-slate-500">
                                    اضغط لعرض الوجبات واتخاذ قرار
                                </div>
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {order.items?.slice(0, 3).map((item, i) => (
                                        <Badge key={i} variant="secondary" className="text-[8px] font-black">{item.product?.name} x{item.quantity}</Badge>
                                    ))}
                                    {(order.items?.length || 0) > 3 && <Badge variant="outline" className="text-[8px] font-black">+{order.items.length - 3}</Badge>}
                                </div>
                            </div>
                        </Card>
                    ))}
                    {newOrders.length === 0 && <div className="p-10 text-center text-muted-foreground font-bold border-2 border-dashed rounded-[2rem] text-xs">لا توجد طلبات جديدة حالياً.</div>}
                </section>

                <section className="space-y-4">
                    <div className="flex justify-between items-center px-1">
                        <Badge variant="outline" className="text-orange-500 border-orange-200 font-black rounded-lg">{preparingOrders.length}</Badge>
                        <h2 className="text-lg font-black flex items-center gap-2 text-slate-800">
                             قيد التحضير الآن <Clock className="h-5 w-5 text-orange-500"/>
                        </h2>
                    </div>
                    {preparingOrders.map(order => (
                        <Card 
                            key={order.id} 
                            onClick={() => setSelectedOrder(order)}
                            className="rounded-[2rem] p-5 border-none shadow-md bg-white border-r-8 border-r-orange-500 cursor-pointer active:scale-95 transition-all"
                        >
                             <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <p className="font-black text-sm">#{order.orderNumber || '...'}</p>
                                    {order.status === 'pending_assignment' && <Badge variant="secondary" className="text-[8px] font-black bg-blue-50 text-blue-600 animate-pulse">جاري البحث عن مندوب...</Badge>}
                                    {order.status === 'confirmed' && <Badge variant="secondary" className="text-[8px] font-black bg-purple-50 text-purple-600">بانتظار قبول المندوب</Badge>}
                                    {order.status === 'preparing' && <Badge variant="secondary" className="text-[8px] font-black bg-green-50 text-green-600">المندوب استلم المهمة</Badge>}
                                </div>
                                <div className="space-y-1">
                                    {order.items?.map((item, idx) => (
                                        <p key={idx} className="text-xs font-bold opacity-80">{item.product?.name} x{item.quantity}</p>
                                    ))}
                                </div>
                                <Button 
                                    className="w-full rounded-xl h-12 font-black shadow-md bg-primary hover:bg-primary/90" 
                                    disabled={processingOrderId === order.id} 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleUpdateStatus(order.id, 'ready_for_pickup');
                                    }}
                                >
                                    {processingOrderId === order.id ? <Loader2 className="animate-spin h-5 w-5"/> : "تم التجهيز (جاهز للاستلام)"}
                                </Button>
                             </div>
                        </Card>
                    ))}
                </section>

                {activeAndHistoryOrders.length > 0 && (
                    <section className="space-y-4">
                        <h2 className="text-lg font-black flex items-center gap-2 text-slate-800 px-1">الطلبات النشطة والمكتملة</h2>
                        <div className="space-y-3">
                            {activeAndHistoryOrders.slice(0, 15).map(order => (
                                <div 
                                    key={order.id} 
                                    onClick={() => setSelectedOrder(order)}
                                    className="bg-white p-4 rounded-[1.5rem] shadow-sm flex items-center justify-between border cursor-pointer active:scale-95 transition-all hover:shadow-md"
                                >
                                    <div className="text-right">
                                        <p className="font-black text-sm">#{order.orderNumber || '...'}</p>
                                        <p className={cn("text-[9px] font-bold", 
                                            order.status === 'delivered' ? "text-green-600" : 
                                            order.status === 'cancelled' ? "text-destructive" : "text-muted-foreground")}>
                                            {order.status === 'ready_for_pickup' ? 'بانتظار السائق' : 
                                             order.status === 'on_the_way' ? 'في الطريق للزبون' : 
                                             order.status === 'delivered' ? 'تم التوصيل ✅' : 'ملغي ❌'}
                                        </p>
                                    </div>
                                    <Badge variant="secondary" className="font-black">{formatCurrency(order.total - order.deliveryFee)}</Badge>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </main>

            <Dialog open={!!selectedOrder} onOpenChange={(v) => !v && setSelectedOrder(null)}>
                <DialogContent className="sm:max-w-md bg-white rounded-t-[3rem] p-0 overflow-hidden border-none shadow-2xl max-h-[90vh]">
                    {selectedOrder && (
                        <div className="flex flex-col h-full animate-in slide-in-from-bottom duration-300">
                            <DialogHeader className="p-6 border-b text-right flex flex-row items-center justify-between">
                                <div>
                                    <DialogTitle className="text-2xl font-black text-slate-800">تفاصيل الطلب</DialogTitle>
                                    <p className="text-[10px] font-bold text-muted-foreground">رقم القائمة: {selectedOrder.orderNumber}</p>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => setSelectedOrder(null)} className="rounded-full"><X className="h-6 w-6"/></Button>
                            </DialogHeader>

                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                <div className="space-y-3">
                                    <h3 className="font-black text-primary flex items-center gap-2">وجبات الزبون:</h3>
                                    {selectedOrder.items && selectedOrder.items.length > 0 ? (
                                        selectedOrder.items.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center bg-muted/20 p-4 rounded-2xl border-2 border-dashed">
                                                <div className="text-right">
                                                    <p className="font-black text-sm">{item.product?.name}</p>
                                                    {item.selectedSize && <Badge variant="outline" className="text-[8px] mt-1 font-bold">{item.selectedSize.name}</Badge>}
                                                </div>
                                                <div className="p-2 bg-primary/10 rounded-xl px-4 font-black text-primary">x{item.quantity}</div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-center py-4 font-bold text-muted-foreground">جاري جلب تفاصيل الوجبات...</p>
                                    )}
                                </div>

                                <div className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 flex justify-between items-center">
                                    <span className="font-black text-slate-600">صافي ربح المتجر:</span>
                                    <span className="text-2xl font-black text-slate-900">{formatCurrency(selectedOrder.total - selectedOrder.deliveryFee)}</span>
                                </div>
                            </div>

                            {selectedOrder.status === 'unassigned' ? (
                                <DialogFooter className="p-6 bg-slate-50 border-t sticky bottom-0 flex-row gap-3">
                                    <Button 
                                        variant="outline" 
                                        disabled={!!processingOrderId}
                                        onClick={() => handleUpdateStatus(selectedOrder.id, 'cancelled')}
                                        className="flex-1 h-16 rounded-2xl font-black text-destructive border-destructive/20 bg-white"
                                    >
                                        {processingOrderId === selectedOrder.id ? <Loader2 className="animate-spin h-5 w-5"/> : "رفض الطلب"}
                                    </Button>
                                    <Button 
                                        disabled={!!processingOrderId}
                                        onClick={() => handleUpdateStatus(selectedOrder.id, 'pending_assignment')}
                                        className="flex-[2] h-16 rounded-2xl font-black text-xl bg-green-600 hover:bg-green-700 shadow-xl shadow-green-100"
                                    >
                                        {processingOrderId === selectedOrder.id ? <Loader2 className="animate-spin h-6 w-6"/> : "قبول وتحضير"}
                                    </Button>
                                </DialogFooter>
                            ) : (
                                <DialogFooter className="p-6 bg-slate-50 border-t sticky bottom-0">
                                    <Button variant="outline" onClick={() => setSelectedOrder(null)} className="w-full h-14 rounded-2xl font-black">إغلاق النافذة</Button>
                                </DialogFooter>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
