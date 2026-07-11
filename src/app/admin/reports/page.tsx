
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
import type { Restaurant } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { useRestaurants } from '@/hooks/useRestaurants';
import { useOrders } from '@/hooks/useOrders';
import { Button } from '@/components/ui/button';
import { doc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

interface StoreWallet {
    restaurant: Restaurant;
    totalSales: number; // مبيعات المنتجات
    officeCommission: number; // حصة الشركة
    netToStore: number; // الصافي للمتجر
    orderCount: number;
    unpaidOrderIds: string[];
}

export default function AdminReportsPage() {
  const { restaurants, isLoading: rLoading } = useRestaurants();
  const { allOrders, isLoading: oLoading } = useOrders();
  const { toast } = useToast();

  const storeWallets: StoreWallet[] = useMemo(() => {
    if (rLoading || oLoading) return [];
    return restaurants.map(r => {
        const myOrders = allOrders.filter(o => o.restaurant?.id === r.id && o.status === 'delivered' && !o.isPaid);
        const totalSales = myOrders.reduce((acc, o) => {
             const itemsPrice = o.items.reduce((sum, i) => sum + ((i.selectedSize?.price ?? i.product.discountPrice ?? i.product.price) * i.quantity), 0);
             return acc + itemsPrice;
        }, 0);
        const commission = (totalSales * (r.commissionRate || 0)) / 100;
        return {
            restaurant: r,
            totalSales,
            officeCommission: commission,
            netToStore: totalSales - commission,
            orderCount: myOrders.length,
            unpaidOrderIds: myOrders.map(o => o.id),
        };
    }).filter(w => w.orderCount > 0).sort((a,b) => b.totalSales - a.totalSales);
  }, [restaurants, allOrders, rLoading, oLoading]);

  const handleSettle = async (ids: string[]) => {
      if (ids.length === 0) return;
      const batch = writeBatch(db);
      ids.forEach(id => batch.update(doc(db, "orders", id), { isPaid: true }));
      await batch.commit();
      toast({ title: "تم تسوية حساب المتجر ومسح السجل" });
  }

  if (rLoading || oLoading) return <div className="p-8 text-center animate-pulse">جار جلب التقارير المالية...</div>;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-black text-primary">تسوية حسابات المتاجر</h1>
        <p className="text-muted-foreground">إدارة مستحقات المتاجر وعمولات الشركة.</p>
      </header>

      {storeWallets.length === 0 ? <p className="text-center text-muted-foreground py-20 font-bold italic">لا توجد حسابات معلقة للمتاجر.</p> : 
      <Card className="rounded-[2rem] border-none shadow-2xl overflow-hidden">
        <Table>
            <TableHeader className="bg-muted/50">
            <TableRow>
                <TableHead className="font-black">المتجر</TableHead>
                <TableHead className="font-black">إجمالي المبيعات</TableHead>
                <TableHead className="font-black">عمولة الشركة ({(storeWallets[0]?.restaurant.commissionRate || 0)}%)</TableHead>
                <TableHead className="font-black">الصافي للمتجر</TableHead>
                <TableHead className="font-black text-center">إجراء</TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
            {storeWallets.map((w) => (
                <TableRow key={w.restaurant.id}>
                    <TableCell>
                        <div className="flex items-center gap-3">
                            <Image src={w.restaurant.image} alt={w.restaurant.name} width={40} height={40} className="rounded-lg object-cover" unoptimized={true} />
                            <span className="font-bold">{w.restaurant.name}</span>
                        </div>
                    </TableCell>
                    <TableCell className="font-bold">{formatCurrency(w.totalSales)}</TableCell>
                    <TableCell className="font-black text-primary">{formatCurrency(w.officeCommission)}</TableCell>
                    <TableCell className="font-black text-green-600">{formatCurrency(w.netToStore)}</TableCell>
                    <TableCell className="text-center">
                        <Button size="sm" className="rounded-xl font-bold px-4" onClick={()=>handleSettle(w.unpaidOrderIds)}>تسوية الحساب</Button>
                    </TableCell>
                </TableRow>
            ))}
            </TableBody>
        </Table>
      </Card>}
    </div>
  );
}
