"use client";

import { useMemo } from 'react';
import { useRestaurants } from '@/hooks/useRestaurants';
import { useOrders } from '@/hooks/useOrders';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, cn } from '@/lib/utils';
import Image from 'next/image';
import { Landmark, Loader2, Store, Wallet, Printer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Restaurant, Order } from '@/lib/types';

export default function AdminStoreWalletsPage({ branchId }: { branchId: string }) {
  const { restaurants, isLoading: rLoading } = useRestaurants(branchId);
  const { allOrders, isLoading: oLoading } = useOrders(branchId);

  const storeWallets = useMemo(() => {
    if (rLoading || oLoading) return [];
    
    const branchStores = restaurants.filter(r => r.branchId === branchId);
    
    return branchStores.map(store => {
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
            unpaidOrdersCount: myUnpaidOrders.length,
            unpaidOrders: myUnpaidOrders
        };
    }).sort((a, b) => b.balance - a.balance);
  }, [restaurants, allOrders, branchId, rLoading, oLoading]);

  const handlePrintStoreReport = (storeData: any) => {
    const { store, balance, unpaidOrders } = storeData;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const ordersHtml = unpaidOrders.map((o: Order) => `
        <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px;">#${o.orderNumber}</td>
            <td style="padding: 10px;">${new Date(o.date).toLocaleDateString('ar-IQ')}</td>
            <td style="padding: 10px;">${formatCurrency(o.total)}</td>
            <td style="padding: 10px; font-weight: bold;">${o.address.name}</td>
        </tr>
    `).join('');

    const htmlContent = `
        <html dir="rtl">
        <head>
            <title>كشف حساب - ${store.name}</title>
            <style>
                body { font-family: 'Arial', sans-serif; padding: 40px; color: #333; }
                .header { text-align: center; border-bottom: 4px solid #00b358; padding-bottom: 20px; margin-bottom: 30px; }
                .store-info { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
                .balance-box { background: #f0fff4; border: 2px solid #00b358; padding: 20px; border-radius: 15px; text-align: center; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th { background: #f8f9fa; padding: 12px; text-align: right; border-bottom: 2px solid #eee; }
                .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #eee; pt: 20px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1 style="color: #00b358; margin: 0;">SPEED SHOP</h1>
                <p>نظام إدارة المتاجر والطلبات</p>
            </div>
            
            <div class="store-info">
                <div>
                    <h2 style="margin: 0;">${store.name}</h2>
                    <p style="color: #666;">رقم المتجر: ${store.restaurantNumber}</p>
                </div>
                <div class="balance-box">
                    <p style="margin: 0; font-size: 14px; font-weight: bold;">الرصيد المتاح للسحب</p>
                    <h1 style="margin: 5px 0; color: #00b358;">${formatCurrency(balance)}</h1>
                </div>
            </div>

            <h3>تفاصيل الطلبات غير المسواة (${unpaidOrders.length} طلب)</h3>
            <table>
                <thead>
                    <tr>
                        <th>رقم الطلب</th>
                        <th>التاريخ</th>
                        <th>إجمالي الفاتورة</th>
                        <th>اسم الزبون</th>
                    </tr>
                </thead>
                <tbody>
                    ${ordersHtml}
                </tbody>
            </table>

            <div class="footer">
                <p>تم استخراج هذا الكشف آلياً بتاريخ ${new Date().toLocaleString('ar-IQ')}</p>
                <p>حقوق المراجعة محفوظة لشركة سبيد شوب</p>
            </div>
            <script>window.print();</script>
        </body>
        </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  if (rLoading || oLoading) return <div className="p-20 text-center animate-pulse"><Loader2 className="h-10 w-10 animate-spin text-primary mx-auto"/><p className="mt-4 font-black text-primary">جاري جرد محافظ المتاجر...</p></div>;

  return (
    <div className="space-y-8 text-right animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-black text-primary italic">محفظات المتاجر</h1>
        <p className="text-muted-foreground font-bold">عرض أرصدة أصحاب المتاجر وطباعة الكشوفات المالية المتاحة للسحب.</p>
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
                              <TableHead className="font-black text-center">الطلبات المعلقة</TableHead>
                              <TableHead className="font-black text-left">الرصيد المتاح</TableHead>
                              <TableHead className="font-black text-center">الإجراء</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {storeWallets.map((data) => (
                              <TableRow key={data.store.id} className="h-20 hover:bg-primary/5 transition-colors">
                                  <TableCell className="font-bold">
                                      <div className="flex items-center gap-3 justify-end">
                                          <div className="text-right">
                                              <p className="font-black text-slate-800">{data.store.name}</p>
                                              <p className="text-[9px] text-muted-foreground font-bold">{data.store.restaurantNumber}</p>
                                          </div>
                                          <div className="relative h-10 w-10 shrink-0">
                                              <Image src={data.store.image} fill className="rounded-full object-cover border-2 border-primary/10" alt="" unoptimized={true}/>
                                          </div>
                                      </div>
                                  </TableCell>
                                  <TableCell className="text-center font-bold">
                                      {data.unpaidOrdersCount > 0 ? (
                                          <Badge className="bg-orange-500 text-white border-none">{data.unpaidOrdersCount} طلب</Badge>
                                      ) : '-'}
                                  </TableCell>
                                  <TableCell className="text-left">
                                      <div className="flex flex-col items-start">
                                          <span className={cn("text-2xl font-black tracking-tighter", data.balance > 0 ? "text-primary" : "text-slate-300")}>
                                              {formatCurrency(data.balance)}
                                          </span>
                                          {data.balance > 0 && <span className="text-[8px] font-bold text-muted-foreground italic">صافي الربح المتاح</span>}
                                      </div>
                                  </TableCell>
                                  <TableCell className="text-center">
                                      <Button variant="outline" size="sm" className="rounded-xl font-bold gap-2 h-10 border-2" onClick={() => handlePrintStoreReport(data)} disabled={data.balance <= 0}>
                                          <Printer className="h-4 w-4" /> طباعة كشف
                                      </Button>
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
              هذا الرصيد يمثل فقط الأرباح التي لم تُدفع للمتجر بعد. زر الطباعة يولد لك كشفاً ورقياً مفصلاً بكافة أرقام القوائم وتواريخها لمطابقتها مع صاحب المتجر قبل إجراء عملية التسوية المالية.
          </p>
      </div>
    </div>
  );
}