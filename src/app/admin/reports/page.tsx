
"use client";

import { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { useRestaurants } from '@/hooks/useRestaurants';
import { useOrders } from '@/hooks/useOrders';
import { TrendingUp, Building2, Loader2 } from 'lucide-react';

export default function AdminReportsPage({ branchId }: { branchId: string }) {
  const { restaurants, isLoading: rLoading } = useRestaurants(branchId);
  const { allOrders, isLoading: oLoading } = useOrders(branchId);

  const stats = useMemo(() => {
    if (rLoading || oLoading) return { totalSales: 0, companyEarnings: 0, storePayouts: 0 };
    
    // فلترة للفرع الحالي فقط لضمان دقة التقارير
    const branchOrders = allOrders.filter(o => o.branchId === branchId && o.status === 'delivered');
    
    let totalSales = 0;
    let companyEarnings = 0;

    branchOrders.forEach(order => {
        const itemsPrice = order.items.reduce((sum, i) => {
            const price = i.selectedSize?.price || i.product.discountPrice || i.product.price || 0;
            return sum + (price * i.quantity);
        }, 0);
        
        const commissionRate = order.restaurant?.commissionRate || 10;
        const commission = (itemsPrice * commissionRate) / 100;
        
        totalSales += itemsPrice;
        companyEarnings += commission;
    });

    return {
        totalSales,
        companyEarnings,
        storePayouts: totalSales - companyEarnings
    };
  }, [allOrders, branchId, rLoading, oLoading]);

  if (rLoading || oLoading) return <div className="p-20 text-center animate-pulse font-black text-primary">جارِ تحليل السجلات المالية للفرع...</div>;

  return (
    <div className="space-y-8 text-right animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-black text-primary italic">كشف العمولات (الوجبات فقط)</h1>
        <p className="text-muted-foreground font-bold">هذا الكشف لا يشمل أجور التوصيل لضمان دقة صافي أرباح المتاجر.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-[1.5rem] border-none shadow-xl bg-slate-900 text-white p-6">
              <div className="text-[10px] font-black text-primary uppercase mb-2">إجمالي مبيعات الوجبات</div>
              <div className="text-3xl font-black">{formatCurrency(stats.totalSales)}</div>
          </Card>
          <Card className="rounded-[1.5rem] border-none shadow-xl bg-primary text-white p-6">
              <div className="text-[10px] font-black text-white/70 uppercase mb-2">صافي عمولات النظام</div>
              <div className="text-3xl font-black">{formatCurrency(stats.companyEarnings)}</div>
          </Card>
          <Card className="rounded-[1.5rem] border-none shadow-xl bg-white p-6 border-r-4 border-r-orange-500">
              <div className="text-[10px] font-black text-muted-foreground uppercase mb-2">إجمالي مستحقات المتاجر</div>
              <div className="text-3xl font-black text-slate-800">{formatCurrency(stats.storePayouts)}</div>
          </Card>
      </div>

      <section className="space-y-4">
          <h2 className="text-xl font-black flex items-center gap-2 px-1 justify-end">أداء المتاجر المالي <Building2 className="text-primary h-5 w-5"/></h2>
          <Card className="rounded-[2rem] border-none shadow-xl overflow-hidden bg-white">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="font-black text-right">المتجر</TableHead>
                            <TableHead className="font-black text-center">العمولة</TableHead>
                            <TableHead className="font-black text-center">صافي المبيعات</TableHead>
                            <TableHead className="font-black text-center text-primary">ربح النظام</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {restaurants.filter(r => r.branchId === branchId).map(r => {
                            const myOrders = allOrders.filter(o => o.restaurant?.id === r.id && o.status === 'delivered');
                            const sales = myOrders.reduce((acc, o) => {
                                return acc + o.items.reduce((sum, i) => {
                                    const price = i.selectedSize?.price || i.product.discountPrice || i.product.price || 0;
                                    return sum + (price * i.quantity);
                                }, 0);
                            }, 0);
                            const earnings = (sales * (r.commissionRate || 10)) / 100;
                            return (
                                <TableRow key={r.id}>
                                    <TableCell className="font-bold flex items-center gap-3 justify-end">
                                        <span>{r.name}</span>
                                        <div className="relative h-8 w-8"><Image src={r.image} fill className="rounded-full object-cover border" alt="" unoptimized={true}/></div>
                                    </TableCell>
                                    <TableCell className="text-center font-bold text-muted-foreground">{r.commissionRate}%</TableCell>
                                    <TableCell className="text-center font-black">{formatCurrency(sales)}</TableCell>
                                    <TableCell className="text-center font-black text-primary">{formatCurrency(earnings)}</TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
          </Card>
      </section>
    </div>
  );
}
