
"use client";

import { useContext, useMemo, useState } from 'react';
import { RestaurantContext } from '@/contexts/RestaurantContext';
import { useOrders } from '@/hooks/useOrders';
import { useWithdrawals } from '@/hooks/useWithdrawals';
import { Button } from '@/components/ui/button';
import { LogOut, Loader2, ArrowRight, Wallet, History, SendHorizontal, Hourglass } from 'lucide-react';
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

    const { totalIncome, pendingSettleCount, pendingRequest } = useMemo(() => {
        if (!restaurant || !allOrders.length) return { totalIncome: 0, pendingSettleCount: 0, pendingRequest: null };
        
        // جلب الطلبات المكتملة التي لم تتم تسويتها مالياً بعد لهذا المتجر حصراً
        const myDeliveredOrders = allOrders.filter(order => 
            order.restaurant?.id === restaurant.id && 
            order.status === 'delivered' &&
            !order.isPaid
        );

        const income = myDeliveredOrders.reduce((acc, order) => {
            // احتساب ثمن الوجبات بناءً على السعر الأصلي لضمان عدم تأثر المتجر بكود خصم الشركة
            const itemsPrice = order.items.reduce((sum, i) => {
                const basePrice = i.selectedSize?.price ?? i.product.price ?? 0;
                return sum + (basePrice * i.quantity);
            }, 0);
            
            // خصم عمولة المنصة
            const commission = (itemsPrice * (restaurant.commissionRate / 100));
            return acc + (itemsPrice - commission);
        }, 0);

        // إضافة التعديلات اليدوية (الخصومات الإدارية)
        const finalIncome = Math.max(0, income + (restaurant.balanceAdjustment || 0));

        const pRequest = requests.find(r => r.targetId === restaurant.id && r.status === 'pending');

        return { 
            totalIncome: finalIncome, 
            pendingSettleCount: myDeliveredOrders.length, 
            pendingRequest: pRequest 
        };
    }, [restaurant, allOrders, requests]);

    const handleWithdraw = async () => {
        if (!restaurant || totalIncome < 5000) {
            toast({ title: "الرصيد غير كافٍ", description: "الحد الأدنى للسحب 5,000 د.ع", variant: "destructive" });
            return;
        }
        setIsSubmitting(true);
        
        const success = await requestWithdraw({
            type: 'restaurant',
            targetId: restaurant.id,
            targetName: restaurant.name,
            amount: totalIncome, // المبلغ الصافي لسهولة المحاسب
            netAmount: totalIncome,
            branchId: restaurant.branchId
        });
        
        if (success) toast({ title: "تم إرسال طلب السحب للإدارة." });
        setIsSubmitting(false);
    };

    if (!context || !restaurant || ordersLoading) {
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;
    }

    const displayBalance = pendingRequest ? 0 : totalIncome;

    return (
        <div className="p-4 space-y-6 bg-slate-50 h-full overflow-y-auto pb-32 text-right">
             <header className="flex justify-between items-center sticky top-0 bg-slate-50/90 backdrop-blur-md z-10 py-2">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={onBack} className="rounded-xl border-2 shadow-sm"><ArrowRight className="h-5 w-5 text-primary"/></Button>
                    <div>
                        <h1 className="text-xl font-black text-slate-800">حساباتي المالية</h1>
                        <p className="text-[10px] font-bold text-muted-foreground">أرباح الوجبات الصافية</p>
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={logout} className="text-destructive"><LogOut className="h-5 w-5"/></Button>
            </header>

            <Card className="rounded-[2.5rem] border-none shadow-2xl bg-primary text-white overflow-hidden relative">
                <div className="absolute right-[-20px] top-[-20px] opacity-10"><Wallet className="h-32 w-32" /></div>
                <CardHeader className="pb-2">
                    <CardTitle className="text-white/80 text-[10px] font-black uppercase tracking-widest">صافي الأرباح المتاحة</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="text-4xl font-black tracking-tighter drop-shadow-lg">{formatCurrency(displayBalance)}</div>
                    
                    {pendingRequest ? (
                        <div className="p-4 bg-white/10 rounded-2xl border border-white/20 flex flex-col items-center gap-2 animate-pulse">
                            <Hourglass className="h-6 w-6 text-white" />
                            <p className="font-black text-white text-sm">طلب السحب قيد المراجعة</p>
                        </div>
                    ) : (
                        <Button 
                            onClick={handleWithdraw} 
                            disabled={isSubmitting || totalIncome < 5000}
                            className="w-full h-16 rounded-[1.8rem] bg-white text-primary hover:bg-white/95 font-black text-xl gap-3 shadow-xl active:scale-95 transition-all"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin h-6 w-6"/> : <SendHorizontal className="h-6 w-6"/>}
                            سحب الأرباح الآن
                        </Button>
                    )}
                </CardContent>
            </Card>

            <div className="space-y-4">
                <h2 className="text-lg font-black flex items-center gap-2 px-1 justify-end text-slate-800">سجل السحوبات <History className="h-5 w-5 text-primary"/></h2>
                <div className="space-y-3">
                    {requests.length === 0 && <div className="text-center py-10 opacity-40 font-bold italic text-sm">لا توجد سجلات سابقة.</div>}
                    {requests.map(req => (
                        <Card key={req.id} className="rounded-[1.5rem] border-none shadow-md p-4 flex items-center justify-between bg-white">
                            <div className="text-right">
                                <p className="font-black text-sm">{formatCurrency(req.netAmount || req.amount)}</p>
                                <p className="text-[9px] font-bold text-muted-foreground">{new Date(req.requestedAt).toLocaleDateString('ar-IQ')}</p>
                            </div>
                            <Badge className={cn("rounded-lg font-black text-[9px] h-7 px-3", 
                                req.status === 'completed' ? "bg-green-100 text-green-700" : 
                                req.status === 'rejected' ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"
                            )}>
                                {req.status === 'completed' ? 'تمت ✅' : req.status === 'rejected' ? 'مرفوض' : 'قيد التدقيق'}
                            </Badge>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    )
}
