
"use client";

import { useMemo, useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { CheckCircle, Clock, Building2, TrendingUp, ArrowRight } from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';
import { useOrders } from '@/hooks/useOrders';
import { useBranches } from '@/hooks/useBranches';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function AdminDashboard({ branchId }: { branchId: string }) {
  const { products, approveProduct, isLoading: pLoading } = useProducts(branchId);
  const { allOrders, isLoading: oLoading } = useOrders(branchId);
  const { branches, isLoading: bLoading } = useBranches();
  const router = useRouter();

  const [globalStats, setGlobalStats] = useState({ totalSales: 0, totalOrders: 0, totalProfit: 0 });
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);

  const isMain = branchId === 'main';

  // جلب إحصائيات النظام الشاملة لفرع المركز الرئيسي فقط
  useEffect(() => {
      if (isMain) {
          setIsGlobalLoading(true);
          const qOrders = query(collection(db, "orders"), orderBy("date", "desc"), limit(500));
          getDocs(qOrders).then(snap => {
              const orders = snap.docs.map(d => d.data());
              const delivered = orders.filter(o => o.status === 'delivered');
              setGlobalStats({
                  totalSales: delivered.reduce((acc, o) => acc + (o.total || 0), 0),
                  totalOrders: orders.length,
                  totalProfit: delivered.reduce((acc, o) => acc + (o.profit || 0), 0)
              });
            }).catch(() => {}).finally(() => setIsGlobalLoading(false));
      }
  }, [isMain]);

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
        <h1 className="text-4xl font-black text-primary">نظرة عامة</h1>
        <p className="text-muted-foreground font-bold italic">إدارة ومتابعة فرع: {branchId === 'main' ? 'المركز العام' : branchId}</p>
      </header>

      {isMain && (
          <div className="grid gap-4 md:grid-cols-3 mb-8">
              <Card className="rounded-[1.5rem] border-none shadow-xl bg-slate-900 text-white p-6 relative overflow-hidden">
                  <div className="absolute right-[-10px] bottom-[-10px] opacity-10"><TrendingUp className="h-20 w-20"/></div>
                  <div className="text-[10px] font-black text-primary uppercase mb-2">مبيعات كافة الفروع</div>
                  <div className="text-3xl font-black">{formatCurrency(globalStats.totalSales)}</div>
              </Card>
              <Card className="rounded-[1.5rem] border-none shadow-xl bg-slate-900 text-white p-6">
                  <div className="text-[10px] font-black text-blue-400 uppercase mb-2">إجمالي الطلبات الكلية</div>
                  <div className="text-3xl font-black">{globalStats.totalOrders} <span className="text-xs text-white/50">طلب</span></div>
              </Card>
              <Card className="rounded-[1.5rem] border-none shadow-xl bg-slate-900 text-white p-6">
                  <div className="text-[10px] font-black text-green-400 uppercase mb-2">صافي العمولات الكلية</div>
                  <div className="text-3xl font-black">{formatCurrency(globalStats.totalProfit)}</div>
              </Card>
          </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="rounded-[1.5rem] border-none shadow-lg bg-primary text-white p-5">
            <div className="text-[10px] font-black text-white/70 uppercase">مبيعات هذا الفرع</div>
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

      {isMain && (
          <section className="space-y-4">
              <h2 className="text-2xl font-black flex items-center gap-2 px-1"><Building2 className="text-primary"/> إدارة فروع المحافظات</h2>
              <div className="grid gap-4 md:grid-cols-3">
                  {branches.map(b => (
                      <Card key={b.id} className="rounded-2xl border-none shadow-md hover:shadow-xl transition-all group overflow-hidden bg-white">
                          <div className="p-6">
                              <h3 className="text-xl font-black">{b.name}</h3>
                              <p className="text-xs text-muted-foreground font-bold mb-4">{b.locationName}</p>
                              <Button 
                                className="w-full rounded-xl font-bold gap-2" 
                                onClick={() => router.push(`/admin?branch=${b.id}`)}
                              >
                                دخول الفرع <ArrowRight className="h-4 w-4"/>
                              </Button>
                          </div>
                      </Card>
                  ))}
              </div>
          </section>
      )}

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
                        <div className="flex-1 min-w-0">
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
