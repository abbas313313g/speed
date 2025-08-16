"use client";

import { useContext, useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShoppingCart, KeyRound, Phone, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [step, setStep] = useState<'phone' | 'name'>('phone');
  const [isSigningIn, setIsSigningIn] = useState(false);
  
  const context = useContext(AppContext);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (context && !context.isLoading && context.user) {
        if(context.user.isProfileComplete) {
            router.replace('/home');
        } else {
            router.replace('/complete-profile');
        }
    }
  }, [context?.isLoading, context?.user, router]);


  const handlePhoneSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!phone.match(/^07[0-9]{9}$/)) {
        toast({ title: "رقم الهاتف غير صحيح", description: "الرجاء إدخال رقم هاتف عراقي صالح يبدأ بـ 07.", variant: "destructive" });
        return;
    }
    
    setIsSigningIn(true);
    const userExists = await context?.checkUserExists(phone);
    setIsSigningIn(false);

    if (userExists) {
        await handleLogin();
    } else {
        setStep('name');
    }
  };
  
  const handleLogin = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!context) return;
    
    setIsSigningIn(true);
    try {
        await context.login(phone, name);
        // The useEffect above will handle redirection
    } catch (error: any) {
        toast({ title: "فشل تسجيل الدخول", description: error.message, variant: "destructive" });
    } finally {
        setIsSigningIn(false);
    }
  }


  if (context?.isLoading || context?.user) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
        <ShoppingCart className="h-16 w-16 animate-pulse text-primary" />
        <Loader2 className="mt-4 h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
            <ShoppingCart className="h-12 w-12 mx-auto text-primary" />
            <h1 className="text-3xl font-bold text-primary mt-2">Speed Shop</h1>
        </div>
        <Card>
            <CardHeader>
                <CardTitle className="text-2xl">
                    {step === 'phone' ? 'تسجيل الدخول أو إنشاء حساب' : 'أهلاً بك! أدخل اسمك'}
                </CardTitle>
                <CardDescription>
                   {step === 'phone' 
                    ? 'أدخل رقم هاتفك للمتابعة.'
                    : `هذا حساب جديد. الرجاء إدخال اسمك الكامل.`
                   }
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {step === 'phone' ? (
                     <form onSubmit={handlePhoneSubmit}>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="phone">رقم الهاتف</Label>
                                <div className="relative">
                                    <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                    <Input
                                        id="phone"
                                        type="tel"
                                        placeholder="07xxxxxxxxx"
                                        required
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        dir="ltr"
                                        className="text-left pr-10 tracking-widest"
                                    />
                                </div>
                            </div>
                            <Button 
                                type="submit"
                                className="w-full h-11 text-lg" 
                                disabled={isSigningIn}
                            >
                                {isSigningIn ? <Loader2 className="ml-2 h-6 w-6 animate-spin" /> : 'متابعة'}
                            </Button>
                        </div>
                     </form>
                ) : (
                    <form onSubmit={handleLogin}>
                       <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">الاسم الكامل</Label>
                                <div className="relative">
                                    <User className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                    <Input
                                        id="name"
                                        type="text"
                                        placeholder="مثال: علي محمد"
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="pr-10"
                                    />
                                </div>
                            </div>
                            <Button 
                                type="submit"
                                className="w-full h-11 text-lg" 
                                disabled={isSigningIn || !name}
                            >
                                {isSigningIn ? <Loader2 className="ml-2 h-6 w-6 animate-spin" /> : 'إنشاء حساب'}
                            </Button>
                        </div>
                    </form>
                )}
               
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
