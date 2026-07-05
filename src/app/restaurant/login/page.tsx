
"use client";

import { useState, FormEvent, useContext } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { KeyRound, Loader2, Store, Hash } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { RestaurantContext } from '@/contexts/RestaurantContext';

interface RestaurantLoginPageProps {
  onLogin: () => void;
}

export default function RestaurantLoginPage({ onLogin }: RestaurantLoginPageProps) {
    const [restaurantNumber, setRestaurantNumber] = useState('');
    const [loginCode, setLoginCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const { toast } = useToast();
    const context = useContext(RestaurantContext);

    const handleLogin = async (e: FormEvent) => {
        e.preventDefault();
        if (!context) return;

        if (!restaurantNumber || !loginCode) {
            toast({ title: "الرجاء إدخال رقم المتجر والرمز السري", variant: "destructive" });
            return;
        }

        setIsLoading(true);
        const success = await context.login(restaurantNumber, loginCode);
        
        if (success) {
            toast({ title: "تم تسجيل الدخول بنجاح" });
            onLogin(); // هذا الزر الذي ينقلنا برمجياً داخل المكدس
        } else {
            toast({ title: "البيانات غير صحيحة", description: "تأكد من رقم المتجر والرمز السري الخاص بك.", variant: "destructive" });
        }
        setIsLoading(false);
    };

    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-muted/40 p-4">
            <Card className="w-full max-w-sm rounded-[2rem] shadow-2xl border-none">
                <form onSubmit={handleLogin}>
                    <CardHeader className="text-center">
                        <div className="p-4 bg-primary/10 rounded-full w-fit mx-auto mb-2">
                             <Store className="h-12 w-12 text-primary" />
                        </div>
                        <CardTitle className="text-2xl font-black italic">بوابة المطاعم</CardTitle>
                        <CardDescription className="font-bold">أدخل رقم متجرك والرمز السري للمتابعة.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <div className="relative">
                                <Hash className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input 
                                    type="text" 
                                    placeholder="رقم المتجر" 
                                    value={restaurantNumber}
                                    onChange={(e) => setRestaurantNumber(e.target.value)}
                                    className="pr-10 h-14 rounded-2xl text-center text-xl font-black"
                                    dir="ltr"
                                    required
                                />
                            </div>
                        </div>

                         <div className="space-y-2">
                            <div className="relative">
                                <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input 
                                    type="password" 
                                    placeholder="الرمز السري" 
                                    value={loginCode}
                                    onChange={(e) => setLoginCode(e.target.value)}
                                    className="pr-10 h-14 rounded-2xl text-center text-xl font-black"
                                    dir="ltr"
                                    required
                                />
                            </div>
                        </div>

                        <Button type="submit" className="w-full h-14 rounded-2xl text-xl font-black shadow-lg shadow-primary/20" disabled={isLoading}>
                            {isLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin"/>}
                            دخول للوحة التحكم
                        </Button>
                    </CardContent>
                </form>
            </Card>
            <p className="mt-8 text-muted-foreground text-xs font-bold">في حال فقدان الرمز، يرجى التواصل مع الإدارة.</p>
        </div>
    )
}
