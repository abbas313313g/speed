
"use client";

import { useContext, useMemo, useEffect } from 'react';
import { RestaurantContext } from '@/contexts/RestaurantContext';
import { useOrders } from '@/hooks/useOrders';
import { Button } from '@/components/ui/button';
import { LogOut, Loader2, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface RestaurantHistoryPageProps {
    onBack: () => void;
}

export default function RestaurantHistoryPage({ onBack }: RestaurantHistoryPageProps) {
    const context = useContext(RestaurantContext);

    const { restaurant, logout, isProcessing } = context || {};
    const { allOrders, isLoading: ordersLoading } = useOrders();

    const { myPaidOrders, totalIncome } = useMemo(() => {
        if (!restaurant || !allOrders) return { myPaidOrders: [], totalIncome: 0 };
        
        const filtered = allOrders.filter(order => 
            order.restaurant?.id === restaurant.id && 
            order.status === 'delivered' &&
            !order.isPaid
        );

        const income = filtered.reduce((acc, order) => {
            const restaurantItems = order.items.filter(item => item.product.restaurantId === restaurant.id);
            const orderRevenue = restaurantItems.reduce((sum, item) => {
                const itemPrice = item.selectedSize?.price ?? item.product.discountPrice ?? item.product.price;
                return sum + (itemPrice * item.quantity);
            }, 0);
            
            // حساب الصافي للمتجر بعد خصم العموله
            const netForOrder = orderRevenue * (1 - (restaurant.commissionRate / 100));
            return acc + netForOrder;
        }, 0);

        return { myPaidOrders: filtered, totalIncome: income };
    }, [restaurant, allOrders]);

    if (!context || !restaurant) {
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }
    
    if (ordersLoading) {
         return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="p-4 md:p-8 space-y-6 bg-background h-full overflow-y-auto">
             <header className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={onBack}><ArrowRight className="h-5 w-5"/></Button>
                    <div>
                        <h1 className="text-3xl font-bold">سجل الطلبات والحسابات</h1>
                        <p className="text-muted-foreground">عرض الدخل الصافي المستحق لكم</p>
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={logout}><LogOut className="h-5 w-5"/></Button>
            </header>

            <Card className="rounded-[2rem] border-none shadow-md bg-primary/5">
                <CardHeader>
                    <CardTitle className="text-primary">إجمالي الدخل الصافي المستحق</CardTitle>
                    <CardDescription className="font-bold">هذا هو المبلغ الذي ستتسلمونه من المكتب بعد خصم عمولة الشركة ({(restaurant.commissionRate)}%).</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-4xl font-black text-primary">{formatCurrency(totalIncome)}</p>
                </CardContent>
            </Card>

            <Card className="rounded-[2rem] border-none shadow-md overflow-hidden">
                <CardHeader className="bg-muted/20">
                    <CardTitle className="text-lg font-black">طلبات لم يتم تسويتها بعد</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="font-black">رقم الطلب</TableHead>
                                <TableHead className="font-black">التاريخ</TableHead>
                                <TableHead className="font-black text-center">الإجراء</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {myPaidOrders.map(order => (
                                <TableRow key={order.id}>
                                    <TableCell className="font-bold">#{order.id.substring(0,6)}</TableCell>
                                    <TableCell className="text-xs font-bold">{new Date(order.date).toLocaleDateString('ar-IQ')}</TableCell>
                                    <TableCell className="text-center"><Badge variant="outline">بانتظار التصفية</Badge></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    {myPaidOrders.length === 0 && <p className="text-center text-muted-foreground py-20 font-bold italic">لا توجد مبالغ معلقة حالياً.</p>}
                </CardContent>
            </Card>
        </div>
    )
}
