
"use client";

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDeliveryWorkers } from '@/hooks/useDeliveryWorkers';
import { useRestaurants } from '@/hooks/useRestaurants';
import { Construction, ShieldCheck, Wallet, Bike, Store, Plus, Minus, Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';

export default function AdminDeveloperPage() {
    const { deliveryWorkers, isLoading: wLoading } = useDeliveryWorkers();
    const { restaurants, isLoading: rLoading } = useRestaurants();
    const { toast } = useToast();

    const [type, setType] = useState<'restaurant' | 'delivery'>('delivery');
    const [targetId, setTargetId] = useState('');
    const [amount, setAmount] = useState('');
    const [action, setAction] = useState<'add' | 'sub'>('add');
    const [isSaving, setIsSaving] = useState(false);

    const handleApply = async () => {
        const val = parseFloat(amount);
        if (!targetId || isNaN(val) || val <= 0) {
            toast({ title: "بيانات غير صحيحة", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        try {
            const finalVal = action === 'add' ? val : -val;
            const collection = type === 'delivery' ? "deliveryWorkers" : "restaurants";
            // الإيداع والخصم يتم الآن مباشرة في المحفظة الدائمة
            const field = "walletBalance";
            
            await updateDoc(doc(db, collection, targetId), {
                [field]: increment(finalVal)
            });

            toast({ title: "تم تحديث الخزنة السحابية بنجاح ✅" });
            setAmount('');
        } catch (e) {
            toast({ title: "فشل التحديث", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    if (wLoading || rLoading) return <div className="p-20 text-center animate-pulse font-black text-primary">جاري فتح الأنظمة السرية...</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 text-right">
            <header className="flex justify-between items-center bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl overflow-hidden relative">
                <div className="absolute left-[-20px] top-[-20px] opacity-10"><Sparkles className="h-40 w-40"/></div>
                <div className="relative z-10">
                    <h1 className="text-4xl font-black italic">صفحة المطور</h1>
                    <p className="text-primary font-black mt-2">الصفحة خاصة بالمطور - تحكم مطلق بالمحفظة الدائمة</p>
                </div>
                <ShieldCheck className="h-16 w-16 text-primary animate-pulse" />
            </header>

            <div className="grid md:grid-cols-2 gap-8">
                <Card className="rounded-[3rem] border-none shadow-2xl bg-white p-8">
                    <div className="space-y-8">
                        <div className="space-y-3">
                            <Label className="font-black text-sm">نوع الحساب المستهدف</Label>
                            <div className="grid grid-cols-2 gap-4">
                                <Button 
                                    variant={type === 'delivery' ? 'default' : 'outline'} 
                                    className="h-16 rounded-2xl font-black text-lg gap-2"
                                    onClick={() => { setType('delivery'); setTargetId(''); }}
                                >
                                    <Bike className="h-6 w-6"/> المناديب
                                </Button>
                                <Button 
                                    variant={type === 'restaurant' ? 'default' : 'outline'} 
                                    className="h-16 rounded-2xl font-black text-lg gap-2"
                                    onClick={() => { setType('restaurant'); setTargetId(''); }}
                                >
                                    <Store className="h-6 w-6"/> المتاجر
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="font-black text-sm">اختيار الكيان</Label>
                            <Select value={targetId} onValueChange={setTargetId}>
                                <SelectTrigger className="h-14 rounded-2xl border-2 font-bold text-lg">
                                    <SelectValue placeholder="اختر من القائمة..." />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px]">
                                    {type === 'delivery' ? 
                                        deliveryWorkers.map(w => <SelectItem key={w.id} value={w.id}>{w.name} ({w.id})</SelectItem>) :
                                        restaurants.map(r => <SelectItem key={r.id} value={r.id}>{r.name} - {r.branchId}</SelectItem>)
                                    }
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-3">
                            <Label className="font-black text-sm">نوع العملية</Label>
                            <div className="grid grid-cols-2 gap-4">
                                <button 
                                    onClick={() => setAction('add')}
                                    className={`p-6 rounded-2xl border-4 transition-all flex flex-col items-center gap-2 ${action === 'add' ? 'border-primary bg-primary/5' : 'border-slate-50 opacity-40'}`}
                                >
                                    <Plus className="h-8 w-8 text-primary"/>
                                    <span className="font-black">إضافة رصيد</span>
                                </button>
                                <button 
                                    onClick={() => setAction('sub')}
                                    className={`p-6 rounded-2xl border-4 transition-all flex flex-col items-center gap-2 ${action === 'sub' ? 'border-destructive bg-destructive/5' : 'border-slate-50 opacity-40'}`}
                                >
                                    <Minus className="h-8 w-8 text-destructive"/>
                                    <span className="font-black">خصم رصيد</span>
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="font-black text-sm">المبلغ (IQD)</Label>
                            <Input 
                                type="number" 
                                value={amount} 
                                onChange={(e) => setAmount(e.target.value)} 
                                className="h-20 rounded-[1.5rem] text-4xl font-black text-center bg-slate-50 border-none shadow-inner" 
                                placeholder="0" 
                            />
                        </div>

                        <Button 
                            className="w-full h-20 rounded-[2rem] text-2xl font-black shadow-2xl shadow-primary/30 active:scale-95 transition-all"
                            onClick={handleApply}
                            disabled={isSaving || !targetId || !amount}
                        >
                            {isSaving ? <Loader2 className="animate-spin h-8 w-8"/> : "تثبيت التعديل المالي"}
                        </Button>
                    </div>
                </Card>

                <div className="space-y-6">
                    <div className="p-8 bg-slate-900 text-white rounded-[3rem] space-y-4 shadow-xl border-t-8 border-t-primary">
                        <div className="p-4 bg-white/10 rounded-2xl w-fit"><Construction className="h-10 w-10 text-primary" /></div>
                        <h2 className="text-2xl font-black">تعليمات المطور</h2>
                        <ul className="space-y-4 font-bold text-slate-400 list-disc list-inside pr-2 text-sm leading-relaxed">
                            <li>هذا الإجراء يعدل مباشرة على "المحفظة السحابية الدائمة" (walletBalance).</li>
                            <li>المبلغ سيظهر فوراً في حساب المتجر أو المندوب.</li>
                            <li>هذه العملية نهائية ولا تعتمد على وجود طلبات في النظام.</li>
                            <li>استخدم الخصم فقط في حالات تسوية الحسابات المكتملة يدوياً.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
