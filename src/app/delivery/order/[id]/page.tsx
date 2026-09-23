
"use client";

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowRight, XCircle, Store, ChevronDown, ChevronUp, Navigation, MapPin, User, Wallet, Loader2, Landmark, Compass, Bike } from 'lucide-react';
import type { OrderStatus } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useOrders } from '@/hooks/useOrders';
import { db } from '@/lib/firebase';
import { doc, updateDoc, increment, setDoc, getDoc } from 'firebase/firestore';

interface DeliveryOrderDetailPageProps {
    orderId: string;
    onBack: () => void;
}

export default function DeliveryOrderDetailPage({ orderId, onBack }: DeliveryOrderDetailPageProps) {
  const { toast } = useToast();
  const { allOrders, isLoading, updateOrderStatus } = useOrders();
  const [showBill, setShowBill] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [walletAmount, setWalletAmount] = useState('');
  const [showWalletDialog, setShowWalletDialog] = useState(false);

  const order = useMemo(() => allOrders.find(o => o.id === orderId), [orderId, allOrders]);

  if (isLoading) return <div className="p-4 space-y-4 bg-background h-full"><Skeleton className="h-12 w-full rounded-2xl" /><Skeleton className="h-48 w-full rounded-[2rem]" /></div>;
  if (!order) return <div className="text-center p-8 flex flex-col h-full bg-background"><p className="font-black text-muted-foreground">عذراً، لم نتمكن من العثور على هذا الطلب.</p><Button onClick={onBack} variant="outline" className="mt-4 rounded-xl">العودة للرئيسية</Button></div>;

   const getStatusText = (status: OrderStatus) => {
        switch (status) {
            case 'unassigned': return "بانتظار سائق";
            case 'pending_assignment': return "جارِ التعيين...";
            case 'confirmed': return "بانتظار موافقتك";
            case 'preparing': return "قيد التحضير في المطعم";
            case 'ready_for_pickup': return "جاهز للاستلام";
            case 'on_the_way': return "في الطريق للزبون";
            case 'delivered': return "تم التوصيل بنجاح";
            case 'cancelled': return "ملغي";
            default: return status;
        }
    }

  const nextStatus: {[key in OrderStatus]?: OrderStatus} = {
      'preparing': 'ready_for_pickup',
      'ready_for_pickup': 'on_the_way',
      'on_the_way': 'delivered',
  }

  const handleUpdateStatus = async () => {
      const next = nextStatus[order.status];
      if(next === 'delivered') {
          handleNormalDelivery();
      } else if(next) {
          await updateOrderStatus(order.id, next);
          toast({ title: `تم تحديث الحالة إلى: ${getStatusText(next)}` });
      }
  }

  const handleNormalDelivery = async () => {
      setIsFinishing(true);
      await updateOrderStatus(order.id, 'delivered');
      toast({ title: "تم التوصيل بنجاح 🏆" });
      setIsFinishing(false);
  }

  const handleWalletDelivery = async () => {
      const amount = parseFloat(walletAmount);
      if (isNaN(amount) || amount <= 0) {
          toast({ title: "الرجاء إدخال مبلغ صحيح", variant: "destructive" });
          return;
      }
      setIsFinishing(true);
      try {
          const walletRef = doc(db, "wallets", order.userId);
          const walletSnap = await getDoc(walletRef);
          if (walletSnap.exists()) {
              await updateDoc(walletRef, { balance: increment(amount) });
          } else {
              await setDoc(walletRef, { userId: order.userId, balance: amount });
          }

          await updateDoc(doc(db, "orders", order.id), {
              status: 'delivered',
              walletAmountAdded: amount
          });
          
          toast({ title: `تم إيداع ${formatCurrency(amount)} في محفظة الزبون ✅` });
          setShowWalletDialog(false);
      } catch (e) {
          toast({ title: "فشل الإيداع المالي", variant: "destructive" });
      } finally {
          setIsFinishing(false);
      }
  }

  return (
    <div className="flex flex-col bg-background pb-32 h-full overflow-y-auto text-right">
        <header className="flex items-center gap-4 sticky top-0 bg-white/95 backdrop-blur-md z-30 p-4 border-b">
            <button onClick={onBack} className="p-3 bg-slate-100 rounded-2xl text-primary active:scale-75 shadow-sm"><ArrowRight className="h-6 w-6"/></button>
            <div className="flex-1 text-right">
                <h1 className="text-xl font-black text-slate-800 leading-none">طلب #{order.orderNumber}</h1>
                <p className="text-[10px] font-bold text-primary mt-1 uppercase tracking-widest">{getStatusText(order.status)}</p>
            </div>
        </header>

        <div className="p-4 space-y-6">
            <div className="grid grid-cols-1 gap-3">
                <Button size="lg" className="w-full h-16 rounded-[2rem] shadow-xl bg-primary text-white gap-3" onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${order.address.latitude},${order.address.longitude}`, '_blank')}>
                    <Navigation className="h-7 w-7 text-white" />
                    <span className="text-xl font-black">خرائط جوجل</span>
                </Button>
                
                <Button size="lg" variant="outline" className="w-full h-16 rounded-[2rem] shadow-lg bg-white text-[#33ccff] border-2 border-[#33ccff]/20 gap-3" onClick={() => window.open(`https://waze.com/ul?ll=${order.address.latitude},${order.address.longitude}&navigate=yes`, '_blank')}>
                    <Compass className="h-7 w-7 text-[#33ccff]" />
                    <span className="text-xl font-black">الانتقال عبر Waze 🧭</span>
                </Button>
            </div>

            <Card className="rounded-[2.5rem] border-none shadow-xl bg-primary text-white overflow-hidden p-6 flex justify-between items-center">
                <div className="text-right">
                    <p className="text-[10px] font-black text-white/70 uppercase tracking-widest mb-1">أجرتك من التوصيل</p>
                    <div className="text-3xl font-black tracking-tighter">{formatCurrency(order.deliveryFee)}</div>
                </div>
                <div className="p-4 bg-white/20 rounded-2xl">
                    <Bike className="h-8 w-8 text-white" />
                </div>
            </Card>

            <Card className="rounded-[2rem] border-none shadow-md overflow-hidden bg-white">
                <div className="p-5 space-y-4 text-right">
                    <p className="text-[10px] font-black text-muted-foreground uppercase">الزبون المستلم</p>
                    <p className="text-xl font-black">{order.address.name}</p>
                    <Separator className="opacity-50" />
                    <p className="text-2xl font-black text-slate-900 tracking-widest font-mono select-all" dir="ltr">{order.address.phone}</p>
                    <div className="p-3 bg-muted/30 rounded-2xl text-sm font-bold border">
                        <p className="text-primary font-black">{order.address.deliveryZone}</p>
                        <p>{order.address.details || 'بدون ملاحظات'}</p>
                    </div>
                </div>
            </Card>

            <Card className="rounded-[2.5rem] border-none shadow-lg overflow-hidden bg-white">
                <button onClick={() => setShowBill(!showBill)} className="w-full p-5 flex justify-between items-center bg-slate-50">
                    <span className="font-black text-sm">تفاصيل الحساب</span>
                    {showBill ? <ChevronUp className="h-5 w-5"/> : <ChevronDown className="h-5 w-5"/>}
                </button>
                {showBill && (
                    <CardContent className="p-6 space-y-4 animate-in slide-in-from-top-2">
                        {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center text-sm">
                                <span className="font-black p-2.5 bg-primary/10 rounded-xl text-primary min-w-[36px] text-center">x{item.quantity}</span>
                                <span className="font-black">{item.product.name}</span>
                            </div>
                        ))}
                    </CardContent>
                )}
                <div className="bg-primary text-white p-6 flex justify-between items-center">
                    <div className="flex flex-col"><span className="font-black text-xs opacity-80">المجموع كاش:</span></div>
                    <span className="text-3xl font-black tracking-tighter">{formatCurrency(order.total)}</span>
                </div>
            </Card>
            
            {order.status === 'on_the_way' ? (
                <div className="grid gap-3">
                    <Button size="lg" className="w-full h-20 rounded-[2.5rem] text-2xl font-black shadow-xl bg-green-600" onClick={handleNormalDelivery} disabled={isFinishing}>
                        {isFinishing ? <Loader2 className="animate-spin" /> : "تم التوصيل كاش"}
                    </Button>
                    <Button size="lg" variant="outline" className="w-full h-16 rounded-3xl text-lg font-black gap-2 border-2 border-primary/20 bg-white text-primary" onClick={() => setShowWalletDialog(true)} disabled={isFinishing}>
                        <Wallet className="h-6 w-6"/> اتمام مع إيداع للمحفظة
                    </Button>
                </div>
            ) : nextStatus[order.status] && (
                <Button size="lg" className="w-full h-20 rounded-[2.5rem] text-2xl font-black shadow-xl bg-primary" onClick={handleUpdateStatus} disabled={isFinishing}>
                    تحديث: {getStatusText(nextStatus[order.status]!)}
                </Button>
            )}

            <Dialog open={showWalletDialog} onOpenChange={setShowWalletDialog}>
                <DialogContent className="sm:max-w-md rounded-[2.5rem] text-right">
                    <DialogHeader><DialogTitle className="text-2xl font-black text-right">إيداع رصيد للزبون</DialogTitle></DialogHeader>
                    <div className="py-6 space-y-4">
                        <div className="p-4 bg-primary/5 rounded-2xl border-2 border-dashed border-primary/20 flex flex-col items-center gap-2">
                             <Landmark className="h-10 w-10 text-primary" />
                             <p className="text-xs font-bold text-center">المبلغ الذي ستكتبه سيذهب لمحفظة الزبون وسيُضاف أيضاً لـ "ذمتك المالية" للمكتب.</p>
                        </div>
                        <div className="space-y-2">
                            <label className="font-black text-sm pr-1">قيمة المبلغ المودع (IQD)</label>
                            <Input type="number" value={walletAmount} onChange={(e)=>setWalletAmount(e.target.value)} placeholder="0" className="h-16 rounded-2xl text-3xl font-black text-center text-primary bg-slate-50 border-none" />
                        </div>
                    </div>
                    <DialogFooter><Button onClick={handleWalletDelivery} className="w-full h-16 rounded-2xl text-xl font-black" disabled={isFinishing}>{isFinishing ? <Loader2 className="animate-spin" /> : "تثبيت العملية وإنهاء الطلب"}</Button></DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    </div>
  );
}
