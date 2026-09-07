
"use client";

import { useMemo, useState } from 'react';
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
import { TrendingUp, Building2, Loader2, Download, RotateCcw, ShieldCheck, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { doc, writeBatch } from 'firebase/firestore';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function AdminReportsPage({ branchId }: { branchId: string }) {
  const { restaurants, isLoading: rLoading } = useRestaurants(branchId);
  const { allOrders, isLoading: oLoading } = useOrders(branchId);
  const { toast } = useToast();
  const [isResetting, setIsResetting] = useState(false);

  const reportData = useMemo(() => {
    if (rLoading || oLoading) return { totalSales: 0, companyEarnings: 0, storePayouts: 0, totalDiscounts: 0, stores: [] };
    
    // فلترة للفرع الحالي والطلبات غير المؤرشفة فقط
    const branchOrders = allOrders.filter(o => 
        o.branchId === branchId && 
        o.status === 'delivered' && 
        !o.isArchived
    );
    
    let totalSales = 0;
    let companyEarnings = 0;
    let totalDiscounts = branchOrders.reduce((acc, o) => acc + (o.appliedCoupon?.discountAmount || 0), 0);

    const storeStats = restaurants.filter(r => r.branchId === branchId).map(r => {
        const myOrders = branchOrders.filter(o => o.restaurant?.id === r.id);
        const sales = myOrders.reduce((acc, o) => {
            return acc + o.items.reduce((sum, i) => {
                // نستخدم السعر الأصلي دائماً لحساب مستحقات المتجر ومبيعاته الكلية
                const price = i.selectedSize?.price || i.product.price || 0;
                return sum + (price * i.quantity);
            }, 0);
        }, 0);

        // حساب قيمة الخصم العام الذي تحملته الشركة لهذا المتجر
        const discountCost = myOrders.reduce((acc, o) => {
            const originalItemsTotal = o.items.reduce((sum, i) => sum + ((i.selectedSize?.price || i.product.price || 0) * i.quantity), 0);
            const customerItemsTotal = o.items.reduce((sum, i) => {
                const rest = restaurants.find(res => res.id === i.product.restaurantId);
                const gDisc = rest?.discountPercentage || 0;
                const getAdj = (p: number) => gDisc > 0 ? p * (1 - gDisc/100) : p;
                const p = i.selectedSize ? getAdj(i.selectedSize.price) : (i.product.discountPrice || getAdj(i.product.price));
                return sum + (p * i.quantity);
            }, 0);
            return acc + (originalItemsTotal - customerItemsTotal);
        }, 0);

        const commission = (sales * (r.commissionRate || 10)) / 100;
        
        totalSales += sales;
        companyEarnings += (commission - discountCost);
        totalDiscounts += discountCost;

        return {
            id: r.id,
            name: r.name,
            image: r.image,
            commissionRate: r.commissionRate,
            sales,
            earnings: commission - discountCost
        };
    });

    return {
        totalSales,
        companyEarnings,
        storePayouts: totalSales - (totalSales * 0.1), // تبسيط للعرض فقط
        totalDiscounts,
        stores: storeStats
    };
  }, [allOrders, branchId, rLoading, oLoading, restaurants]);

  const handleExportCSV = () => {
    if (reportData.stores.length === 0) return;

    const headers = ["المتجر", "نسبة العمولة", "إجمالي مبيعات الوجبات (الأصلي)", "صافي ربح النظام", "مستحقات المتجر"];
    const rows = reportData.stores.map(s => [
        s.name,
        `${s.commissionRate}%`,
        s.sales,
        s.earnings,
        s.sales - ((s.sales * s.commissionRate) / 100)
    ]);

    let csvContent = "\uFEFF"; 
    csvContent += headers.join(",") + "\n";
    rows.forEach(row => {
        csvContent += row.join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `SpeedShop_Report_${branchId}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "تم تصدير ملف CSV بنجاح ✅" });
  };

  const handleResetStats = async () => {
      setIsResetting(true);
      try {
          const batch = writeBatch(db);
          const ordersToArchive = allOrders.filter(o => 
              o.branchId === branchId && 
              o.status === 'delivered' && 
              !o.isArchived
          );

          if (ordersToArchive.length === 0) {
              toast({ title: "لا توجد سجلات جديدة لتصفيرها" });
              setIsResetting(false);
              return;
          }

          ordersToArchive.forEach(order => {
              batch.update(doc(db, "orders", order.id), { isArchived: true });
          });

          await batch.commit();
          toast({ title: "تم تصفير الأرباح بنجاح ✅" });
      } catch (e) {
          toast({ title: "فشل تصفير السجلات", variant: "destructive" });
      } finally {
          setIsResetting(false);
      }
  };

  if (rLoading || oLoading) return <div className="p-20 text-center animate-pulse font-black text-primary">جارِ تحليل السجلات المالية للفرع...</div>;

  return (
    <div className="space-y-8 text-right animate-in fade-in duration-500">
      <header className="flex justify-between items-start">
        <div>
            <h1 className="text-3xl font-black text-primary italic">كشف العمولات والأرباح</h1>
            <p className="text-muted-foreground font-bold">الشركة تتحمل تكاليف الخصومات والمتاجر تستلم مبالغها كاملة.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" className="rounded-xl font-black gap-2 h-12" onClick={handleExportCSV}>
                <Download className="h-5 w-5" /> تصدير CSV
            </Button>
            
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="rounded-xl font-black gap-2 h-12" disabled={isResetting}>
                        {isResetting ? <Loader2 className="h-5 w-5 animate-spin"/> : <RotateCcw className="h-5 w-5" />}
                        تصفير الأرباح
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-[2.5rem]">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-right font-black">تصفير سجلات الفرع؟</AlertDialogTitle>
                        <AlertDialogDescription className="text-right font-bold text-muted-foreground">
                            سيتم أرشفة مبيعات اليوم للبدء من الصفر. هذا لا يحذف الطلبات بل يخفيها من هذا التقرير فقط.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-row gap-3">
                        <AlertDialogCancel className="flex-1 rounded-xl">تراجع</AlertDialogCancel>
                        <AlertDialogAction onClick={handleResetStats} className="flex-1 rounded-xl bg-destructive hover:bg-destructive/90 font-black">نعم، تصفير الآن</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
          <Card className="rounded-[1.5rem] border-none shadow-xl bg-slate-900 text-white p-6">
              <div className="text-[10px] font-black text-primary uppercase mb-2">إجمالي مبيعات الوجبات (بالأصل)</div>
              <div className="text-2xl font-black">{formatCurrency(reportData.totalSales)}</div>
          </Card>
          <Card className="rounded-[1.5rem] border-none shadow-xl bg-primary text-white p-6">
              <div className="text-[10px] font-black text-white/70 uppercase mb-2">صافي أرباح الشركة</div>
              <div className="text-2xl font-black">{formatCurrency(reportData.companyEarnings)}</div>
          </Card>
          <Card className="rounded-[1.5rem] border-none shadow-xl bg-white p-6 border-r-4 border-r-orange-500">
              <div className="text-[10px] font-black text-muted-foreground uppercase mb-2">مستحقات المتاجر (بدون نقص)</div>
              <div className="text-2xl font-black text-slate-800">{formatCurrency(reportData.totalSales - (reportData.totalSales * 0.1))}</div>
          </Card>
          <Card className="rounded-[1.5rem] border-none shadow-xl bg-white p-6 border-r-4 border-r-red-500">
              <div className="text-[10px] font-black text-muted-foreground uppercase mb-2 flex items-center gap-1 justify-end">تكلفة الخصومات (على عاتقنا) <Ticket className="h-3 w-3 text-red-500"/></div>
              <div className="text-2xl font-black text-red-600">{formatCurrency(reportData.totalDiscounts)}</div>
          </Card>
      </div>

      <section className="space-y-4">
          <h2 className="text-xl font-black flex items-center gap-2 px-1 justify-end">تفاصيل مبيعات المتاجر <Building2 className="text-primary h-5 w-5"/></h2>
          <Card className="rounded-[2rem] border-none shadow-xl overflow-hidden bg-white">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="font-black text-right">المتجر</TableHead>
                            <TableHead className="font-black text-center">العمولة</TableHead>
                            <TableHead className="font-black text-center">المبيعات الأصلية</TableHead>
                            <TableHead className="font-black text-center text-primary">صافي ربح الشركة</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {reportData.stores.map(r => (
                            <TableRow key={r.id}>
                                <TableCell className="font-bold flex items-center gap-3 justify-end">
                                    <span>{r.name}</span>
                                    <div className="relative h-8 w-8"><Image src={r.image} fill className="rounded-full object-cover border" alt="" unoptimized={true}/></div>
                                </TableCell>
                                <TableCell className="text-center font-bold text-muted-foreground">{r.commissionRate}%</TableCell>
                                <TableCell className="text-center font-black">{formatCurrency(r.sales)}</TableCell>
                                <TableCell className="text-center font-black text-primary">{formatCurrency(r.earnings)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
          </Card>
      </section>
    </div>
  );
}
