
"use client";

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, cn } from '@/lib/utils';
import { LogOut, CircleDot, Loader2, Package, Check, Shield, MoreHorizontal } from 'lucide-react';
import type { Order, OrderStatus } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useOrders } from '@/hooks/useOrders';
import { useDeliveryWorkers } from '@/hooks/useDeliveryWorkers';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function DeliveryPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [workerId, setWorkerId] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState<string | null>(null);

    const { allOrders, isLoading: ordersLoading, updateOrderStatus } = useOrders();
    const { deliveryWorkers, isLoading: workersLoading, updateWorkerStatus } = useDeliveryWorkers();

    useEffect(() => {
        const id = localStorage.getItem('deliveryWorkerId');
        if (!id) {
            router.replace('/delivery/login');
        } else {
            setWorkerId(id);
        }
    }, [router]);
    
    const worker = useMemo(() => {
        if (!workerId || !deliveryWorkers) return null;
        return deliveryWorkers.find(w => w.id === workerId);
    }, [workerId, deliveryWorkers]);

    const { myCurrentOrders, availableOrders } = useMemo(() => {
        if (!allOrders || !workerId) return { myCurrentOrders: [], availableOrders: [] };
        
        const myOrders = allOrders.filter(o => 
            o.deliveryWorkerId === workerId && 
            ['confirmed', 'preparing', 'on_the_way'].includes(o.status)
        );

        const available = allOrders.filter(o => o.status === 'unassigned');
        
        return { myCurrentOrders: myOrders, availableOrders: available };
    }, [allOrders, workerId]);


    const handleAcceptOrder = async (orderId: string) => {
        if (!workerId) return;
        setIsProcessing(orderId);
        try {
            await updateOrderStatus(orderId, 'confirmed', workerId);
            toast({title: "تم قبول الطلب بنجاح!"})
            router.push(`/delivery/order/${orderId}`);
        } catch (error: any) {
             // The hook will toast the error
        } finally {
            setIsProcessing(null);
        }
    };
    
    const handleLogout = () => {
        if(workerId) {
            updateWorkerStatus(workerId, false);
        }
        localStorage.removeItem('deliveryWorkerId');
        router.replace('/delivery/login');
    };
    
    const handleToggleOnlineStatus = () => {
        if(workerId && worker) {
            const newStatus = !worker.isOnline;
            updateWorkerStatus(workerId, newStatus);
            toast({ title: newStatus ? "أنت متصل الآن" : "أنت غير متصل الآن" });
        }
    }
    
    const isLoading = ordersLoading || workersLoading || !workerId;
    if (isLoading) return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

    const getStatusVariant = (status: OrderStatus) => {
        switch (status) {
            case 'confirmed': return 'bg-blue-500';
            case 'preparing': return 'bg-yellow-500 text-black';
            case 'on_the_way': return 'bg-orange-500';
            default: return 'bg-gray-500';
        }
    };

    const getStatusText = (status: OrderStatus) => {
        switch (status) {
            case 'confirmed': return "تم التأكيد";
            case 'preparing': return "تحضير الطلب";
            case 'on_the_way': return "في الطريق";
            default: return status;
        }
    }
    
    const handleUpdateStatus = async (orderId: string, status: OrderStatus) => {
      await updateOrderStatus(orderId, status);
    };

    const OrderRow = ({order}: {order: Order}) => (
        <TableRow onClick={() => router.push(`/delivery/order/${order.id}`)} className="cursor-pointer">
            <TableCell className="font-medium">#{order.id.substring(0, 6)}</TableCell>
            <TableCell>{order.address.deliveryZone}</TableCell>
            <TableCell>{formatCurrency(order.deliveryFee)}</TableCell>
            <TableCell>{formatCurrency(order.total)}</TableCell>
            <TableCell>
                <Badge className={cn("text-white", getStatusVariant(order.status))}>
                    {getStatusText(order.status)}
                </Badge>
            </TableCell>
            <TableCell>
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                        <span className="sr-only">فتح القائمة</span>
                        <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'preparing')}>تحضير الطلب</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'on_the_way')}>في الطريق</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'delivered')}>تم التوصيل</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </TableCell>
        </TableRow>
    );

    return (
        <div className="p-4 space-y-6 flex flex-col min-h-screen">
            <header className="flex justify-between items-center">
                 <div>
                    <h1 className="text-2xl font-bold">مرحباً {worker?.name}</h1>
                    <div className="flex items-center gap-2 text-sm cursor-pointer" onClick={handleToggleOnlineStatus}>
                        <CircleDot className={`h-4 w-4 ${worker?.isOnline ? 'text-green-500' : 'text-gray-400'}`} />
                        <span className="text-muted-foreground">{worker?.isOnline ? 'أنت متصل' : 'أنت غير متصل'}</span>
                    </div>
                 </div>
                 <div className="flex gap-2">
                     <Button variant="ghost" size="icon" asChild>
                        <Link href="/delivery/stats">
                            <Shield className="h-5 w-5"/>
                        </Link>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={handleLogout}>
                        <LogOut className="h-5 w-5"/>
                    </Button>
                 </div>
            </header>

            <main className="flex-grow space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5"/>
                            طلباتي الحالية ({myCurrentOrders.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {myCurrentOrders.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>الطلب</TableHead>
                                        <TableHead>المنطقة</TableHead>
                                        <TableHead>الأجرة</TableHead>
                                        <TableHead>المبلغ</TableHead>
                                        <TableHead>الحالة</TableHead>
                                        <TableHead>إجراء</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {myCurrentOrders.map(order => <OrderRow key={order.id} order={order} />)}
                                </TableBody>
                            </Table>
                        ) : (
                            <p className="text-center text-muted-foreground py-4">لا توجد لديك طلبات قيد التنفيذ.</p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>الطلبات المتاحة ({availableOrders.length})</CardTitle>
                    </CardHeader>
                     <CardContent>
                        {availableOrders.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>الطلب</TableHead>
                                        <TableHead>المنطقة</TableHead>
                                        <TableHead>الأجرة</TableHead>
                                        <TableHead>المبلغ</TableHead>
                                        <TableHead>إجراء</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                   {availableOrders.map(order => (
                                        <TableRow key={order.id}>
                                            <TableCell className="font-medium" onClick={() => router.push(`/delivery/order/${order.id}`)}>#{order.id.substring(0, 6)}</TableCell>
                                            <TableCell onClick={() => router.push(`/delivery/order/${order.id}`)}>{order.address.deliveryZone}</TableCell>
                                            <TableCell onClick={() => router.push(`/delivery/order/${order.id}`)}>{formatCurrency(order.deliveryFee)}</TableCell>
                                            <TableCell onClick={() => router.push(`/delivery/order/${order.id}`)}>{formatCurrency(order.total)}</TableCell>
                                            <TableCell>
                                                <Button 
                                                    size="sm" 
                                                    className="bg-green-600 hover:bg-green-700" 
                                                    disabled={isProcessing === order.id || !worker?.isOnline}
                                                    onClick={() => handleAcceptOrder(order.id)}
                                                >
                                                    {isProcessing === order.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="ml-1 h-4 w-4"/>}
                                                    قبول
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                   ))}
                                </TableBody>
                            </Table>
                        ) : (
                             <p className="text-center text-muted-foreground py-4">لا توجد طلبات متاحة حالياً. {worker?.isOnline ? "سيتم إشعارك." : "اتصل بالانترنت لتلقي الطلبات."}</p>
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}


    