
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
import { useProducts } from '@/hooks/useProducts';
import { Button } from '@/components/ui/button';
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

interface StoreReport {
    restaurant: Restaurant;
    totalRevenue: number;
    totalProfit: number;
    orderCount: number;
    unpaidOrderIds: string[];
}

export default function AdminReportsPage() {
  const { restaurants, isLoading: restaurantsLoading } = useRestaurants();
  const { allOrders, isLoading: ordersLoading, markOrdersAsPaid } = useOrders();
  const { products, isLoading: productsLoading } = useProducts();

  const isLoading = restaurantsLoading || ordersLoading || productsLoading;
  
  const reports: StoreReport[] = useMemo(() => {
    if (isLoading) return [];

    return restaurants.map(restaurant => {
        const storeOrders = allOrders.filter(order => 
            !order.isPaid && order.status === 'delivered' &&
            order.items.some(item => {
                const product = products.find(p => p.id === item.product.id);
                return product?.restaurantId === restaurant.id;
            })
        );
        
        let totalRevenue = 0;
        let totalProfit = 0;
        
        storeOrders.forEach(order => {
            order.items.forEach(item => {
                const product = products.find(p => p.id === item.product.id);
                if (product?.restaurantId === restaurant.id) {
                    const itemPrice = item.selectedSize?.price ?? item.product.discountPrice ?? item.product.price;
                    const itemRevenue = itemPrice * item.quantity;
                    const wholesalePrice = product.wholesalePrice || 0;
                    const itemProfit = (itemPrice - wholesalePrice) * item.quantity;
                    totalRevenue += itemRevenue;
                    totalProfit += itemProfit;
                }
            });
        });

        return {
            restaurant,
            totalRevenue,
            totalProfit,
            orderCount: storeOrders.length,
            unpaidOrderIds: storeOrders.map(o => o.id),
        };
    }).sort((a,b) => b.totalRevenue - a.totalRevenue);

  }, [restaurants, allOrders, products, isLoading]);
  
  const handleMarkAsPaid = async (orderIds: string[]) => {
      if (orderIds.length === 0) return;
      await markOrdersAsPaid(orderIds);
  }

  if (isLoading) return <div>جار التحميل...</div>;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold">تقارير المتاجر (الأرباح المستحقة)</h1>
        <p className="text-muted-foreground">نظرة على الدخل المستحق لكل متجر من الطلبات المكتملة والتي لم يتم تسويتها بعد.</p>
      </header>

      {reports.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">لا توجد بيانات تقارير لعرضها.</p>
      ) : (
        <Card>
          <Table>
              <TableHeader>
              <TableRow>
                  <TableHead>المتجر</TableHead>
                  <TableHead>إجمالي المبيعات (الإيرادات)</TableHead>
                  <TableHead>إجمالي الأرباح</TableHead>
                  <TableHead>عدد الطلبات</TableHead>
                  <TableHead>إجراء</TableHead>
              </TableRow>
              </TableHeader>
              <TableBody>
              {reports.map((report) => (
                  <TableRow key={report.restaurant.id}>
                  <TableCell>
                      <div className="flex items-center gap-3">
                          <Image src={report.restaurant.image} alt={report.restaurant.name} width={40} height={40} className="rounded-md object-cover" unoptimized={true} />
                          <span className="font-medium">{report.restaurant.name}</span>
                      </div>
                  </TableCell>
                  <TableCell>{formatCurrency(report.totalRevenue)}</TableCell>
                  <TableCell>{formatCurrency(report.totalProfit)}</TableCell>
                  <TableCell>{report.orderCount}</TableCell>
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                         <Button variant="outline" size="sm" disabled={report.unpaidOrderIds.length === 0}>تسوية ومسح السجل</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                          <AlertDialogHeader>
                              <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                              <AlertDialogDescription>
                                  سيؤدي هذا الإجراء إلى وضع علامة "مدفوع" على {report.orderCount} طلبات لمطعم "{report.restaurant.name}" وإزالتها من هذا التقرير. لا يمكن التراجع عن هذا الإجراء.
                              </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                              <AlertDialogCancel>إلغاء</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleMarkAsPaid(report.unpaidOrderIds)}>نعم، قم بالتسوية</AlertDialogAction>
                          </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                  </TableRow>
              ))}
              </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
