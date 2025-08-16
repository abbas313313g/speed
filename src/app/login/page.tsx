
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
import { Loader2, ShoppingCart, KeyRound, Mail, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function LoginPage() {
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  
  const context = useContext(AppContext);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (context?.user) {
        if(context.user.isProfileComplete) {
            router.replace('/home');
        } else {
            router.replace('/complete-profile');
        }
    }
  }, [context?.user, router]);


  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!context) return;
    setIsLoading(true);
    try {
        await context.loginWithEmail(loginEmail, loginPassword);
        // useEffect will handle redirection
    } catch (error: any) {
        toast({ title: "فشل تسجيل الدخول", description: error.message, variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  }

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
     if (!context) return;
    setIsLoading(true);
    try {
        await context.signupWithEmail(signupEmail, signupPassword, signupName);
         // useEffect will handle redirection
    } catch (error: any) {
        toast({ title: "فشل إنشاء الحساب", description: error.message, variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  }


  if (context?.isAuthLoading || context?.user) {
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
        <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">تسجيل الدخول</TabsTrigger>
                <TabsTrigger value="signup">إنشاء حساب</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl">مرحباً بعودتك</CardTitle>
                        <CardDescription>أدخل بريدك الإلكتروني وكلمة المرور للمتابعة.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleLogin} className="space-y-4">
                             <div className="space-y-2">
                                <Label htmlFor="login-email">البريد الإلكتروني</Label>
                                <div className="relative">
                                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                    <Input id="login-email" type="email" placeholder="example@mail.com" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="pr-10" dir="ltr"/>
                                </div>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="login-password">كلمة المرور</Label>
                                <div className="relative">
                                    <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                    <Input id="login-password" type="password" required value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="pr-10" dir="ltr"/>
                                </div>
                            </div>
                            <Button type="submit" className="w-full h-11 text-lg" disabled={isLoading}>
                                {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : 'تسجيل الدخول'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="signup">
                 <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl">إنشاء حساب جديد</CardTitle>
                        <CardDescription>أدخل بياناتك للانضمام إلينا.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <form onSubmit={handleSignup} className="space-y-4">
                             <div className="space-y-2">
                                <Label htmlFor="signup-name">الاسم الكامل</Label>
                                <div className="relative">
                                    <User className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                    <Input id="signup-name" type="text" placeholder="مثال: علي محمد" required value={signupName} onChange={(e) => setSignupName(e.target.value)} className="pr-10" />
                                </div>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="signup-email">البريد الإلكتروني</Label>
                                <div className="relative">
                                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                    <Input id="signup-email" type="email" placeholder="example@mail.com" required value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} className="pr-10" dir="ltr"/>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="signup-password">كلمة المرور</Label>
                                <div className="relative">
                                    <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                    <Input id="signup-password" type="password" required value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} className="pr-10" dir="ltr"/>
                                </div>
                            </div>
                            <Button type="submit" className="w-full h-11 text-lg" disabled={isLoading}>
                                {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : 'إنشاء حساب'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
