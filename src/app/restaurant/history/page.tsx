
"use client";

import { useContext, useMemo, useState } from 'react';
import { RestaurantContext } from '@/contexts/RestaurantContext';
import { useOrders } from '@/hooks/useOrders';
import { useWithdrawals } from '@/hooks/useWithdrawals';
import { Button } from '@/components/ui/button';
import { LogOut, Loader2, ArrowRight, Wallet, History, SendHorizontal } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface RestaurantHistoryPageProps {
    onBack: () => void;
}

export default function RestaurantHistoryPage({ onBack }: RestaurantHistoryPageProps) {
    const context = useContext(RestaurantContext);
    const { restaurant, logout } = context || {};
    const { allOrders, isLoading: ordersLoading } = useOrders();
    const { requests, requestWithdraw, isLoading: withdrawalsLoading } = useWithdrawals(undefined, restaurant?.id);
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { totalIncome, pendingSettleCount } = useMemo(() => {
        if (!restaurant || !allOrders) return { totalIncome: 0, pendingSettleCount: 0 };
        
        const filtered = allOrders.filter(order => 
            order.restaurant?.id === restaurant.id && 
            order.status === 'delivered' &&
            !order.isPaid
        );

        const income = filtered.reduce((acc, order) => {
            const itemsPrice = order.items.reduce((sum, i) => sum + ((i.selectedSize?.price ?? i.product.discountPrice ?? i.product.price) * i.quantity), 0);
            const netForOrder = itemsPrice * (1 - (restaurant.commissionRate / 100));
            return acc + netForOrder;
        }, 0);

        return { totalIncome: income, pendingSettleCount: filtered.length };
    }, [restaurant, allOrders]);

    const handleWithdraw = async () => {
        if (!restaurant || totalIncome < 5000) {
            toast({ title: "الرصيد غير كافٍ", description: "الحد الأدنى للسحب هو 5,000 د.ع", variant: "destructive" });
            return;
        }
        setIsSubmitting(true);
        const success = await requestWithdraw({
            restaurantId: restaurant.id,
            restaurantName: restaurant.name,
            amount: totalIncome,
            branchId: restaurant.branchId
        });
        setIsSubmitting(false);
    };

    if (!context || !restaurant || ordersLoading) {
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    return (
        <div className="p-4 space-y-6 bg-background h-full overflow-y-auto pb-32 text-right">
             <header className="flex justify-between items-center sticky top-0 bg-background/90 backdrop-blur-md z-10 py-2">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={onBack} className="rounded-xl"><ArrowRight className="h-5 w-5"/></Button>
                    <div>
                        <h1 className="text-xl font-black text-primary">المحفظة والحسابات</h1>
                        <p className="text-[10px] font-bold text-muted-foreground">إدارة مستحقاتكم المالية</p>
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={logout} className="text-destructive"><LogOut className="h-5 w-5"/></Button>
            </header>

            <Card className="rounded-[2.5rem] border-none shadow-xl bg-primary text-white overflow-hidden relative">
                <div className="absolute right-[-20px] top-[-20px] opacity-10"><Wallet className="h-32 w-32" /></div>
                <CardHeader>
                    <CardTitle className="text-white/80 text-xs font-black uppercase">رصيدك الصافي المتاح</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="text-4xl font-black tracking-tighter">{formatCurrency(totalIncome)}</div>
                    <p className="text-[10px] font-bold text-white/70 italic">هذا المبلغ بعد خصم عمولة الشركة ({(restaurant.commissionRate)}%) لـ {pendingSettleCount} طلب.</p>
                    <Button 
                        onClick={handleWithdraw} 
                        disabled={isSubmitting || totalIncome < 5000}
                        className="w-full h-14 rounded-2xl bg-white text-primary hover:bg-white/90 font-black text-lg gap-2 shadow-2xl"
                    >
                        {isSubmitting ? <Loader2 className="animate-spin h-5 w-5"/> : <SendHorizontal className="h-5 w-5"/>}
                        طلب سحب الرصيد كاش
                    </Button>
                </CardContent>
            </Card>

            <div className="space-y-4">
                <h2 className="text-lg font-black flex items-center gap-2 px-1"><History className="h-5 w-5 text-primary"/> سجل طلبات السحب</h2>
                <div className="space-y-3">
                    {requests.map(req => (
                        <Card key={req.id} className="rounded-2xl border-none shadow-sm p-4 flex items-center justify-between bg-white">
                            <div>
                                <p className="font-black text-sm">{formatCurrency(req.amount)}</p>
                                <p className="text-[9px] font-bold text-muted-foreground">{new Date(req.requestedAt).toLocaleDateString('ar-IQ')}</p>
                            </div>
                            <Badge className={cn("rounded-lg font-black text-[9px]", 
                                req.status === 'completed' ? "bg-green-100 text-green-700" : 
                                req.status === 'rejected' ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"
                            )}>
                                {req.status === 'completed' ? 'تم التسليم' : req.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
                            </Badge>
                        </Card>
                    ))}
                    {requests.length === 0 && <div className="p-10 text-center text-muted-foreground italic font-bold text-xs">لا توجد طلبات سحب سابقة.</div>}
                </div>
            </div>
        </div>
    )
}
