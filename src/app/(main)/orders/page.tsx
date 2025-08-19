
"use client";

import { useContext, useMemo } from 'react';
import Link from 'next/link';
import { AppContext } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { ShoppingBag, Package, User } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn, formatCurrency } from '@/lib/utils';
import type { OrderStatus } from '@/lib/types';
import Image from 'next/image';

export default function OrdersPage() {
    const context = useContext(AppContext);

    if (!context) {
        return <div>جار التحميل...</div>;
    }

    const { allOrders, localOrderIds } = context;

    const myOrders = useMemo(() => {
        return allOrders.filter(order => localOrderIds.includes(order.id)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [allOrders, localOrderIds]);

    const getStatusVariant = (status: OrderStatus) => {
        switch (status) {
            case 'unassigned': return 'bg-gray-400';
            case 'confirmed': return 'bg-blue-500';
            case 'preparing': return 'bg-yellow-500';
            case 'on_the_way': return 'bg-orange-500';
            case 'delivered': return 'bg-green-500';
            case 'cancelled': return 'bg-red-500';
            default: return 'bg-gray-500';
        }
    }
     const getStatusText = (status: OrderStatus) => {
        switch (status) {
            case 'unassigned': return "بانتظار سائق";
            case 'confirmed': return "تم التأكيد";
            case 'preparing': return "تحضير الطلب";
            case 'on_the_way': return "في الطريق";
            case 'delivered': return "تم التوصيل";
            case 'cancelled': return "ملغي";
            default: return status;
        }
    }

    if (myOrders.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] text-center p-4">
                <ShoppingBag className="h-24 w-24 text-muted-foreground/50 mb-4" />
                <h2 className="text-2xl font-bold">لا يوجد طلبات بعد!</h2>
                <p className="text-muted-foreground mt-2">عندما تقوم بطلب ما، ستجده هنا.</p>
                <Button asChild className="mt-6">
                    <Link href="/home">اطلب الآن</Link>
                </Button>
            </div>
        );
    }
    
    return (
        <div className="p-4 space-y-6">
            <header>
                <h1 className="text-3xl font-bold">متابعة طلباتك</h1>
                <p className="text-muted-foreground">تتبع طلباتك الحالية واطلع على طلباتك السابقة.</p>
            </header>

            <div className="space-y-4">
                {myOrders.map(order => (
                    <Card key={order.id}>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle>طلب #{order.id.substring(0, 6)}</CardTitle>
                                    <CardDescription>{new Date(order.date).toLocaleString('ar-IQ')}</CardDescription>
                                </div>
                                <Badge className={cn("text-white", getStatusVariant(order.status))}>
                                    {getStatusText(order.status)}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                           <div className="flex flex-wrap gap-2">
                             {order.items.slice(0,3).map(item => (
                                 <Image key={item.product.id} src={item.product.image} alt={item.product.name} width={40} height={40} className="rounded-md object-cover"/>
                             ))}
                             {order.items.length > 3 && <div className="flex items-center justify-center w-10 h-10 bg-muted rounded-md text-xs">+{order.items.length-3}</div>}
                           </div>
                           {order.deliveryWorker && (
                            <div className="flex items-center gap-2 pt-2 border-t text-sm">
                                <User className="h-4 w-4 text-muted-foreground"/>
                                <span>مندوب التوصيل:</span>
                                <span className="font-semibold">{order.deliveryWorker.name}</span>
                                <a href={`tel:${order.deliveryWorker.id}`} className="font-semibold text-primary">{order.deliveryWorker.id}</a>
                            </div>
                           )}
                        </CardContent>
                        <CardFooter className="flex justify-between items-center">
                            <span className="font-bold">{order.items.length} منتجات</span>
                            <span className="text-lg font-bold text-primary">{formatCurrency(order.total)}</span>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
}
