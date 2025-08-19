

"use client";

import { useContext } from 'react';
import { AppContext } from '@/contexts/AppContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { DollarSign, ShoppingCart, Users, Activity, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"
import { useMemo } from 'react';

export default function AdminDashboard() {
  const context = useContext(AppContext);

  const stats = useMemo(() => {
    if (!context?.allOrders) return { totalRevenue: 0, totalOrders: 0, newCustomers: 0, avgOrderValue: 0, totalProfit: 0 };
    
    const totalRevenue = context.allOrders.reduce((acc, order) => acc + (order.total || 0), 0);
    const totalProfit = context.allOrders.reduce((acc, order) => acc + (order.profit || 0), 0);
    const totalOrders = context.allOrders.length;
    const newCustomers = context.allUsers.filter(u => !u.isAdmin).length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    return { totalRevenue, totalOrders, newCustomers, avgOrderValue, totalProfit };
  }, [context?.allOrders, context?.allUsers]);

  const chartData = useMemo(() => {
     if (!context?.allOrders) return [];
     const monthlyData: {[key: string]: { revenue: number, profit: number }} = {};
     context.allOrders.forEach(order => {
        const month = new Date(order.date).toLocaleString('default', { month: 'short' });
        if (!monthlyData[month]) {
            monthlyData[month] = { revenue: 0, profit: 0 };
        }
        monthlyData[month].revenue += order.total || 0;
        monthlyData[month].profit += order.profit || 0;
     });
     return Object.keys(monthlyData).map(month => ({ month, ...monthlyData[month] }));
  }, [context?.allOrders]);

  const chartConfig = {
    revenue: {
      label: "الإيرادات",
      color: "hsl(var(--primary))",
    },
    profit: {
      label: "الأرباح",
      color: "hsl(var(--chart-2))",
    }
  } satisfies ChartConfig

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold">لوحة التحكم</h1>
        <p className="text-muted-foreground">نظرة عامة على أداء تطبيقك.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
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
            <CardTitle className="text-sm font-medium">إجمالي الأرباح</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalProfit)}</div>
            <p className="text-xs text-muted-foreground">بعد خصم سعر الجملة</p>
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
          <CardTitle>أداء الإيرادات والأرباح الشهري</CardTitle>
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
                stackId="a"
                />
                <Area
                dataKey="profit"
                type="natural"
                fill="var(--color-profit)"
                fillOpacity={0.4}
                stroke="var(--color-profit)"
                stackId="a"
                />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

    </div>
  );
}
