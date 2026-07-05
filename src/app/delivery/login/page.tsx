
"use client";

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Bike, KeyRound, Loader2, User, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useDeliveryWorkers } from '@/hooks/useDeliveryWorkers';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface DeliveryLoginPageProps {
    onLogin?: () => void;
}

export default function DeliveryLoginPage({ onLogin }: DeliveryLoginPageProps) {
    const [step, setStep] = useState(1); // 1: phone, 2: login (pass), 3: register
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const router = useRouter();
    const { toast } = useToast();
    const { addDeliveryWorker, updateWorkerStatus } = useDeliveryWorkers();

    const checkPhone = async (e: FormEvent) => {
        e.preventDefault();
        if (!phone.trim()) return;
        setIsLoading(true);
        try {
            const docRef = doc(db, "deliveryWorkers", phone);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                setStep(2); // Exist -> Password
            } else {
                setStep(3); // New -> Register
            }
        } catch (e) {
            toast({ title: "خطأ في الاتصال", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }

    const handleLogin = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const workerDocRef = doc(db, "deliveryWorkers", phone);
            const workerDoc = await getDoc(workerDocRef);
            const worker = workerDoc.data();

            if (worker?.password === password) {
                localStorage.setItem('deliveryWorkerId', phone);
                await updateWorkerStatus(phone, true);
                toast({ title: `أهلاً بك مجدداً ${worker.name}` });
                if (onLogin) onLogin();
                router.push('/delivery');
            } else {
                toast({ title: "كلمة المرور غير صحيحة", variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "فشل تسجيل الدخول", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleRegister = async (e: FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !password.trim()) {
            toast({ title: 'يرجى إكمال البيانات', variant: 'destructive'});
            return;
        }
        setIsLoading(true);
        try {
            const success = await addDeliveryWorker({ id: phone, name, password });
            if (success) {
                localStorage.setItem('deliveryWorkerId', phone);
                await updateWorkerStatus(phone, true);
                toast({ title: `تم التسجيل بنجاح، أهلاً بك ${name}`});
                if (onLogin) onLogin();
                router.push('/delivery');
            }
        } catch (error) {
            toast({ title: "فشل التسجيل", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-muted/40 p-4">
            <Card className="w-full max-w-sm rounded-[2rem] shadow-2xl border-none">
                <CardHeader className="text-center">
                    <div className="p-4 bg-primary/10 rounded-full w-fit mx-auto mb-2">
                        <Bike className="h-10 w-10 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-black">بوابة المناديب</CardTitle>
                    <CardDescription className="font-bold">
                        {step === 1 && "أدخل رقم هاتفك للبدء"}
                        {step === 2 && "مرحباً بك، أدخل كلمة المرور"}
                        {step === 3 && "رقم جديد! أنشئ حسابك الآن"}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {step === 1 && (
                        <form onSubmit={checkPhone} className="space-y-4">
                            <div className="relative">
                                <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input 
                                    type="tel" 
                                    placeholder="رقم الهاتف" 
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="pr-10 h-14 rounded-2xl text-center text-xl font-bold"
                                    dir="ltr"
                                    required
                                />
                            </div>
                            <Button type="submit" className="w-full h-14 rounded-2xl text-lg font-black" disabled={isLoading}>
                                {isLoading ? <Loader2 className="animate-spin h-6 w-6"/> : "متابعة"}
                            </Button>
                        </form>
                    )}

                    {step === 2 && (
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="relative">
                                <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input 
                                    type="password" 
                                    placeholder="كلمة المرور" 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="pr-10 h-14 rounded-2xl text-center text-xl font-bold"
                                    dir="ltr"
                                    required
                                    autoFocus
                                />
                            </div>
                            <Button type="submit" className="w-full h-14 rounded-2xl text-lg font-black" disabled={isLoading}>
                                {isLoading ? <Loader2 className="animate-spin h-6 w-6"/> : "دخول الآن"}
                            </Button>
                            <Button variant="ghost" onClick={() => setStep(1)} className="w-full font-bold">تغيير الرقم</Button>
                        </form>
                    )}

                    {step === 3 && (
                        <form onSubmit={handleRegister} className="space-y-4">
                            <div className="space-y-4">
                                <div className="relative">
                                    <User className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                    <Input 
                                        placeholder="الاسم الكامل" 
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="pr-10 h-14 rounded-2xl font-bold"
                                        required
                                    />
                                </div>
                                <div className="relative">
                                    <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                    <Input 
                                        type="password" 
                                        placeholder="اختر كلمة مرور" 
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="pr-10 h-14 rounded-2xl font-bold text-center"
                                        required
                                    />
                                </div>
                            </div>
                            <Button type="submit" className="w-full h-14 rounded-2xl text-lg font-black bg-green-600 hover:bg-green-700" disabled={isLoading}>
                                {isLoading ? <Loader2 className="animate-spin h-6 w-6"/> : "إنشاء حساب ودخول"}
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
