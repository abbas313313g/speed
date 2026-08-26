
"use client";

import { useContext, useMemo, useState } from 'react';
import { RestaurantContext } from '@/contexts/RestaurantContext';
import { useOrders } from '@/hooks/useOrders';
import { useWithdrawals } from '@/hooks/useWithdrawals';
import { Button } from '@/components/ui/button';
import { LogOut, Loader2, ArrowRight, Wallet, History, SendHorizontal, Receipt } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { formatCurrency, cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface RestaurantHistoryPageProps {
    onBack: () => void;
}

export default function RestaurantHistoryPage({ onBack }: RestaurantHistoryPageProps) {
    const context = useContext(RestaurantContext);
    const { restaurant, logout } = context || {};
    const { allOrders, isLoading: ordersLoading } = useOrders();
    const { requests, requestWithdraw } = useWithdrawals(undefined, restaurant?.id);
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
            const commission = (itemsPrice * (restaurant.commissionRate / 100));
            return acc + (itemsPrice - commission);
        }, 0);

        return { totalIncome: income, pendingSettleCount: filtered.length };
    }, [restaurant, allOrders]);

    const handleWithdraw = async () => {
        if (!restaurant || totalIncome < 5000) {
            toast({ title: "الرصيد غير كافٍ", description: "الحد الأدنى لطلب السحب هو 5,000 د.ع", variant: "destructive" });
            return;
        }
        setIsSubmitting(true);
        
        const commissionAmount = (totalIncome / (1 - (restaurant.commissionRate/100))) * (restaurant.commissionRate/100);
        
        const success = await requestWithdraw({
            restaurantId: restaurant.id,
            restaurantName: restaurant.name,
            amount: totalIncome + commissionAmount, // إجمالي المبيعات
            commissionAmount: commissionAmount,
            netAmount: totalIncome,
            branchId: restaurant.branchId
        });
        
        if (success) toast({ title: "تم إرسال طلبك للإدارة بنجاح" });
        setIsSubmitting(false);
    };

    if (!context || !restaurant || ordersLoading) {
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    return (
        <div className="p-4 space-y-6 bg-slate-50 h-full overflow-y-auto pb-32 text-right">
             <header className="flex justify-between items-center sticky top-0 bg-slate-50/90 backdrop-blur-md z-10 py-2">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={onBack} className="rounded-xl h-10 w-10 border-2 shadow-sm"><ArrowRight className="h-5 w-5 text-primary"/></Button>
                    <div>
                        <h1 className="text-xl font-black text-slate-800 italic">كشف الحساب</h1>
                        <p className="text-[10px] font-bold text-muted-foreground">إدارة مستحقاتكم المالية والطلبات</p>
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={logout} className="text-destructive"><LogOut className="h-5 w-5"/></Button>
            </header>

            <Card className="rounded-[2.5rem] border-none shadow-2xl bg-primary text-white overflow-hidden relative">
                <div className="absolute right-[-20px] top-[-20px] opacity-10"><Wallet className="h-32 w-32" /></div>
                <CardHeader className="pb-2">
                    <CardTitle className="text-white/80 text-[10px] font-black uppercase tracking-widest">رصيدك الصافي المتاح للسحب</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="text-4xl font-black tracking-tighter drop-shadow-lg">{formatCurrency(totalIncome)}</div>
                    <div className="p-3 bg-white/10 rounded-2xl border border-white/20 text-[10px] font-bold">
                        تم احتساب هذا المبلغ لـ {pendingSettleCount} طلب مكتمل بعد خصم عمولة الشركة ({(restaurant.commissionRate)}%).
                    </div>
                    <Button 
                        onClick={handleWithdraw} 
                        disabled={isSubmitting || totalIncome < 5000}
                        className="w-full h-16 rounded-[1.8rem] bg-white text-primary hover:bg-white/95 font-black text-xl gap-3 shadow-xl active:scale-95 transition-all"
                    >
                        {isSubmitting ? <Loader2 className="animate-spin h-6 w-6"/> : <SendHorizontal className="h-6 w-6"/>}
                        سحب المبلغ كاش الآن
                    </Button>
                </CardContent>
            </Card>

            <div className="space-y-4">
                <h2 className="text-lg font-black flex items-center gap-2 px-1 justify-end text-slate-800">سجل طلبات السحب <History className="h-5 w-5 text-primary"/></h2>
                <div className="space-y-3">
                    {requests.map(req => (
                        <Card key={req.id} className="rounded-[1.5rem] border-none shadow-md p-4 flex items-center justify-between bg-white border-r-4 border-r-primary/20">
                            <div className="text-right">
                                <p className="font-black text-sm">{formatCurrency(req.netAmount || req.amount)}</p>
                                <p className="text-[9px] font-bold text-muted-foreground">{new Date(req.requestedAt).toLocaleDateString('ar-IQ')}</p>
                            </div>
                            <Badge className={cn("rounded-lg font-black text-[9px] h-7 px-3", 
                                req.status === 'completed' ? "bg-green-100 text-green-700 border-none" : 
                                req.status === 'rejected' ? "bg-red-100 text-red-700 border-none" : "bg-orange-100 text-orange-700 border-none"
                            )}>
                                {req.status === 'completed' ? 'تم التسليم ✅' : req.status === 'rejected' ? 'تم الرفض ❌' : 'قيد المراجعة ⏳'}
                            </Badge>
                        </Card>
                    ))}
                    {requests.length === 0 && <div className="p-16 text-center text-muted-foreground font-black italic border-2 border-dashed rounded-[2.5rem] text-[10px]">لا توجد عمليات سحب سابقة مسجلة.</div>}
                </div>
            </div>
        </div>
    )
}
