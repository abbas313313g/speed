
"use client";

import { useMemo, useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Wallet, Landmark, User, Settings2, ShoppingCart, ShieldAlert, ArrowRight, Banknote, SendHorizontal, Loader2, Hourglass } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { getWorkerLevel } from '@/lib/workerLevels';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useDeliveryWorkers } from '@/hooks/useDeliveryWorkers';
import { useOrders } from '@/hooks/useOrders';
import { useWithdrawals } from '@/hooks/useWithdrawals';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface DeliveryStatsPageProps {
    onBack: () => void;
}

export default function DeliveryStatsPage({ onBack }: DeliveryStatsPageProps) {
  const [workerId, setWorkerId] = useState<string | null>(null);
  const { deliveryWorkers, isLoading: workersLoading, updateWorkerDetails } = useDeliveryWorkers();
  const { allOrders, isLoading: ordersLoading } = useOrders();
  const { requests, requestWithdraw } = useWithdrawals();
  const { toast } = useToast();
  
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem('deliveryWorkerId');
    setWorkerId(id);
  }, []);

  const { stats, worker, level, isFrozen, pendingRequest } = useMemo(() => {
    if (!workerId || !deliveryWorkers || !allOrders) return { stats: { totalEarnings: 0, deliveredOrders: 0, unpaidEarnings: 0, moneyOwedToOffice: 0 }, worker: null, level: null, isFrozen: false, pendingRequest: null };
    
    const w = deliveryWorkers.find(d => d.id === workerId);
    if (!w) return { stats: { totalEarnings: 0, deliveredOrders: 0, unpaidEarnings: 0, moneyOwedToOffice: 0 }, worker: null, level: null, isFrozen: false, pendingRequest: null };
    
    const myD = allOrders.filter(o => o.deliveryWorkerId === workerId && o.status === 'delivered');
    const totalEarnings = myD.reduce((acc, o) => acc + (o.deliveryFee || 0), 0);
    const unpaidEarnings = myD.filter(o => !o.isFeePaid).reduce((acc, o) => acc + (o.deliveryFee || 0), 0);
    const moneyOwedToOffice = myD.filter(o => !o.isOrderPaidToOffice).reduce((acc, o) => acc + (o.total || 0), 0);
    
    const isActuallyFrozen = moneyOwedToOffice >= 100000;
    const pRequest = requests.find(r => r.targetId === workerId && r.status === 'pending');
    
    const levelD = getWorkerLevel(w, myD.length, new Date());
    return { 
        stats: { totalEarnings, deliveredOrders: myD.length, unpaidEarnings, moneyOwedToOffice }, 
        worker: w, 
        level: levelD.level, 
        isFrozen: isActuallyFrozen,
        pendingRequest: pRequest
    };
  }, [workerId, deliveryWorkers, allOrders, requests]);

  useEffect(() => { if(worker) setName(worker.name || ''); }, [worker]);

  const handleWithdrawRequest = async () => {
      if (!worker || stats.unpaidEarnings < 5000) {
          toast({ title: "الحد الأدنى للسحب هو 5,000 د.ع", variant: "destructive" });
          return;
      }
      setIsRequesting(true);
      const success = await requestWithdraw({
          type: 'delivery',
          targetId: worker.id,
          targetName: worker.name,
          amount: stats.unpaidEarnings,
          netAmount: stats.unpaidEarnings,
          branchId: worker.branchId
      });
      setIsRequesting(false);
  };

  if (workersLoading || ordersLoading || !workerId) {
      return <div className="p-6 space-y-6"><Skeleton className="h-48 w-full rounded-3xl" /><Skeleton className="h-24 w-full rounded-2xl" /><Skeleton className="h-24 w-full rounded-2xl" /></div>;
  }

  const LevelIcon = level?.icon;
  const displayBalance = pendingRequest ? 0 : stats.unpaidEarnings;

  return (
    <div className="p-6 space-y-6 bg-background pb-32">
      <header className="flex items-center gap-4 sticky top-0 bg-background/80 backdrop-blur-md z-10 py-2">
         <button onClick={onBack} className="p-3 bg-secondary rounded-2xl text-primary active:scale-75 transition-all shadow-sm"><ArrowRight className="h-6 w-6"/></button>
         <div className="text-right">
            <h1 className="text-2xl font-black text-primary">محفظتي</h1>
            <p className="text-[10px] text-muted-foreground font-bold">إدارة أرباحك وحساباتك</p>
         </div>
      </header>

       {isFrozen && (
          <div className="p-5 bg-destructive text-white rounded-[2rem] shadow-xl flex items-start gap-4 animate-in zoom-in">
              <ShieldAlert className="h-10 w-10 shrink-0" />
              <div className="space-y-1">
                  <p className="font-black text-lg leading-none">الحساب مجمد مالياً!</p>
                  <p className="text-xs font-bold text-white/80">ذمتك النقدية للمكتب تجاوزت الحد المسموح. يرجى تسوية الحساب مع الإدارة لتفعيل استقبال الطلبات مجدداً.</p>
              </div>
          </div>
       )}

       {level && LevelIcon && (
        <Card className="rounded-[2.5rem] border-none shadow-xl bg-gradient-to-br from-primary to-primary/80 text-white overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
            <CardHeader className="pb-0 text-right">
                <div className="flex justify-between items-center flex-row-reverse">
                    <CardTitle className="text-white/80 text-xs font-black">تصنيفك الحالي</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center text-center space-y-4 pt-4">
                <div className="p-4 bg-white/20 rounded-[2.5rem] backdrop-blur-md border border-white/30 shadow-2xl"><LevelIcon className="w-20 h-20" /></div>
                <div><h2 className="text-4xl font-black italic">{level.name}</h2><p className="text-white/70 text-[10px] font-bold mt-1">كابتن معتمد</p></div>
                 {level.nextLevelThreshold && (
                     <div className="w-full pt-4 space-y-2">
                        <div className="flex justify-between text-[10px] font-black px-2 flex-row-reverse"><span>{stats.deliveredOrders} / {level.nextLevelThreshold} طلب</span><span>باقي {level.nextLevelThreshold - stats.deliveredOrders} للترقية</span></div>
                        <Progress value={(stats.deliveredOrders / level.nextLevelThreshold) * 100} className="bg-white/20 h-2.5" />
                     </div>
                 )}
            </CardContent>
        </Card>
      )}

      <div className="grid gap-3 grid-cols-1 text-right">
        <Card className="rounded-[2.5rem] border-none shadow-xl bg-white border-r-8 border-r-primary overflow-hidden">
          <CardHeader className="p-6 pb-2"><CardTitle className="text-sm font-black text-muted-foreground flex items-center gap-2 justify-end"><Wallet className="h-4 w-4 text-primary"/> رصيد الأرباح القابل للسحب</CardTitle></CardHeader>
          <CardContent className="p-6 pt-0 space-y-4">
              <div className="text-4xl font-black text-primary tracking-tighter">
                  {formatCurrency(displayBalance)}
              </div>
              
              {pendingRequest ? (
                  <div className="p-4 bg-orange-50 border-2 border-dashed border-orange-200 rounded-2xl flex flex-col items-center gap-2 animate-pulse">
                      <Hourglass className="h-6 w-6 text-orange-500" />
                      <p className="font-black text-orange-600 text-sm">طلبك لسحب {formatCurrency(pendingRequest.netAmount)} قيد المراجعة</p>
                      <p className="text-[10px] font-bold text-orange-400">سيصلك الرد خلال 24 ساعة</p>
                  </div>
              ) : (
                <Button 
                    onClick={handleWithdrawRequest} 
                    disabled={isRequesting || stats.unpaidEarnings < 5000}
                    className="w-full h-14 rounded-2xl font-black text-lg gap-2 shadow-lg shadow-primary/10 transition-all active:scale-90"
                >
                    {isRequesting ? <Loader2 className="animate-spin h-5 w-5"/> : <SendHorizontal className="h-5 w-5"/>}
                    تقديم طلب سحب كاش
                </Button>
              )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3">
            <Card className="rounded-[1.5rem] border-none shadow-md bg-white border-r-4 border-r-destructive">
                <CardHeader className="p-4 pb-1"><CardTitle className="text-[10px] font-bold text-muted-foreground flex items-center gap-2 justify-end"><Banknote className="h-3 w-3 text-destructive"/> ذمة للمكتب</CardTitle></CardHeader>
                <CardContent className="p-4 pt-0"><div className="text-lg font-black text-destructive truncate">{formatCurrency(stats.moneyOwedToOffice)}</div></CardContent>
            </Card>

            <Card className="rounded-[1.5rem] border-none shadow-md bg-white">
                <CardHeader className="p-4 pb-1"><CardTitle className="text-[10px] font-bold text-muted-foreground flex items-center gap-2 justify-end"><ShoppingCart className="h-3 w-3 text-orange-500"/> إجمالي المهام</CardTitle></CardHeader>
                <CardContent className="p-4 pt-0"><div className="text-lg font-black">+{stats.deliveredOrders}</div></CardContent>
            </Card>
        </div>
      </div>

       <Card className="rounded-[2rem] border-none shadow-md bg-card text-right">
          <CardHeader><CardTitle className="text-lg font-black flex items-center gap-2 justify-end"><Settings2 className="h-5 w-5 text-primary"/> الملف الشخصي</CardTitle></CardHeader>
          <CardContent className="space-y-4">
             <div className="space-y-2">
                <Label className="text-xs font-black pr-1">الاسم الكامل</Label>
                <div className="relative"><User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input value={name} onChange={(e) => setName(e.target.value)} className="pr-10 h-12 rounded-xl font-bold border-2" /></div>
             </div>
             <Button onClick={() => updateWorkerDetails(workerId, { name })} className="w-full h-14 rounded-xl text-lg font-black shadow-lg" disabled={isSaving}>
                {isSaving ? <Loader2 className="animate-spin h-5 w-5"/> : "حفظ التغييرات"}
             </Button>
          </CardContent>
        </Card>
    </div>
  );
}
