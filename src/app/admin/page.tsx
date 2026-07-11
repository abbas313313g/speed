
"use client";

import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { CheckCircle, Clock, Package, AlertCircle, ShoppingCart, TrendingUp } from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';
import { useOrders } from '@/hooks/useOrders';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
            <CardHeader className="pb-2"><CardTitle className="text-xs font-bold text-muted-foreground">منتجات تنتظر الموافقة</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-black text-blue-500">{stats.pendingProducts.length}</div></CardContent>
        </Card>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-black flex items-center gap-2"><Clock className="text-blue-500"/> منتجات معلقة للموافقة</h2>
        <div className="grid gap-4 md:grid-cols-2">
            {stats.pendingProducts.length === 0 ? <p className="text-muted-foreground italic font-bold">لا يوجد منتجات تنتظر الموافقة حالياً.</p> : 
            stats.pendingProducts.map(p => (
                <Card key={p.id} className="rounded-2xl shadow-md border-none flex p-4 items-center gap-4">
                    <div className="relative h-20 w-20 flex-shrink-0">
                        <Image src={p.image} fill className="object-cover rounded-xl" alt={p.name} unoptimized={true} />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold">{p.name}</h3>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">{p.description}</p>
                        <div className="mt-1 font-black text-primary">{formatCurrency(p.price)}</div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 h-9 rounded-lg" onClick={()=>approveProduct(p.id)}><CheckCircle className="h-4 w-4 ml-1"/> قبول</Button>
                        <Button size="sm" variant="ghost" className="text-destructive h-9 rounded-lg" onClick={()=>deleteProduct(p.id)}>رفض</Button>
                    </div>
                </Card>
            ))}
        </div>
      </section>
    </div>
  );
}
