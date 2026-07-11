
"use client";

import { useState, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Bike, KeyRound, Loader2, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useDeliveryWorkers } from '@/hooks/useDeliveryWorkers';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface DeliveryLoginPageProps {
    onLogin?: () => void;
}

export default function DeliveryLoginPage({ onLogin }: DeliveryLoginPageProps) {
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const { updateWorkerStatus } = useDeliveryWorkers();

    const handleLogin = async (e: FormEvent) => {
        e.preventDefault();
        if (!phone || !password) return;
        setIsLoading(true);
        try {
            const workerDocRef = doc(db, "deliveryWorkers", phone);
            const workerDoc = await getDoc(workerDocRef);
            
            if (workerDoc.exists()) {
                const worker = workerDoc.data();
                if (worker.password === password) {
                    localStorage.setItem('deliveryWorkerId', phone);
                    await updateWorkerStatus(phone, true);
                    toast({ title: `أهلاً بك كابتن ${worker.name}` });
                    if (onLogin) onLogin();
                } else {
                    toast({ title: "كلمة المرور غير صحيحة", variant: "destructive" });
                }
            } else {
                toast({ title: "عذراً، هذا الحساب غير موجود. يرجى مراجعة الإدارة.", variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "خطأ في الاتصال", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-muted/40 p-4">
            <Card className="w-full max-w-sm rounded-[2rem] shadow-2xl border-none overflow-hidden">
                <CardHeader className="text-center bg-primary text-white pb-8">
                    <div className="p-4 bg-white/20 rounded-full w-fit mx-auto mb-4 backdrop-blur-md">
                        <Bike className="h-10 w-10 text-white" />
                    </div>
                    <CardTitle className="text-3xl font-black italic">بوابة المناديب</CardTitle>
                    <CardDescription className="text-white/80 font-bold">تسجيل دخول كابتن سبيد</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-8">
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold pr-1">رقم الهاتف</label>
                            <div className="relative">
                                <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input type="tel" placeholder="07XXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} className="pr-10 h-14 rounded-2xl text-xl font-bold" dir="ltr" required />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold pr-1">كلمة المرور</label>
                            <div className="relative">
                                <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pr-10 h-14 rounded-2xl text-xl font-bold text-center" dir="ltr" required />
                            </div>
                        </div>
                        <Button type="submit" className="w-full h-14 rounded-2xl text-xl font-black shadow-xl shadow-primary/20" disabled={isLoading}>
                            {isLoading ? <Loader2 className="animate-spin h-6 w-6"/> : "دخول للعمل"}
                        </Button>
                    </form>
                    <p className="text-center text-[10px] text-muted-foreground font-bold italic">في حال واجهت مشكلة، تواصل مع مدير النظام.</p>
                </CardContent>
            </Card>
        </div>
    )
}
