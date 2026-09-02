
"use client";

import { useMemo, useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { CheckCircle, Clock, Building2, TrendingUp, ArrowRight, Wallet, Landmark, Calendar } from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';
import { useOrders } from '@/hooks/useOrders';
import { useBranches } from '@/hooks/useBranches';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function AdminDashboard({ branchId }: { branchId: string }) {
  const { products, approveProduct, isLoading: pLoading } = useProducts(branchId);
  const { allOrders, isLoading: oLoading } = useOrders(branchId);
  const { branches, isLoading: bLoading } = useBranches();
  const router = useRouter();

  const [globalStats, setGlobalStats] = useState({ totalSales: 0, totalOrders: 0, totalProfit: 0 });
  const [dailyStats, setDailyStats] = useState({ total: 0, branches: [] as any[] });
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);

  const isMain = branchId === 'main';

  useEffect(() => {
      if (isMain) {
          setIsGlobalLoading(true);
          const today = new Date();
          today.setHours(0,0,0,0);
          const todayISO = today.toISOString();

          // جلب طلبات اليوم فقط للإحصائيات السريعة
          const qToday = query(collection(db, "orders"), where("date", ">=", todayISO));
          
          getDocs(qToday).then(snap => {
              const orders = snap.docs.map(d => d.data());
              const deliveredToday = orders.filter(o => o.status === 'delivered');
              
              let totalDailyProfit = 0;
              const branchProfits: {[key: string]: number} = {};

              deliveredToday.forEach(order => {
                  const itemsPrice = order.items.reduce((sum: number, i: any) => sum + ((i.selectedSize?.price ?? i.product.discountPrice ?? i.product.price) * i.quantity), 0);
                  const commission = (itemsPrice * (order.restaurant?.commissionRate || 10)) / 100;
                  totalDailyProfit += commission;
                  
                  const bId = order.branchId || 'main';
                  branchProfits[bId] = (branchProfits[bId] || 0) + commission;
              });

              setDailyStats({
                  total: totalDailyProfit,
                  branches: branches.map(b => ({
                      name: b.name,
                      id: b.id,
                      profit: branchProfits[b.id] || 0
                  })).concat([{ name: 'المركز الرئيسي', id: 'main', profit: branchProfits['main'] || 0 }])
              });

              // جلب الإحصائيات الكلية (محدودة بـ 300 طلب للأداء)
              const qAll = query(collection(db, "orders"), orderBy("date", "desc"), limit(300));
              return getDocs(qAll);
          }).then(snap => {
              if (!snap) return;
              const orders = snap.docs.map(d => d.data());
              const delivered = orders.filter(o => o.status === 'delivered');
              setGlobalStats({
                  totalSales: delivered.reduce((acc, o) => acc + (o.total || 0), 0),
                  totalOrders: orders.length,
                  totalProfit: delivered.reduce((acc, o) => {
                      const itemsPrice = o.items.reduce((sum: number, i: any) => sum + ((i.selectedSize?.price ?? i.product.discountPrice ?? i.product.price) * i.quantity), 0);
                      return acc + ((itemsPrice * (o.restaurant?.commissionRate || 10)) / 100);
                  }, 0)
              });
          }).catch(() => {}).finally(() => setIsGlobalLoading(false));
      }
  }, [isMain, branches]);

  const stats = useMemo(() => {
    const delivered = allOrders.filter(o => o.status === 'delivered');
    const cancelled = allOrders.filter(o => o.status === 'cancelled');
    return {
        totalRevenue: delivered.reduce((acc, o) => acc + o.total, 0),
        pendingProducts: products.filter(p => p.status === 'pending'),
        activeOrders: allOrders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length,
        cancelledCount: cancelled.length
    }
  }, [allOrders, products]);

  if (pLoading && oLoading) return <div className="p-8 text-center animate-pulse font-black text-primary">جاري قراءة إحصائيات النظام...</div>;
  
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-4xl font-black text-primary">لوحة القيادة</h1>
        <p className="text-muted-foreground font-bold italic">إدارة ومتابعة فرع: {branchId === 'main' ? 'المركز العام' : branchId}</p>
      </header>

      {isMain && (
          <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                  <Card className="rounded-[1.5rem] border-none shadow-xl bg-slate-900 text-white p-6 relative overflow-hidden">
                      <div className="absolute right-[-10px] bottom-[-10px] opacity-10"><Calendar className="h-20 w-20"/></div>
                      <div className="text-[10px] font-black text-primary uppercase mb-2">صافي أرباح النظام اليوم</div>
                      <div className="text-4xl font-black text-green-400 tracking-tighter">{formatCurrency(dailyStats.total)}</div>
                      <p className="text-[9px] text-white/40 mt-1">من كافة الفروع والطلبات المكتملة</p>
                  </Card>
                  <Card className="rounded-[1.5rem] border-none shadow-xl bg-slate-800 text-white p-6">
                      <div className="text-[10px] font-black text-blue-400 uppercase mb-2">مبيعات اليوم الكلية</div>
                      <div className="text-3xl font-black">{globalStats.totalOrders} <span className="text-xs text-white/50">طلب</span></div>
                  </Card>
                  <Card className="rounded-[1.5rem] border-none shadow-xl bg-slate-800 text-white p-6">
                      <div className="text-[10px] font-black text-orange-400 uppercase mb-2">العمولات الكلية (أخر 300)</div>
                      <div className="text-3xl font-black">{formatCurrency(globalStats.totalProfit)}</div>
                  </Card>
              </div>

              <section className="space-y-4">
                  <h2 className="text-xl font-black flex items-center gap-2 px-1 text-slate-800">تحليل أرباح الفروع لهذا اليوم <TrendingUp className="h-5 w-5 text-primary"/></h2>
                  <Card className="rounded-[2rem] border-none shadow-xl overflow-hidden bg-white">
                      <Table>
                          <TableHeader className="bg-muted/50">
                              <TableRow>
                                  <TableHead className="font-black">الفرع / المدينة</TableHead>
                                  <TableHead className="font-black text-center">أرباح العمولات (اليوم)</TableHead>
                                  <TableHead className="font-black text-center">الحالة</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {dailyStats.branches.sort((a,b) => b.profit - a.profit).map(b => (
                                  <TableRow key={b.id}>
                                      <TableCell className="font-bold flex items-center gap-2">
                                          <div className="p-2 bg-primary/5 rounded-lg"><Building2 className="h-4 w-4 text-primary"/></div>
                                          {b.name}
                                      </TableCell>
                                      <TableCell className="text-center font-black text-lg text-primary">{formatCurrency(b.profit)}</TableCell>
                                      <TableCell className="text-center"><Badge className="bg-green-100 text-green-700 border-none text-[10px]">نشط الآن</Badge></TableCell>
                                  </TableRow>
                              ))}
                          </TableBody>
                      </Table>
                  </Card>
              </section>
          </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="rounded-[1.5rem] border-none shadow-lg bg-primary text-white p-5">
            <div className="text-[10px] font-black text-white/70 uppercase">إجمالي كاش هذا الفرع</div>
            <div className="text-2xl font-black mt-1">{formatCurrency(stats.totalRevenue)}</div>
        </Card>
        <Card className="rounded-[1.5rem] border-none shadow-lg bg-white p-5">
            <div className="text-[10px] font-black text-muted-foreground uppercase">طلبات نشطة</div>
            <div className="text-2xl font-black text-orange-500 mt-1">{stats.activeOrders}</div>
        </Card>
        <Card className="rounded-[1.5rem] border-none shadow-lg bg-white p-5">
            <div className="text-[10px] font-black text-muted-foreground uppercase">الطلبات الملغية</div>
            <div className="text-2xl font-black text-red-500 mt-1">{stats.cancelledCount}</div>
        </Card>
        <Card className="rounded-[1.5rem] border-none shadow-lg bg-white p-5">
            <div className="text-[10px] font-black text-muted-foreground uppercase">بانتظار المراجعة</div>
            <div className="text-2xl font-black text-blue-500 mt-1">{stats.pendingProducts.length}</div>
        </Card>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-black flex items-center gap-2 px-1 text-blue-500"><Clock className="h-6 w-6"/> طلبات تحديث المنيو</h2>
        {stats.pendingProducts.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-[2rem] border-2 border-dashed">
                <CheckCircle className="h-10 w-10 mx-auto text-green-500/30 mb-3" />
                <p className="text-muted-foreground italic font-bold">كافة التحديثات في هذا الفرع تم تدقيقها.</p>
            </div>
        ) : (
            <div className="grid gap-4 md:grid-cols-2">
                {stats.pendingProducts.map(p => (
                    <Card key={p.id} className="rounded-2xl shadow-md border-none flex p-4 items-center gap-4 bg-white">
                        <div className="relative h-16 w-16 flex-shrink-0">
                            <Image src={p.image} fill className="object-cover rounded-xl border" alt="" unoptimized={true} />
                        </div>
                        <div className="flex-1 min-w-0 text-right">
                            <h3 className="font-black text-sm truncate">{p.name}</h3>
                            <div className="font-black text-primary text-xs">{formatCurrency(p.price)}</div>
                        </div>
                        <Button size="sm" className="bg-green-600 rounded-lg px-4" onClick={()=>approveProduct(p.id)}>نشر</Button>
                    </Card>
                ))}
            </div>
        )}
      </section>
    </div>
  );
}
