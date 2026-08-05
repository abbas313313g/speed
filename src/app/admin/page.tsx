
"use client";

import { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { CheckCircle, Clock, Building2, TrendingUp, ArrowRight } from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';
import { useOrders } from '@/hooks/useOrders';
import { useBranches } from '@/hooks/useBranches';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function AdminDashboard({ branchId }: { branchId: string }) {
  const { products, approveProduct, deleteProduct, isLoading: pLoading } = useProducts(branchId);
  const { allOrders, isLoading: oLoading } = useOrders(branchId);
  const { branches, isLoading: bLoading } = useBranches();
  const router = useRouter();

  const isMain = branchId === 'main';

  const stats = useMemo(() => {
    const delivered = allOrders.filter(o => o.status === 'delivered');
    return {
        totalRevenue: delivered.reduce((acc, o) => acc + o.total, 0),
        totalProfit: delivered.reduce((acc, o) => acc + o.profit, 0),
        pendingProducts: products.filter(p => p.status === 'pending'),
        activeOrders: allOrders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length
    }
  }, [allOrders, products]);

  if (pLoading || oLoading || bLoading) return <div className="p-8 text-center animate-pulse font-black text-primary">جارِ جلب بيانات الفرع...</div>;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-black text-primary">إحصائيات {isMain ? 'المدحتية' : 'الفرع'}</h1>
        <p className="text-muted-foreground font-bold">متابعة الأداء العملياتي لفرع: {branchId === 'main' ? 'المدحتية' : branchId}</p>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="rounded-[1.5rem] border-none shadow-lg bg-primary text-white overflow-hidden relative">
            <div className="absolute right-[-10px] top-[-10px] opacity-10"><TrendingUp className="h-24 w-24" /></div>
            <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase text-white/70">مبيعات الفرع</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-black">{formatCurrency(stats.totalRevenue)}</div></CardContent>
        </Card>
        <Card className="rounded-[1.5rem] border-none shadow-lg bg-white">
            <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase text-muted-foreground">أرباح الفرع الصافية</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-black text-primary">{formatCurrency(stats.totalProfit)}</div></CardContent>
        </Card>
        <Card className="rounded-[1.5rem] border-none shadow-lg bg-white">
            <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase text-muted-foreground">طلبات نشطة</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-black text-orange-500">{stats.activeOrders}</div></CardContent>
        </Card>
        <Card className="rounded-[1.5rem] border-none shadow-lg bg-white">
            <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase text-muted-foreground">بانتظار الموافقة</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-black text-blue-500">{stats.pendingProducts.length}</div></CardContent>
        </Card>
      </div>

      {isMain && (
          <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
                                دخول الفرع (رابط مستقل) <ArrowRight className="h-4 w-4"/>
                              </Button>
                          </div>
                      </Card>
                  ))}
                  {branches.length === 0 && <p className="text-center py-10 col-span-full italic text-muted-foreground font-bold">لم يتم إنشاء أي فروع فرعية بعد.</p>}
              </div>
          </section>
      )}

      <section className="space-y-4">
        <h2 className="text-2xl font-black flex items-center gap-2 px-1 text-blue-500"><Clock className="h-6 w-6"/> تعديلات المتاجر المعلقة</h2>
        {stats.pendingProducts.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-[2rem] border-2 border-dashed">
                <CheckCircle className="h-10 w-10 mx-auto text-green-500 mb-3" />
                <p className="text-muted-foreground italic font-bold">كافة التعديلات في هذا الفرع تمت مراجعتها.</p>
            </div>
        ) : (
            <div className="grid gap-4 md:grid-cols-2">
                {stats.pendingProducts.slice(0, 4).map(p => (
                    <Card key={p.id} className="rounded-2xl shadow-md border-none flex p-4 items-center gap-4 bg-white transition-all hover:scale-[1.02]">
                        <div className="relative h-20 w-20 flex-shrink-0">
                            <Image src={p.image} fill className="object-cover rounded-xl" alt={p.name} unoptimized={true} />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold truncate max-w-[150px]">{p.name}</h3>
                            <div className="mt-1 font-black text-primary">{formatCurrency(p.price)}</div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <Button size="sm" className="bg-green-600 hover:bg-green-700 h-9 rounded-lg px-4 font-black" onClick={()=>approveProduct(p.id)}>قبول</Button>
                        </div>
                    </Card>
                ))}
            </div>
        )}
      </section>
    </div>
  );
}
