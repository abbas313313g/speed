

"use client";

import { useState, useContext, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AppContext } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Bike, KeyRound, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { DeliveryWorker } from '@/lib/types';


export default function DeliveryLoginPage() {
    const [step, setStep] = useState(1); // 1 for login, 2 for register
    const [phone, setPhone] = useState('');
    const [name, setName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const router = useRouter();
    const context = useContext(AppContext);
    const { toast } = useToast();

    if (!context) return <Loader2 className="h-8 w-8 animate-spin" />;

    const { deliveryWorkers, addDeliveryWorker, updateWorkerStatus } = context;

    const handleLogin = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        const worker = deliveryWorkers.find(w => w.id === phone);
        if (worker) {
            localStorage.setItem('deliveryWorkerId', worker.id);
            await updateWorkerStatus(worker.id, true);
            toast({ title: `مرحباً بعودتك ${worker.name}` });
            router.push('/delivery');
        } else {
            setStep(2); // Worker not found, move to registration step
        }
        setIsLoading(false);
    };
    
    const handleRegister = async (e: FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !phone.trim()) {
            toast({ title: 'الرجاء إدخال الاسم ورقم الهاتف', variant: 'destructive'});
            return;
        }
        setIsLoading(true);
        try {
            // First, create the worker record.
            await addDeliveryWorker({ id: phone, name });
            // Then, set them as online.
            await updateWorkerStatus(phone, true);
            
            localStorage.setItem('deliveryWorkerId', phone);
            toast({ title: `أهلاً بك ${name}!`});
            router.push('/delivery');
        } catch (error) {
            console.error("Registration failed:", error);
            toast({ title: "فشل التسجيل", description: "حدث خطأ ما، الرجاء المحاولة مرة أخرى", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-muted/40 p-4">
            {step === 1 && (
                <Card className="w-full max-w-sm">
                    <form onSubmit={handleLogin}>
                        <CardHeader className="text-center">
                            <Bike className="h-12 w-12 mx-auto text-primary" />
                            <CardTitle className="mt-4">بوابة التوصيل</CardTitle>
                            <CardDescription>الرجاء إدخال رقم هاتفك لتسجيل الدخول.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <div className="relative">
                                <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input 
                                    type="tel" 
                                    placeholder="رقم الهاتف" 
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="pr-10"
                                    dir="ltr"
                                    required
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin"/>}
                                دخول
                            </Button>
                        </CardContent>
                    </form>
                </Card>
            )}

            {step === 2 && (
                 <Card className="w-full max-w-sm">
                     <form onSubmit={handleRegister}>
                        <CardHeader className="text-center">
                            <Bike className="h-12 w-12 mx-auto text-primary" />
                            <CardTitle className="mt-4">إنشاء حساب جديد</CardTitle>
                            <CardDescription>يبدو أن هذا الرقم غير مسجل. الرجاء إدخال اسمك لإنشاء حساب.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label htmlFor="phone-display">رقم الهاتف</Label>
                                <Input id="phone-display" value={phone} disabled className="bg-muted"/>
                            </div>
                             <div>
                                <Label htmlFor="name">الاسم الكامل</Label>
                                <Input 
                                    id="name"
                                    type="text" 
                                    placeholder="اسمك الثلاثي" 
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin"/>}
                                تسجيل و دخول
                            </Button>
                        </CardContent>
                    </form>
                </Card>
            )}
        </div>
    )
}
