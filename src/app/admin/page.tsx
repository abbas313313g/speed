
"use client";

import { useContext } from 'react';
import { AppContext } from '@/contexts/AppContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { DollarSign, ShoppingCart, Users, Activity } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"
import { useMemo } from 'react';

export default function AdminDashboard() {
  const context = useContext(AppContext);

  const stats = useMemo(() => {
    if (!context?.allOrders) return { totalRevenue: 0, totalOrders: 0, newCustomers: 0, avgOrderValue: 0 };
    
    const totalRevenue = context.allOrders.reduce((acc, order) => acc + (order.revenue || 0), 0);
    const totalOrders = context.allOrders.length;
    const newCustomers = context.allUsers.filter(u => !u.isAdmin).length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    return { totalRevenue, totalOrders, newCustomers, avgOrderValue };
  }, [context?.allOrders, context?.allUsers]);

  const chartData = useMemo(() => {
     if (!context?.allOrders) return [];
     const monthlyRevenue: {[key: string]: number} = {};
     context.allOrders.forEach(order => {
        const month = new Date(order.date).toLocaleString('default', { month: 'short' });
        monthlyRevenue[month] = (monthlyRevenue[month] || 0) + (order.revenue || 0);
     });
     return Object.keys(monthlyRevenue).map(month => ({ month, revenue: monthlyRevenue[month] }));
  }, [context?.allOrders]);

  const chartConfig = {
    revenue: {
      label: "الإيرادات",
      color: "hsl(var(--primary))",
    },
  } satisfies ChartConfig

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold">لوحة التحكم</h1>
        <p className="text-muted-foreground">نظرة عامة على أداء تطبيقك.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الإيرادات</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">من جميع الطلبات</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الطلبات</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{stats.totalOrders}</div>
             <p className="text-xs text-muted-foreground">عدد الطلبات المستلمة</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">العملاء</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{stats.newCustomers}</div>
            <p className="text-xs text-muted-foreground">إجمالي عدد المستخدمين</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">متوسط قيمة الطلب</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.avgOrderValue)}</div>
             <p className="text-xs text-muted-foreground">متوسط قيمة الطلب الواحد</p>
          </CardContent>
        </Card>
      </div>

       <Card>
        <CardHeader>
          <CardTitle>أداء الإيرادات الشهري</CardTitle>
        </CardHeader>
        <CardContent className="pl-2">
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <AreaChart data={chartData} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                />
                <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dot" />}
                />
                <Area
                dataKey="revenue"
                type="natural"
                fill="var(--color-revenue)"
                fillOpacity={0.4}
                stroke="var(--color-revenue)"
                />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

    </div>
  );
}
