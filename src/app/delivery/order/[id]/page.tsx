
"use client";

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowRight, XCircle, Store, ChevronDown, ChevronUp, Navigation, MapPin, User, Wallet, Loader2, Landmark, Compass, Bike, Phone, Info, ReceiptText, Tag } from 'lucide-react';
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
  const [showBill, setShowBill] = useState(true);
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
    <div className="flex flex-col bg-[#f1f5f9] pb-32 h-full overflow-y-auto text-right">
        <header className="flex items-center gap-4 sticky top-0 bg-white/95 backdrop-blur-md z-30 p-5 border-b shadow-sm rounded-b-[2.5rem]">
            <button onClick={onBack} className="p-3 bg-slate-100 rounded-2xl text-primary active:scale-75 shadow-inner"><ArrowRight className="h-6 w-6"/></button>
            <div className="flex-1 text-right">
                <h1 className="text-2xl font-black text-slate-800 leading-none italic">مهمة عمل #{order.orderNumber}</h1>
                <p className="text-[10px] font-black text-primary mt-2 uppercase tracking-[0.2em]">{getStatusText(order.status)}</p>
            </div>
        </header>

        <div className="p-4 space-y-6">
            {/* أزرار الملاحة */}
            <div className="grid grid-cols-2 gap-4">
                <button 
                    onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${order.address.latitude},${order.address.longitude}`, '_blank')}
                    className="h-20 rounded-[2rem] bg-white shadow-xl flex flex-col items-center justify-center gap-1 border-2 border-slate-50 transition-all active:scale-95"
                >
                    <div className="p-2 bg-green-50 rounded-xl"><Navigation className="h-6 w-6 text-green-600" /></div>
                    <span className="text-[10px] font-black text-slate-600">خرائط جوجل</span>
                </button>
                <button 
                    onClick={() => window.open(`https://waze.com/ul?ll=${order.address.latitude},${order.address.longitude}&navigate=yes`, '_blank')}
                    className="h-20 rounded-[2rem] bg-white shadow-xl flex flex-col items-center justify-center gap-1 border-2 border-slate-50 transition-all active:scale-95"
                >
                    <div className="p-2 bg-blue-50 rounded-xl"><Compass className="h-6 w-6 text-blue-500" /></div>
                    <span className="text-[10px] font-black text-slate-600">تطبيق Waze</span>
                </button>
            </div>

            {/* أرباح المندوب */}
            <Card className="rounded-[2.8rem] border-none shadow-2xl bg-slate-900 text-white overflow-hidden p-8 flex justify-between items-center relative">
                <div className="absolute left-[-20px] top-[-20px] opacity-10"><Bike className="h-40 w-40" /></div>
                <div className="text-right relative z-10">
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-2">أجرة التوصيل الصافية</p>
                    <div className="text-5xl font-black tracking-tighter text-green-400 drop-shadow-md">{formatCurrency(order.deliveryFee)}</div>
                </div>
                <div className="p-5 bg-white/10 rounded-[2rem] backdrop-blur-xl border border-white/20">
                    <Wallet className="h-10 w-10 text-primary" />
                </div>
            </Card>

            {/* بيانات الزبون الكاملة */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 justify-end px-2">
                    <h2 className="text-xl font-black text-slate-800">بيانات الزبون</h2>
                    <User className="h-5 w-5 text-primary" />
                </div>
                <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden bg-white p-6 space-y-6">
                    <div className="flex items-center justify-between flex-row-reverse">
                        <div className="text-right flex-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">الاسم الكامل</p>
                            <p className="text-2xl font-black text-slate-800">{order.address.name}</p>
                        </div>
                        <a href={`tel:${order.address.phone}`} className="h-16 w-16 bg-green-600 rounded-[1.5rem] flex items-center justify-center shadow-xl shadow-green-100 animate-pulse active:scale-75 transition-all">
                            <Phone className="h-8 w-8 text-white" />
                        </a>
                    </div>

                    <Separator className="opacity-10" />

                    <div className="space-y-4">
                        <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">رقم الهاتف</p>
                            <p className="text-3xl font-black text-slate-900 tracking-[0.2em] font-mono bg-slate-50 p-4 rounded-2xl text-center" dir="ltr">{order.address.phone}</p>
                        </div>
                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">العنوان والملاحظات</p>
                            <div className="p-5 bg-primary/5 rounded-[2rem] border-2 border-dashed border-primary/20">
                                <p className="text-primary font-black text-lg mb-1">{order.address.deliveryZone}</p>
                                <p className="text-sm font-bold text-slate-600 leading-relaxed">{order.address.details || 'لا توجد ملاحظات إضافية'}</p>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* تفاصيل الحساب */}
            <div className="space-y-4">
                 <div className="flex items-center gap-2 justify-end px-2">
                    <h2 className="text-xl font-black text-slate-800">تفاصيل الفاتورة</h2>
                    <ReceiptText className="h-5 w-5 text-primary" />
                </div>
                <Card className="rounded-[2.8rem] border-none shadow-2xl overflow-hidden bg-white">
                    <CardHeader className="p-0">
                        <div className="bg-slate-900 text-white p-6 flex justify-between items-center flex-row-reverse">
                            <div className="flex items-center gap-2">
                                <Store className="h-5 w-5 text-primary" />
                                <span className="font-black text-lg">{order.restaurant?.name}</span>
                            </div>
                            <Badge className="bg-white/10 text-white border-none font-black text-[10px]">قائمة الوجبات</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                        {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center flex-row-reverse">
                                <div className="text-right">
                                    <p className="font-black text-slate-800">{item.product.name}</p>
                                    {item.selectedSize && <Badge variant="secondary" className="text-[8px] font-black mt-1">{item.selectedSize.name}</Badge>}
                                </div>
                                <span className="font-black p-2.5 bg-primary/10 rounded-xl text-primary text-sm min-w-[40px] text-center">x{item.quantity}</span>
                            </div>
                        ))}

                        <Separator className="my-4 border-dashed opacity-20" />

                        <div className="space-y-3 font-bold text-sm text-slate-500">
                             <div className="flex justify-between flex-row-reverse">
                                <span>أجور التوصيل:</span>
                                <span className="font-black text-slate-800">{formatCurrency(order.deliveryFee)}</span>
                            </div>
                            {order.appliedCoupon && (
                                <div className="flex justify-between flex-row-reverse text-red-600">
                                    <div className="flex items-center gap-1"><Tag className="h-3 w-3"/> خصم الكود</div>
                                    <span className="font-black">-{formatCurrency(order.appliedCoupon.discountAmount)}</span>
                                </div>
                            )}
                            {order.walletAmountUsed ? (
                                <div className="flex justify-between flex-row-reverse text-blue-600">
                                    <div className="flex items-center gap-1"><Wallet className="h-3 w-3"/> من المحفظة</div>
                                    <span className="font-black">-{formatCurrency(order.walletAmountUsed)}</span>
                                </div>
                            ) : null}
                        </div>
                    </CardContent>
                    <div className="bg-primary text-white p-8 flex justify-between items-center shadow-inner">
                        <div className="flex flex-col text-right">
                            <span className="font-black text-xs opacity-70 uppercase tracking-widest">المبلغ المطلوب استلامه كاش</span>
                        </div>
                        <span className="text-4xl font-black tracking-tighter drop-shadow-lg">{formatCurrency(order.total)}</span>
                    </div>
                </Card>
            </div>
            
            {/* أزرار الحالة */}
            <div className="pt-4 pb-20">
                {order.status === 'on_the_way' ? (
                    <div className="grid gap-4">
                        <Button size="lg" className="w-full h-24 rounded-[2.8rem] text-3xl font-black shadow-2xl bg-green-600 hover:bg-green-700 active:scale-95 transition-all" onClick={handleNormalDelivery} disabled={isFinishing}>
                            {isFinishing ? <Loader2 className="animate-spin h-10 w-10" /> : "تم التوصيل كاش ✅"}
                        </Button>
                        <Button size="lg" variant="outline" className="w-full h-16 rounded-[2rem] text-lg font-black gap-2 border-2 border-primary/20 bg-white text-primary active:scale-95 transition-all" onClick={() => setShowWalletDialog(true)} disabled={isFinishing}>
                            <Wallet className="h-6 w-6"/> اتمام مع إيداع للمحفظة
                        </Button>
                    </div>
                ) : nextStatus[order.status] && (
                    <Button size="lg" className="w-full h-24 rounded-[2.8rem] text-2xl font-black shadow-2xl bg-primary hover:bg-primary/90 active:scale-95 transition-all" onClick={handleUpdateStatus} disabled={isFinishing}>
                        تحديث: {getStatusText(nextStatus[order.status]!)}
                    </Button>
                )}
            </div>

            {/* ديالوج المحفظة */}
            <Dialog open={showWalletDialog} onOpenChange={setShowWalletDialog}>
                <DialogContent className="sm:max-w-md rounded-[3rem] text-right border-none shadow-2xl">
                    <DialogHeader><DialogTitle className="text-3xl font-black text-right italic text-slate-800">إيداع رصيد ذكي</DialogTitle></DialogHeader>
                    <div className="py-6 space-y-6 text-right">
                        <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-[2rem] border-2 border-dashed border-blue-200 flex flex-col items-center gap-3">
                             <Landmark className="h-12 w-12 text-blue-600" />
                             <p className="text-xs font-bold text-center text-blue-800 dark:text-blue-200">هذا المبلغ سيُضاف لمحفظة الزبون كـ "رصيد" وسيُسجل في "ذمتك المالية" للمكتب كاش.</p>
                        </div>
                        <div className="space-y-2">
                            <label className="font-black text-sm pr-1 text-slate-500">قيمة المبلغ المودع (IQD)</label>
                            <Input type="number" value={walletAmount} onChange={(e)=>setWalletAmount(e.target.value)} placeholder="0" className="h-20 rounded-[1.5rem] text-4xl font-black text-center text-primary bg-slate-50 border-none shadow-inner" />
                        </div>
                    </div>
                    <DialogFooter><Button onClick={handleWalletDelivery} className="w-full h-16 rounded-[1.8rem] text-xl font-black shadow-xl" disabled={isFinishing}>{isFinishing ? <Loader2 className="animate-spin" /> : "تثبيت العملية وإنهاء الطلب"}</Button></DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    </div>
  );
}
