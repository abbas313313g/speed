
"use client";

import { useMemo, useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Wallet, Landmark, User, Settings2, ShoppingCart, ShieldAlert, ArrowRight, Banknote } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { getWorkerLevel } from '@/lib/workerLevels';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useDeliveryWorkers } from '@/hooks/useDeliveryWorkers';
import { useOrders } from '@/hooks/useOrders';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface DeliveryStatsPageProps {
    onBack: () => void;
}

export default function DeliveryStatsPage({ onBack }: DeliveryStatsPageProps) {
  const [workerId, setWorkerId] = useState<string | null>(null);
  const { deliveryWorkers, isLoading: workersLoading, updateWorkerDetails } = useDeliveryWorkers();
  const { allOrders, isLoading: ordersLoading } = useOrders();
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem('deliveryWorkerId');
    setWorkerId(id);
  }, []);

  const { stats, worker, level, isFrozen } = useMemo(() => {
    if (!workerId || !deliveryWorkers || !allOrders) return { stats: { totalEarnings: 0, deliveredOrders: 0, unpaidEarnings: 0, moneyOwedToOffice: 0 }, worker: null, level: null, isFrozen: false };
    const w = deliveryWorkers.find(d => d.id === workerId);
    if (!w) return { stats: { totalEarnings: 0, deliveredOrders: 0, unpaidEarnings: 0, moneyOwedToOffice: 0 }, worker: null, level: null, isFrozen: false };
    const myD = allOrders.filter(o => o.deliveryWorkerId === workerId && o.status === 'delivered');
    const totalEarnings = myD.reduce((acc, o) => acc + (o.deliveryFee || 0), 0);
    const unpaidEarnings = myD.filter(o => !o.isFeePaid).reduce((acc, o) => acc + (o.deliveryFee || 0), 0);
    const moneyOwedToOffice = myD.filter(o => !o.isOrderPaidToOffice).reduce((acc, o) => acc + (o.total - o.deliveryFee), 0);
    const levelD = getWorkerLevel(w, myD.length, new Date());
    return { stats: { totalEarnings, deliveredOrders: myD.length, unpaidEarnings, moneyOwedToOffice }, worker: w, level: levelD.level, isFrozen: levelD.isFrozen };
  }, [workerId, deliveryWorkers, allOrders]);

  useEffect(() => { if(worker) setName(worker.name || ''); }, [worker]);

  if (workersLoading || ordersLoading || !workerId) {
      return <div className="p-6 space-y-6"><Skeleton className="h-48 w-full rounded-3xl" /></div>;
  }

  const LevelIcon = level?.icon;

  return (
    <div className="p-6 space-y-6 bg-background pb-32">
      <header className="flex items-center gap-4 sticky top-0 bg-background/80 backdrop-blur-md z-10 py-2">
         <button onClick={onBack} className="p-3 bg-secondary rounded-2xl text-primary active:scale-75 transition-all shadow-sm"><ArrowRight className="h-6 w-6"/></button>
         <div className="text-right">
            <h1 className="text-2xl font-black text-primary">محفظتي</h1>
            <p className="text-[10px] text-muted-foreground font-bold">إدارة أرباحك وحساباتك</p>
         </div>
      </header>

       {level && LevelIcon && (
        <Card className="rounded-[2.5rem] border-none shadow-xl bg-gradient-to-br from-primary to-primary/80 text-white overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
            <CardHeader className="pb-0 text-right">
                <div className="flex justify-between items-center flex-row-reverse">
                    <CardTitle className="text-white/80 text-xs font-black">تصنيفك الحالي</CardTitle>
                    {isFrozen && <div className="flex items-center gap-1 text-[8px] text-white font-black bg-destructive px-3 py-1 rounded-full animate-pulse"><ShieldAlert className="h-3 w-3"/><span>مجمد</span></div>}
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

      <div className="grid gap-3 grid-cols-2 text-right">
        <Card className="rounded-[1.5rem] border-none shadow-md bg-white border-r-4 border-r-primary">
          <CardHeader className="p-4 pb-1"><CardTitle className="text-[10px] font-bold text-muted-foreground flex items-center gap-2 justify-end"><Wallet className="h-3 w-3 text-primary"/> أرباح التوصيل</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0"><div className="text-lg font-black text-primary truncate">{formatCurrency(stats.unpaidEarnings)}</div></CardContent>
        </Card>

        <Card className="rounded-[1.5rem] border-none shadow-md bg-white border-r-4 border-r-destructive">
          <CardHeader className="p-4 pb-1"><CardTitle className="text-[10px] font-bold text-muted-foreground flex items-center gap-2 justify-end"><Banknote className="h-3 w-3 text-destructive"/> ذمة للمكتب</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0"><div className="text-lg font-black text-destructive truncate">{formatCurrency(stats.moneyOwedToOffice)}</div></CardContent>
        </Card>

        <Card className="col-span-2 rounded-[1.5rem] border-none shadow-md bg-white">
          <CardHeader className="p-4 pb-1"><CardTitle className="text-[10px] font-bold text-muted-foreground flex items-center gap-2 justify-end"><ShoppingCart className="h-3 w-3 text-orange-500"/> إجمالي التوصيلات الناجحة</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0"><div className="text-2xl font-black">+{stats.deliveredOrders} <span className="text-xs font-bold text-muted-foreground">مهمة</span></div></CardContent>
        </Card>
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
