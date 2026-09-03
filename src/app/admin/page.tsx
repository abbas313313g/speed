
"use client";

import { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { CheckCircle, Clock, Building2, TrendingUp, Calendar, Wallet } from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';
import { useOrders } from '@/hooks/useOrders';
import { useBranches } from '@/hooks/useBranches';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Image from 'next/image';

export default function AdminDashboard({ branchId }: { branchId: string }) {
  // جلب البيانات مع الفلترة الذكية المدمجة في الهوك
  const { products, approveProduct, isLoading: pLoading } = useProducts(branchId, undefined, 500, undefined, '', true);
  const { allOrders, isLoading: oLoading } = useOrders(branchId);
  const { branches } = useBranches();
  
  const isMain = branchId === 'main';

  const stats = useMemo(() => {
    // البيانات تأتي مفلترة وجاهزة من الهوك حسب branchId
    const currentBranchOrders = allOrders;
    
    const delivered = currentBranchOrders.filter(o => o.status === 'delivered');
    const cancelled = currentBranchOrders.filter(o => o.status === 'cancelled');
    
    const today = new Date();
    today.setHours(0,0,0,0);
    const deliveredToday = delivered.filter(o => new Date(o.date) >= today);

    // حساب أرباح هذا الفرع حصراً
    let branchDailyProfit = 0;
    deliveredToday.forEach(order => {
        const itemsPrice = order.items.reduce((sum, i) => {
            const price = i.selectedSize?.price || i.product.discountPrice || i.product.price || 0;
            return sum + (price * i.quantity);
        }, 0);
        const rate = order.restaurant?.commissionRate ?? 10;
        branchDailyProfit += (itemsPrice * rate) / 100;
    });

    // للمركز الرئيسي فقط: جرد أرباح كل الفروع
    const allBranchProfits: {[key: string]: number} = { 'main': 0 };
    branches.forEach(b => { allBranchProfits[b.id] = 0; });

    if (isMain) {
        deliveredToday.forEach(order => {
            const itemsPrice = order.items.reduce((sum, i) => {
                const price = i.selectedSize?.price || i.product.discountPrice || i.product.price || 0;
                return sum + (price * i.quantity);
            }, 0);
            const bId = order.branchId || 'main';
            const rate = order.restaurant?.commissionRate ?? 10;
            allBranchProfits[bId] = (allBranchProfits[bId] || 0) + ((itemsPrice * rate) / 100);
        });
    }

    const totalRevenue = delivered.reduce((acc, o) => acc + (o.total || 0), 0);

    return {
        totalRevenue,
        branchDailyProfit,
        allBranchProfits,
        pendingProducts: products.filter(p => p.status === 'pending'),
        activeOrders: currentBranchOrders.filter(o => !['delivered', 'cancelled', 'unassigned'].includes(o.status)).length,
        cancelledCount: cancelled.length,
        branchesSummary: branches.map(b => ({
            name: b.name,
            id: b.id,
            profit: allBranchProfits[b.id] || 0
        })).concat([{ name: 'فرع المركز العام', id: 'main', profit: allBranchProfits['main'] || 0 }])
    };
  }, [allOrders, products, branches, isMain]);

  if (pLoading || oLoading) return (
      <div className="p-20 text-center flex flex-col items-center gap-4">
          <TrendingUp className="h-12 w-12 text-primary animate-bounce" />
          <p className="font-black text-primary animate-pulse text-xl">جاري جلب إحصائيات الفرع...</p>
      </div>
  );
  
  return (
    <div className="space-y-8 animate-in fade-in duration-500 text-right" dir="rtl">
      <header>
        <h1 className="text-4xl font-black text-primary italic leading-none">لوحة القيادة</h1>
        <p className="text-muted-foreground font-bold mt-1">متابعة فرع: {isMain ? 'المركز العام' : (branches.find(b=>b.id === branchId)?.name || branchId)}</p>
      </header>

      {isMain && (
          <section className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                  <Card className="rounded-[1.5rem] border-none shadow-xl bg-slate-900 text-white p-6 relative overflow-hidden">
                      <div className="absolute right-[-10px] bottom-[-10px] opacity-10"><Calendar className="h-20 w-20"/></div>
                      <div className="text-[10px] font-black text-primary uppercase mb-2 tracking-widest">صافي أرباح كافة الفروع (اليوم)</div>
                      <div className="text-4xl font-black text-green-400 tracking-tighter">
                          {formatCurrency(Object.values(stats.allBranchProfits).reduce((a,b)=>a+b, 0))}
                      </div>
                  </Card>
                  <Card className="rounded-[1.5rem] border-none shadow-xl bg-primary text-white p-6">
                      <div className="text-[10px] font-black text-white/70 uppercase mb-2 tracking-widest">أرباح الفرع الرئيسي (اليوم)</div>
                      <div className="text-3xl font-black">{formatCurrency(stats.branchDailyProfit)}</div>
                  </Card>
              </div>

              <div className="space-y-4">
                  <h2 className="text-xl font-black flex items-center gap-2 px-1 justify-end text-slate-800">تحليل أداء الفروع <TrendingUp className="h-5 w-5 text-primary"/></h2>
                  <Card className="rounded-[2rem] border-none shadow-xl overflow-hidden bg-white">
                      <Table>
                          <TableHeader className="bg-muted/50">
                              <TableRow>
                                  <TableHead className="font-black text-right">الفرع</TableHead>
                                  <TableHead className="font-black text-center">أرباح اليوم</TableHead>
                                  <TableHead className="font-black text-center">الحالة</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {stats.branchesSummary.sort((a,b) => b.profit - a.profit).map(b => (
                                  <TableRow key={b.id}>
                                      <TableCell className="font-bold flex items-center gap-2 justify-end">
                                          {b.name}
                                          <div className="p-2 bg-primary/5 rounded-lg"><Building2 className="h-4 w-4 text-primary"/></div>
                                      </TableCell>
                                      <TableCell className="text-center font-black text-lg text-primary">{formatCurrency(b.profit)}</TableCell>
                                      <TableCell className="text-center">
                                          <Badge className="bg-green-100 text-green-700 border-none text-[10px] font-black">نشط الآن</Badge>
                                      </TableCell>
                                  </TableRow>
                              ))}
                          </TableBody>
                      </Table>
                  </Card>
              </div>
          </section>
      )}

      {!isMain && (
          <Card className="rounded-[1.5rem] border-none shadow-xl bg-slate-900 text-white p-6 overflow-hidden relative">
              <div className="absolute right-[-10px] bottom-[-10px] opacity-10"><Wallet className="h-20 w-20"/></div>
              <div className="text-[10px] font-black text-primary uppercase mb-2 tracking-widest">صافي أرباح الفرع (اليوم)</div>
              <div className="text-4xl font-black text-green-400 tracking-tighter">{formatCurrency(stats.branchDailyProfit)}</div>
          </Card>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="rounded-[1.5rem] border-none shadow-lg bg-white p-5 border-r-4 border-r-primary">
            <div className="text-[10px] font-black text-muted-foreground uppercase">كاش الفرع (المستلم)</div>
            <div className="text-2xl font-black mt-1 text-primary">{formatCurrency(stats.totalRevenue)}</div>
        </Card>
        <Card className="rounded-[1.5rem] border-none shadow-lg bg-white p-5 border-r-4 border-r-orange-500">
            <div className="text-[10px] font-black text-muted-foreground uppercase">طلبات نشطة</div>
            <div className="text-2xl font-black text-orange-500 mt-1">{stats.activeOrders}</div>
        </Card>
        <Card className="rounded-[1.5rem] border-none shadow-lg bg-white p-5 border-r-4 border-r-red-500">
            <div className="text-[10px] font-black text-muted-foreground uppercase">الملغية</div>
            <div className="text-2xl font-black text-red-500 mt-1">{stats.cancelledCount}</div>
        </Card>
        <Card className="rounded-[1.5rem] border-none shadow-lg bg-white p-5 border-r-4 border-r-blue-500">
            <div className="text-[10px] font-black text-muted-foreground uppercase">مراجعة الوجبات</div>
            <div className="text-2xl font-black text-blue-500 mt-1">{stats.pendingProducts.length}</div>
        </Card>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-black flex items-center gap-2 px-1 text-blue-500 justify-end"><Clock className="h-6 w-6"/> تحديثات المنيو المعلقة</h2>
        {stats.pendingProducts.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-[2rem] border-2 border-dashed">
                <CheckCircle className="h-10 w-10 mx-auto text-green-500/30 mb-3" />
                <p className="text-muted-foreground italic font-bold">كافة المنتجات تم تدقيقها ونشرها.</p>
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
