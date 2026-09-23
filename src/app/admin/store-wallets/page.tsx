
"use client";

import { useMemo } from 'react';
import { useRestaurants } from '@/hooks/useRestaurants';
import { useOrders } from '@/hooks/useOrders';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, cn } from '@/lib/utils';
import Image from 'next/image';
import { Landmark, Loader2, Store, Printer, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function AdminStoreWalletsPage({ branchId }: { branchId: string }) {
  const { restaurants, isLoading: rLoading } = useRestaurants(branchId);
  const { allOrders } = useOrders(branchId);

  const sortedStores = useMemo(() => {
    return restaurants.filter(r => r.branchId === branchId).map(store => {
        const unpaidOrders = allOrders.filter(o => 
            o.restaurant?.id === store.id && 
            o.status === 'delivered' && 
            !o.isPaid
        );
        return {
            ...store,
            unpaidOrderCount: unpaidOrders.length
        };
    }).sort((a, b) => (b.walletBalance || 0) - (a.walletBalance || 0));
  }, [restaurants, allOrders, branchId]);

  const handlePrintStoreReport = (store: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
        <html dir="rtl">
        <head>
            <title>كشف حساب - ${store.name}</title>
            <style>
                body { font-family: 'Arial', sans-serif; padding: 40px; color: #333; }
                .header { text-align: center; border-bottom: 4px solid #00b358; padding-bottom: 20px; margin-bottom: 30px; }
                .balance-box { background: #f0fff4; border: 2px solid #00b358; padding: 30px; border-radius: 25px; text-align: center; margin: 40px 0; }
                .footer { margin-top: 100px; text-align: center; font-size: 14px; color: #888; border-top: 1px solid #eee; padding-top: 20px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1 style="color: #00b358; margin: 0;">SPEED SHOP</h1>
                <p>كشف المحفظة السحابية المعتمدة</p>
            </div>
            
            <div style="text-align: right;">
                <h2 style="margin: 0;">المتجر: ${store.name}</h2>
                <p>رقم المتجر: ${store.restaurantNumber}</p>
                <p>الفرع: ${store.branchId === 'main' ? 'المركز الرئيسي' : store.branchId}</p>
                <p>عدد الطلبات في هذا الكشف: ${store.unpaidOrderCount}</p>
                <p>آخر تصفية حساب: ${store.lastSettleAt ? new Date(store.lastSettleAt).toLocaleString('ar-IQ') : 'لا يوجد تصفية سابقة'}</p>
            </div>

            <div class="balance-box">
                <p style="margin: 0; font-size: 18px; font-weight: bold; color: #666;">إجمالي الرصيد الصافي المتاح للسحب</p>
                <h1 style="margin: 15px 0; font-size: 48px; color: #00b358;">${formatCurrency(store.walletBalance || 0)}</h1>
            </div>

            <p style="text-align: right; line-height: 1.6; color: #555;">
                ملاحظة: هذا الرصيد نهائي ومحفوظ سحابياً، يمثل صافي أرباح المتجر بعد خصم العمولات.
            </p>

            <div class="footer">
                <p>تاريخ الاستخراج: ${new Date().toLocaleString('ar-IQ')}</p>
                <p>حقوق النظام محفوظة © سبيد شوب</p>
            </div>
            <script>window.print();</script>
        </body>
        </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  if (rLoading) return <div className="p-20 text-center animate-pulse"><Loader2 className="h-10 w-10 animate-spin text-primary mx-auto"/><p className="mt-4 font-black text-primary">جاري جرد المحافظ السحابية...</p></div>;

  return (
    <div className="p-4 space-y-8 text-right h-full overflow-y-auto">
      <header>
        <h1 className="text-3xl font-black text-primary italic">محافظ المتاجر الدائمة</h1>
        <p className="text-muted-foreground font-bold italic text-xs">الأرصدة محفوظة سحابياً بشكل مستقل ولا تختفي بحذف الطلبات.</p>
      </header>

      <div className="grid gap-6 pb-20">
          {sortedStores.length === 0 ? (
              <div className="p-20 text-center bg-white rounded-[3rem] border-2 border-dashed">
                  <Store className="h-16 w-16 mx-auto text-muted-foreground/20 mb-4" />
                  <p className="text-xl font-black text-muted-foreground">لا توجد متاجر في هذا الفرع.</p>
              </div>
          ) : (
              <Card className="rounded-[2rem] border-none shadow-xl overflow-hidden bg-white">
                  <Table>
                      <TableHeader className="bg-muted/50 h-14">
                          <TableRow>
                              <TableHead className="font-black text-right">المتجر والتصفية</TableHead>
                              <TableHead className="font-black text-left">الرصيد والطلبات</TableHead>
                              <TableHead className="font-black text-center">إجراء</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {sortedStores.map((store) => (
                              <TableRow key={store.id} className="h-20 hover:bg-primary/5 transition-colors">
                                  <TableCell className="font-bold">
                                      <div className="flex items-center gap-3 justify-end">
                                          <div className="text-right">
                                              <p className="font-black text-slate-800 text-xs">{store.name}</p>
                                              <p className="text-[8px] text-muted-foreground font-bold">{store.restaurantNumber}</p>
                                              {store.lastSettleAt && (
                                                  <div className="flex items-center gap-1 justify-end text-[7px] font-bold text-green-600 mt-1">
                                                      <span>آخر تصفية: {new Date(store.lastSettleAt).toLocaleString('ar-IQ')}</span>
                                                      <Clock className="h-2 w-2"/>
                                                  </div>
                                              )}
                                          </div>
                                          <div className="relative h-9 w-9 shrink-0">
                                              <Image src={store.image} fill className="rounded-full object-cover border-2 border-primary/10" alt="" unoptimized={true}/>
                                          </div>
                                      </div>
                                  </TableCell>
                                  <TableCell className="text-left">
                                      <div className="flex flex-col items-start gap-1">
                                          <span className={cn("text-xl font-black tracking-tighter", (store.walletBalance || 0) > 0 ? "text-primary" : "text-slate-300")}>
                                              {formatCurrency(store.walletBalance || 0)}
                                          </span>
                                          <Badge variant="secondary" className="text-[8px] font-black h-4 px-2">{store.unpaidOrderCount} طلب</Badge>
                                      </div>
                                  </TableCell>
                                  <TableCell className="text-center">
                                      <Button variant="outline" size="sm" className="rounded-xl font-bold gap-2 h-9 border-2" onClick={() => handlePrintStoreReport(store)}>
                                          <Printer className="h-4 w-4" /> كشف
                                      </Button>
                                  </TableCell>
                              </TableRow>
                          ))}
                      </TableBody>
                  </Table>
              </Card>
          )}
      </div>

      <div className="p-5 bg-primary/5 rounded-[2rem] border-2 border-dashed border-primary/20 sticky bottom-4">
          <div className="flex items-center gap-2 justify-end text-primary mb-1">
              <span className="font-black text-sm">نظام الأمان المالي السحابي</span>
              <Landmark className="h-4 w-4"/>
          </div>
          <p className="text-[10px] font-bold text-slate-600 text-right leading-relaxed">
              يتم ترحيل الأرباح للمحفظة فور توصيل الطلب. حذف الفواتير القديمة لن يؤثر على رصيد المتجر نهائياً.
          </p>
      </div>
    </div>
  );
}
