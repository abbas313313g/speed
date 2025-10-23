
"use client";

import { useContext, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { RestaurantContext } from '@/contexts/RestaurantContext';
import { useOrders } from '@/hooks/useOrders';
import { Button } from '@/components/ui/button';
import { LogOut, Loader2, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';


export default function RestaurantHistoryPage() {
    const router = useRouter();
    const context = useContext(RestaurantContext);

    if (!context) {
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    const { restaurant, logout } = context;
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
            return acc + orderRevenue;
        }, 0);

        return { myPaidOrders: filtered, totalIncome: income };
    }, [restaurant, allOrders]);

    if (!restaurant) {
        router.replace('/restaurant/login');
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }
    
    if (ordersLoading) {
         return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="p-4 md:p-8 space-y-6">
             <header className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => router.back()}><ArrowRight className="h-5 w-5"/></Button>
                    <div>
                        <h1 className="text-3xl font-bold">سجل الطلبات</h1>
                        <p className="text-muted-foreground">عرض الطلبات المكتملة والدخل المستحق</p>
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={logout}><LogOut className="h-5 w-5"/></Button>
            </header>

            <Card>
                <CardHeader>
                    <CardTitle>إجمالي الدخل المستحق</CardTitle>
                    <CardDescription>هذا هو مجموع المبالغ المستحقة لكم من الطلبات المكتملة التي لم تتم تسويتها بعد.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-4xl font-bold text-primary">{formatCurrency(totalIncome)}</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>الطلبات المكتملة</CardTitle>
                </CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>رقم الطلب</TableHead>
                                <TableHead>التاريخ</TableHead>
                                <TableHead>المبلغ</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {myPaidOrders.map(order => (
                                <TableRow key={order.id}>
                                    <TableCell>#{order.id.substring(0,6)}</TableCell>
                                    <TableCell>{new Date(order.date).toLocaleDateString('ar-IQ')}</TableCell>
                                    <TableCell>{formatCurrency(order.total)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    {myPaidOrders.length === 0 && <p className="text-center text-muted-foreground py-8">لا توجد طلبات في السجل حاليًا.</p>}
                </CardContent>
            </Card>
        </div>
    )
}
