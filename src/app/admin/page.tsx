
"use client";

import { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { CheckCircle, Clock, TrendingUp, Package, AlertCircle } from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';
import { useOrders } from '@/hooks/useOrders';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

export default function AdminDashboard() {
  const { products, approveProduct, deleteProduct, isLoading: pLoading } = useProducts();
  const { allOrders, isLoading: oLoading } = useOrders();

  const stats = useMemo(() => {
    const delivered = allOrders.filter(o => o.status === 'delivered');
    return {
        totalRevenue: delivered.reduce((acc, o) => acc + o.total, 0),
        totalProfit: delivered.reduce((acc, o) => acc + o.profit, 0),
        pendingProducts: products.filter(p => p.status === 'pending'),
        activeOrders: allOrders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length
    }
  }, [allOrders, products]);

  if (pLoading || oLoading) return <div className="p-8 text-center animate-pulse">جار تحميل لوحة الإدارة...</div>;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-black text-primary">نظرة عامة</h1>
        <p className="text-muted-foreground font-bold">أداء سبيد شوب في الوقت الحالي.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="rounded-[1.5rem] border-none shadow-lg bg-primary text-white">
            <CardHeader className="pb-2"><CardTitle className="text-xs font-bold text-white/80">إجمالي المبيعات</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-black">{formatCurrency(stats.totalRevenue)}</div></CardContent>
        </Card>
        <Card className="rounded-[1.5rem] border-none shadow-lg">
            <CardHeader className="pb-2"><CardTitle className="text-xs font-bold text-muted-foreground">صافي أرباح التطبيق</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-black text-primary">{formatCurrency(stats.totalProfit)}</div></CardContent>
        </Card>
        <Card className="rounded-[1.5rem] border-none shadow-lg">
            <CardHeader className="pb-2"><CardTitle className="text-xs font-bold text-muted-foreground">طلبات جارية</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-black text-orange-500">{stats.activeOrders}</div></CardContent>
        </Card>
        <Card className="rounded-[1.5rem] border-none shadow-lg">
            <CardHeader className="pb-2"><CardTitle className="text-xs font-bold text-muted-foreground">منتجات بانتظار الموافقة</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-black text-blue-500">{stats.pendingProducts.length}</div></CardContent>
        </Card>
      </div>

      <section className="space-y-4">
        <div className="flex justify-between items-center px-1">
            <h2 className="text-2xl font-black flex items-center gap-2"><Clock className="text-blue-500"/> مراجعة سريعة</h2>
        </div>
        
        {stats.pendingProducts.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-[2rem] border-2 border-dashed">
                <CheckCircle className="h-10 w-10 mx-auto text-green-500 mb-3" />
                <p className="text-muted-foreground italic font-bold">لا يوجد منتجات تنتظر الموافقة حالياً.</p>
            </div>
        ) : (
            <div className="grid gap-4 md:grid-cols-2">
                {stats.pendingProducts.slice(0, 4).map(p => (
                    <Card key={p.id} className="rounded-2xl shadow-md border-none flex p-4 items-center gap-4 bg-white">
                        <div className="relative h-20 w-20 flex-shrink-0">
                            <Image src={p.image} fill className="object-cover rounded-xl" alt={p.name} unoptimized={true} />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold truncate max-w-[150px]">{p.name}</h3>
                            <div className="mt-1 font-black text-primary">{formatCurrency(p.price)}</div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <Button size="sm" className="bg-green-600 hover:bg-green-700 h-9 rounded-lg px-4" onClick={()=>approveProduct(p.id)}>قبول</Button>
                            <Button size="sm" variant="ghost" className="text-destructive h-9 rounded-lg" onClick={()=>deleteProduct(p.id)}>رفض</Button>
                        </div>
                    </Card>
                ))}
            </div>
        )}
      </section>
    </div>
  );
}
