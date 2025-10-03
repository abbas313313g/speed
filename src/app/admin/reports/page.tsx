
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

interface StoreReport {
    restaurant: Restaurant;
    totalRevenue: number;
    totalProfit: number;
    orderCount: number;
}

export default function AdminReportsPage() {
  const { restaurants, isLoading: restaurantsLoading } = useRestaurants();
  const { allOrders, isLoading: ordersLoading } = useOrders();
  const { products, isLoading: productsLoading } = useProducts();

  const isLoading = restaurantsLoading || ordersLoading || productsLoading;
  
  const reports: StoreReport[] = useMemo(() => {
    if (isLoading) return [];

    return restaurants.map(restaurant => {
        const storeOrders = allOrders.filter(order => 
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
            orderCount: storeOrders.length
        };
    }).sort((a,b) => b.totalRevenue - a.totalRevenue);

  }, [restaurants, allOrders, products, isLoading]);

  if (isLoading) return <div>جار التحميل...</div>;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold">تقارير المتاجر</h1>
        <p className="text-muted-foreground">نظرة مفصلة على أداء كل متجر.</p>
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
                  </TableRow>
              ))}
              </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

    