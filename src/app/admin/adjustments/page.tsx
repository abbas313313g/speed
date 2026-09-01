
"use client";

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDeliveryWorkers } from '@/hooks/useDeliveryWorkers';
import { useRestaurants } from '@/hooks/useRestaurants';
import { Badge } from '@/components/ui/badge';
import { Wallet, Bike, Store, Banknote, ShieldAlert, Loader2, Landmark } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function AdminAdjustmentsPage({ branchId }: { branchId: string }) {
    const { deliveryWorkers, adjustWorkerBalance, isLoading: wLoading } = useDeliveryWorkers(branchId);
    const { restaurants, adjustRestaurantBalance, isLoading: rLoading } = useRestaurants(branchId);
    const { toast } = useToast();

    const [type, setType] = useState<'restaurant' | 'delivery'>('delivery');
    const [targetId, setTargetId] = useState('');
    const [adjustmentField, setAdjustmentField] = useState<'balanceAdjustment' | 'debtAdjustment'>('balanceAdjustment');
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleApplyAdjustment = async () => {
        const val = parseFloat(amount);
        if (!targetId || isNaN(val) || val <= 0) {
            toast({ title: "بيانات غير مكتملة", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        let success = false;
        try {
            if (type === 'delivery') {
                success = await adjustWorkerBalance(targetId, val, adjustmentField);
            } else {
                success = await adjustRestaurantBalance(targetId, val);
            }

            if (success) {
                setAmount('');
                setReason('');
                setTargetId('');
            }
        } catch (e) {
            toast({ title: "حدث خطأ غير متوقع", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    if (wLoading || rLoading) return <div className="p-20 text-center animate-pulse font-black text-primary">جارِ تحميل السجلات المالية...</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 text-right">
            <header>
                <h1 className="text-4xl font-black text-primary italic">الخصومات والتسويات اليدوية</h1>
                <p className="text-muted-foreground font-bold">يمكنك هنا خصم مبالغ من أرباح المتاجر والمناديب في حالات خاصة.</p>
            </header>

            <div className="grid md:grid-cols-2 gap-8">
                <Card className="rounded-[2.5rem] border-none shadow-2xl bg-white dark:bg-slate-900 p-8">
                    <CardHeader className="p-0 mb-8">
                        <CardTitle className="text-2xl font-black flex items-center gap-2 justify-end dark:text-white">إجراء خصم جديد <ShieldAlert className="text-destructive h-6 w-6"/></CardTitle>
                    </CardHeader>
                    <div className="space-y-6">
                        <div className="space-y-3">
                            <Label className="font-black text-sm dark:text-slate-300">نوع الجهة</Label>
                            <div className="grid grid-cols-2 gap-3">
                                <Button 
                                    variant={type === 'delivery' ? 'default' : 'outline'} 
                                    className="rounded-2xl h-14 font-black gap-2"
                                    onClick={() => { setType('delivery'); setTargetId(''); }}
                                >
                                    <Bike className="h-5 w-5"/> مناديب التوصيل
                                </Button>
                                <Button 
                                    variant={type === 'restaurant' ? 'default' : 'outline'} 
                                    className="rounded-2xl h-14 font-black gap-2"
                                    onClick={() => { setType('restaurant'); setTargetId(''); }}
                                >
                                    <Store className="h-5 w-5"/> المتاجر والمطاعم
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="font-black text-sm dark:text-slate-300">اختيار المندوب/المتجر</Label>
                            <Select value={targetId} onValueChange={setTargetId}>
                                <SelectTrigger className="h-14 rounded-2xl border-2 font-bold dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                                    <SelectValue placeholder="اختر من القائمة..." />
                                </SelectTrigger>
                                <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                                    {type === 'delivery' ? 
                                        deliveryWorkers.map(w => <SelectItem key={w.id} value={w.id} className="dark:text-white">{w.name} ({w.id})</SelectItem>) :
                                        restaurants.map(r => <SelectItem key={r.id} value={r.id} className="dark:text-white">{r.name}</SelectItem>)
                                    }
                                </SelectContent>
                            </Select>
                        </div>

                        {type === 'delivery' && (
                            <div className="space-y-3">
                                <Label className="font-black text-sm dark:text-slate-300">المحفظة المستهدفة</Label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button 
                                        onClick={() => setAdjustmentField('balanceAdjustment')}
                                        className={`p-4 rounded-2xl border-2 text-right transition-all ${adjustmentField === 'balanceAdjustment' ? 'border-primary bg-primary/5' : 'border-muted dark:border-slate-700'}`}
                                    >
                                        <Wallet className="h-5 w-5 text-primary mb-2"/>
                                        <p className="font-black text-xs dark:text-white">أرباح المندوب</p>
                                        <p className="text-[9px] font-bold text-muted-foreground">الخصم من رصيده المستحق</p>
                                    </button>
                                    <button 
                                        onClick={() => setAdjustmentField('debtAdjustment')}
                                        className={`p-4 rounded-2xl border-2 text-right transition-all ${adjustmentField === 'debtAdjustment' ? 'border-destructive bg-destructive/5' : 'border-muted dark:border-slate-700'}`}
                                    >
                                        <Banknote className="h-5 w-5 text-destructive mb-2"/>
                                        <p className="font-black text-xs dark:text-white">ذمة المكتب</p>
                                        <p className="text-[9px] font-bold text-muted-foreground">تعديل مبلغ الكاش المطلوب منه</p>
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label className="font-black text-sm text-destructive">قيمة الخصم (IQD)</Label>
                            <Input 
                                type="number" 
                                value={amount} 
                                onChange={(e) => setAmount(e.target.value)} 
                                placeholder="0" 
                                className="h-16 rounded-2xl text-3xl font-black text-center text-destructive bg-muted/20 dark:bg-slate-800 border-none"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="font-black text-sm dark:text-slate-300">سبب الخصم (اختياري)</Label>
                            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="مثال: غرامة تأخير، تعويض زبون..." className="h-12 rounded-xl dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                        </div>

                        <Button 
                            className="w-full h-20 rounded-[2rem] text-2xl font-black shadow-2xl bg-destructive hover:bg-destructive/90 text-white transition-all active:scale-95"
                            onClick={handleApplyAdjustment}
                            disabled={isSaving || !targetId || !amount}
                        >
                            {isSaving ? <Loader2 className="animate-spin h-8 w-8"/> : "تثبيت الخصم المالي الآن"}
                        </Button>
                    </div>
                </Card>

                <div className="space-y-6">
                    <div className="p-8 bg-primary/5 rounded-[3rem] border-4 border-dashed border-primary/20 space-y-4">
                        <div className="p-4 bg-white dark:bg-slate-900 rounded-3xl w-fit shadow-sm"><Landmark className="h-10 w-10 text-primary"/></div>
                        <h2 className="text-2xl font-black dark:text-white">ملاحظات المحاسبة</h2>
                        <ul className="space-y-3 font-bold text-sm text-slate-600 dark:text-slate-400 list-disc list-inside pr-2">
                            <li>الخصم من "أرباح المندوب" سيؤدي إلى إنقاص الرصيد الظاهر في محفظته.</li>
                            <li>الخصم من "ذمة المكتب" سيؤدي إلى إنقاص المبلغ الذي يجب على المندوب تسليمه كاش للمكتب.</li>
                            <li>المتاجر يتم الخصم منها فقط من "أرباح الوجبات" الصافية.</li>
                            <li>هذا الإجراء يدوي ونهائي، يرجى التأكد من المبالغ قبل الضغط.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
