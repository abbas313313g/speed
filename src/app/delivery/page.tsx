

"use client";

import { useContext, useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppContext } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, MapPin, Package, RefreshCw } from 'lucide-react';
import type { Order } from '@/lib/types';

export default function DeliveryPage() {
    const context = useContext(AppContext);
    const router = useRouter();
    const [workerId, setWorkerId] = useState<string | null>(null);

    useEffect(() => {
        const id = localStorage.getItem('deliveryWorkerId');
        if (!id) {
            router.replace('/delivery/login');
        } else {
            setWorkerId(id);
        }
    }, [router]);
    
    const { allOrders, updateOrderStatus } = context || {};

    const { unassignedOrders, myOrders } = useMemo(() => {
        if (!allOrders) return { unassignedOrders: [], myOrders: [] };
        return {
            unassignedOrders: allOrders.filter(o => o.status === 'unassigned'),
            myOrders: allOrders.filter(o => o.deliveryWorkerId === workerId)
        }
    }, [allOrders, workerId]);


    const handleAcceptOrder = (orderId: string) => {
        if (workerId && updateOrderStatus) {
            updateOrderStatus(orderId, 'confirmed', workerId);
        }
    };
    
    const handleLogout = () => {
        localStorage.removeItem('deliveryWorkerId');
        router.replace('/delivery/login');
    };

    if (!context || context.isLoading || !workerId) return <div>جار التحميل...</div>;
    const worker = context.deliveryWorkers.find(w => w.id === workerId);
    
    const OrderCard = ({order, isMyOrder}: {order: Order, isMyOrder: boolean}) => (
        <Card>
            <CardHeader>
                <CardTitle>طلب #{order.id.substring(0, 6)}</CardTitle>
                <CardDescription>{order.address.name} - {order.address.deliveryZone}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
                <div className="flex justify-between">
                    <span>المنتجات:</span>
                    <span>{order.items.length}</span>
                </div>
                <div className="flex justify-between">
                    <span>المجموع:</span>
                    <span className="font-bold">{formatCurrency(order.total)}</span>
                </div>
                <div className="flex justify-between text-primary font-bold">
                    <span>ربحك من التوصيل:</span>
                    <span>{formatCurrency(order.deliveryFee)}</span>
                </div>
            </CardContent>
            <CardFooter className="flex gap-2">
                <a href={`https://www.google.com/maps?q=${order.address.latitude},${order.address.longitude}`} target="_blank" rel="noopener noreferrer" className="flex-1">
                    <Button variant="outline" className="w-full">
                        <MapPin className="ml-2 h-4 w-4"/>
                        عرض على الخريطة
                    </Button>
                </a>
                {!isMyOrder && <Button className="flex-1" onClick={() => handleAcceptOrder(order.id)}>قبول الطلب</Button>}
                 {isMyOrder && (
                    <Link href={`/delivery/order/${order.id}`} className="flex-1">
                       <Button className="w-full">
                            <Package className="ml-2 h-4 w-4"/>
                            تفاصيل الطلب
                       </Button>
                    </Link>
                 )}
            </CardFooter>
        </Card>
    );

    return (
        <div className="p-4 space-y-6">
            <header className="flex justify-between items-center">
                 <div>
                    <h1 className="text-2xl font-bold">مرحباً {worker?.name}</h1>
                    <p className="text-muted-foreground">بوابة عمال التوصيل</p>
                 </div>
                 <Button variant="ghost" size="icon" onClick={handleLogout}>
                    <LogOut className="h-5 w-5"/>
                 </Button>
            </header>

            <Tabs defaultValue="available">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="available">طلبات متاحة ({unassignedOrders.length})</TabsTrigger>
                    <TabsTrigger value="my-orders">طلباتي ({myOrders.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="available" className="space-y-4 pt-4">
                    {unassignedOrders.length > 0 ? (
                        unassignedOrders.map(order => <OrderCard key={order.id} order={order} isMyOrder={false} />)
                    ) : (
                        <p className="text-center text-muted-foreground py-10">لا توجد طلبات متاحة حالياً.</p>
                    )}
                </TabsContent>
                <TabsContent value="my-orders" className="space-y-4 pt-4">
                    {myOrders.length > 0 ? (
                        myOrders.map(order => <OrderCard key={order.id} order={order} isMyOrder={true}/>)
                    ) : (
                        <p className="text-center text-muted-foreground py-10">ليس لديك أي طلبات حالياً.</p>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
