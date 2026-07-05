"use client";

import { useMemo, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Wallet, Landmark, User, Settings2, ShoppingCart, ShieldAlert, ArrowRight } from 'lucide-react';
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
  const router = useRouter();
  const [workerId, setWorkerId] = useState<string | null>(null);
  const { deliveryWorkers, isLoading: workersLoading, updateWorkerDetails } = useDeliveryWorkers();
  const { allOrders, isLoading: ordersLoading } = useOrders();
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);


  useEffect(() => {
    const id = localStorage.getItem('deliveryWorkerId');
    if (!id) {
      // Don't use router.replace here to avoid SPA stack issues
      setWorkerId(null);
    } else {
      setWorkerId(id);
    }
  }, []);

  const { stats, worker, level, isFrozen } = useMemo(() => {
    if (!workerId || !deliveryWorkers || !allOrders) {
        return { stats: { totalEarnings: 0, deliveredOrders: 0, unpaidEarnings: 0 }, worker: null, level: null, isFrozen: false };
    }
    
    const worker = deliveryWorkers.find(w => w.id === workerId);
    if (!worker) {
        return { stats: { totalEarnings: 0, deliveredOrders: 0, unpaidEarnings: 0 }, worker: null, level: null, isFrozen: false };
    }

    const myDeliveredOrders = allOrders.filter(order => order.deliveryWorkerId === workerId && order.status === 'delivered');
    const totalEarnings = myDeliveredOrders.reduce((acc, order) => acc + (order.deliveryFee || 0), 0);
    const unpaidEarnings = myDeliveredOrders.filter(o => !o.isFeePaid).reduce((acc, order) => acc + (order.deliveryFee || 0), 0);
    const deliveredOrders = myDeliveredOrders.length;
    
    const levelData = getWorkerLevel(worker, deliveredOrders, new Date());
    
    return { stats: { totalEarnings, deliveredOrders, unpaidEarnings }, worker, level: levelData.level, isFrozen: levelData.isFrozen };
  }, [workerId, deliveryWorkers, allOrders]);

  useEffect(() => {
    if(worker) {
        setName(worker.name || '');
    }
  }, [worker]);

  const handleSaveChanges = useCallback(async () => {
    if (!workerId || !name.trim()) return;
    setIsSaving(true);
    await updateWorkerDetails(workerId, { name });
    setIsSaving(false);
  }, [workerId, name, updateWorkerDetails]);


  if (workersLoading || ordersLoading || !workerId) {
      return (
          <div className="p-6 space-y-6 bg-background h-screen">
              <div className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-2xl" />
                  <div className="space-y-2">
                     <Skeleton className="h-6 w-48" />
                     <Skeleton className="h-4 w-32" />
                  </div>
              </div>
              <Skeleton className="h-48 w-full rounded-[2rem]" />
          </div>
      )
  }

  const LevelIcon = level?.icon;

  return (
    <div className="p-6 space-y-6 bg-background pb-32">
      <header className="flex items-center gap-4 sticky top-0 bg-background/80 backdrop-blur-md z-10 py-2">
         <button 
            onClick={onBack} 
            className="p-3 bg-secondary rounded-2xl text-primary active:scale-75 transition-all shadow-sm"
         >
            <ArrowRight className="h-6 w-6"/>
         </button>
         <div className="text-right">
            <h1 className="text-2xl font-black text-primary">حسابي</h1>
            <p className="text-[10px] text-muted-foreground font-bold">أداءك في سبيد شوب</p>
         </div>
      </header>

       {level && LevelIcon && (
        <Card className="rounded-[2.5rem] border-none shadow-xl bg-gradient-to-br from-primary to-primary/80 text-white overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
            <CardHeader className="pb-0 text-right">
                <div className="flex justify-between items-center flex-row-reverse">
                    <CardTitle className="text-white/80 text-xs font-black">تصنيفك الحالي</CardTitle>
                    {isFrozen && (
                        <div className="flex items-center gap-1 text-[8px] text-white font-black bg-destructive px-3 py-1 rounded-full animate-pulse shadow-lg">
                            <ShieldAlert className="h-3 w-3"/>
                            <span>مجمد مؤقتاً</span>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center text-center space-y-4 pt-4">
                <div className="p-4 bg-white/20 rounded-[2.5rem] backdrop-blur-md border border-white/30 shadow-2xl">
                    <LevelIcon className="w-20 h-20" />
                </div>
                <div>
                    <h2 className="text-4xl font-black italic">{level.name}</h2>
                    <p className="text-white/70 text-[10px] font-bold mt-1">كابتن معتمد في سبيد</p>
                </div>
                 
                 {level.nextLevelThreshold && (
                     <div className="w-full pt-4 space-y-2">
                        <div className="flex justify-between text-[10px] font-black px-2 flex-row-reverse">
                            <span>{stats.deliveredOrders} / {level.nextLevelThreshold} طلب</span>
                            <span>باقي {level.nextLevelThreshold - stats.deliveredOrders} للترقية</span>
                        </div>
                        <Progress value={(stats.deliveredOrders / level.nextLevelThreshold) * 100} className="bg-white/20 h-2.5 rounded-full overflow-hidden" />
                     </div>
                 )}
            </CardContent>
        </Card>
      )}

      <div className="grid gap-3 grid-cols-2 text-right">
        <Card className="rounded-[1.5rem] border-none shadow-md bg-white">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-[10px] font-bold text-muted-foreground flex items-center gap-2 justify-end"><Wallet className="h-3 w-3 text-primary"/> المستحق</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-lg font-black text-primary truncate">{formatCurrency(stats.unpaidEarnings)}</div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.5rem] border-none shadow-md bg-white">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-[10px] font-bold text-muted-foreground flex items-center gap-2 justify-end"><Landmark className="h-3 w-3 text-green-500"/> المستلم</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-lg font-black text-foreground truncate">{formatCurrency(stats.totalEarnings - stats.unpaidEarnings)}</div>
          </CardContent>
        </Card>

        <Card className="col-span-2 rounded-[1.5rem] border-none shadow-md bg-white">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-[10px] font-bold text-muted-foreground flex items-center gap-2 justify-end"><ShoppingCart className="h-3 w-3 text-orange-500"/> إجمالي التوصيلات المكتملة</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black text-foreground">+{stats.deliveredOrders} <span className="text-xs font-bold text-muted-foreground">عملية ناجحة</span></div>
          </CardContent>
        </Card>
      </div>

       <Card className="rounded-[2rem] border-none shadow-md bg-card text-right">
          <CardHeader>
            <CardTitle className="text-lg font-black flex items-center gap-2 justify-end"><Settings2 className="h-5 w-5 text-primary"/> تعديل الملف الشخصي</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-black pr-1">الاسم بالكامل</Label>
                <div className="relative">
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="pr-10 h-12 rounded-xl font-bold border-2 text-right" />
                </div>
             </div>
             <Button onClick={handleSaveChanges} className="w-full h-14 rounded-xl text-lg font-black shadow-lg shadow-primary/20" disabled={isSaving}>
                {isSaving ? <Loader2 className="ml-2 h-5 w-5 animate-spin"/> : "حفظ التغييرات الجديدة"}
             </Button>
          </CardContent>
        </Card>
    </div>
  );
}