
"use client";

import { useMemo } from 'react';
import { useRestaurants } from '@/hooks/useRestaurants';
import { useOrders } from '@/hooks/useOrders';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, cn } from '@/lib/utils';
import Image from 'next/image';
import { Landmark, Loader2, Store, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function AdminStoreWalletsPage({ branchId }: { branchId: string }) {
  const { restaurants, isLoading: rLoading } = useRestaurants(branchId);
  const { allOrders, isLoading: oLoading } = useOrders(branchId);

  const storeWallets = useMemo(() => {
    if (rLoading || oLoading) return [];
    
    // جلب متاجر هذا الفرع فقط
    const branchStores = restaurants.filter(r => r.branchId === branchId);
    
    return branchStores.map(store => {
        // الطلبات التي تم توصيلها ولم تُدفع للمتجر بعد
        const myUnpaidOrders = allOrders.filter(o => 
            o.restaurant?.id === store.id && 
            o.status === 'delivered' && 
            !o.isPaid
        );

        const income = myUnpaidOrders.reduce((acc, order) => {
            const itemsPrice = order.items.reduce((sum, i) => {
                const basePrice = i.selectedSize?.price ?? i.product.price ?? 0;
                return sum + (basePrice * i.quantity);
            }, 0);
            
            const commission = (itemsPrice * (store.commissionRate / 100));
            return acc + (itemsPrice - commission);
        }, 0);

        const currentBalance = Math.max(0, income + (store.balanceAdjustment || 0));

        return {
            store,
            balance: currentBalance,
            unpaidOrdersCount: myUnpaidOrders.length
        };
    }).sort((a, b) => b.balance - a.balance);
  }, [restaurants, allOrders, branchId, rLoading, oLoading]);

  if (rLoading || oLoading) return <div className="p-20 text-center animate-pulse"><Loader2 className="h-10 w-10 animate-spin text-primary mx-auto"/><p className="mt-4 font-black text-primary">جاري جرد محافظ المتاجر...</p></div>;

  return (
    <div className="space-y-8 text-right animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-black text-primary italic">محفظات المتاجر</h1>
        <p className="text-muted-foreground font-bold">عرض أرصدة أصحاب المتاجر المتاحة للسحب حالياً.</p>
      </header>

      <div className="grid gap-6">
          {storeWallets.length === 0 ? (
              <div className="p-20 text-center bg-white rounded-[3rem] border-2 border-dashed">
                  <Store className="h-16 w-16 mx-auto text-muted-foreground/20 mb-4" />
                  <p className="text-xl font-black text-muted-foreground">لا توجد متاجر نشطة في هذا الفرع.</p>
              </div>
          ) : (
              <Card className="rounded-[2rem] border-none shadow-xl overflow-hidden bg-white">
                  <Table>
                      <TableHeader className="bg-muted/50 h-14">
                          <TableRow>
                              <TableHead className="font-black text-right">المتجر</TableHead>
                              <TableHead className="font-black text-center">العمولة</TableHead>
                              <TableHead className="font-black text-center">الطلبات المعلقة</TableHead>
                              <TableHead className="font-black text-left">الرصيد المتاح</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {storeWallets.map(({ store, balance, unpaidOrdersCount }) => (
                              <TableRow key={store.id} className="h-20 hover:bg-primary/5 transition-colors">
                                  <TableCell className="font-bold">
                                      <div className="flex items-center gap-3 justify-end">
                                          <div className="text-right">
                                              <p className="font-black text-slate-800">{store.name}</p>
                                              <p className="text-[9px] text-muted-foreground font-bold">{store.restaurantNumber}</p>
                                          </div>
                                          <div className="relative h-10 w-10 shrink-0">
                                              <Image src={store.image} fill className="rounded-full object-cover border-2 border-primary/10" alt="" unoptimized={true}/>
                                          </div>
                                      </div>
                                  </TableCell>
                                  <TableCell className="text-center">
                                      <Badge variant="outline" className="font-bold border-primary/20 text-primary">{store.commissionRate}%</Badge>
                                  </TableCell>
                                  <TableCell className="text-center font-bold">
                                      {unpaidOrdersCount > 0 ? (
                                          <Badge className="bg-orange-500 text-white border-none">{unpaidOrdersCount} طلب</Badge>
                                      ) : '-'}
                                  </TableCell>
                                  <TableCell className="text-left">
                                      <div className="flex flex-col items-start">
                                          <span className={cn("text-2xl font-black tracking-tighter", balance > 0 ? "text-primary" : "text-slate-300")}>
                                              {formatCurrency(balance)}
                                          </span>
                                          {balance > 0 && <span className="text-[8px] font-bold text-muted-foreground italic">صافي الربح المتاح</span>}
                                      </div>
                                  </TableCell>
                              </TableRow>
                          ))}
                      </TableBody>
                  </Table>
              </Card>
          )}
      </div>

      <div className="p-6 bg-primary/5 rounded-[2.5rem] border-2 border-dashed border-primary/20">
          <div className="flex items-center gap-3 justify-end text-primary mb-2">
              <span className="font-black">ملاحظة المحاسبة</span>
              <Landmark className="h-5 w-5"/>
          </div>
          <p className="text-xs font-bold text-slate-600 text-right leading-relaxed">
              هذا الرصيد يتم تصفيره تلقائياً بمجرد قيامك بتأكيد عملية السحب من قسم "سحب الأرصدة". المبلغ الظاهر هو ثمن الوجبات ناقصاً عمولة المنصة فقط، ولا يتأثر بأكواد الخصم التي تتحملها الشركة.
          </p>
      </div>
    </div>
  );
}
