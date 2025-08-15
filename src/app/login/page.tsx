
"use client";

import { useState, useContext, FormEvent, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShoppingCart, KeyRound, Phone, Hash } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loginCode, setLoginCode] = useState("");
  const [loading, setLoading] = useState(false);
  const context = useContext(AppContext);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (context && !context.isLoading && context.user) {
      router.replace('/home');
    }
  }, [context, router]);


  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!context) return;
    setLoading(true);

    setTimeout(() => {
        let success = false;
        if(loginCode) {
            success = context.login(loginCode);
        } else {
            success = context.login(phone, password);
        }

      if (success) {
        router.push('/home');
      } else {
        toast({
          title: "فشل تسجيل الدخول",
          description: "المعلومات التي أدخلتها غير صحيحة.",
          variant: "destructive",
        });
        setLoading(false);
      }
    }, 500);
  };
  
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
          <Link href="/" className="inline-block">
            <ShoppingCart className="h-12 w-12 mx-auto text-primary" />
          </Link>
          <h1 className="text-3xl font-bold text-primary mt-2">Speed Shop</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">تسجيل الدخول</CardTitle>
            <CardDescription>
              ادخل معلومات حسابك للمتابعة
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
                <Tabs defaultValue="password">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="password">كلمة المرور</TabsTrigger>
                        <TabsTrigger value="code">الرمز السريع</TabsTrigger>
                    </TabsList>
                    <TabsContent value="password" className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <Label htmlFor="phone">رقم الهاتف</Label>
                            <div className="relative">
                                <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input
                                id="phone"
                                type="tel"
                                placeholder="ادخل رقم هاتفك"
                                required
                                value={phone}
                                onChange={(e) => { setPhone(e.target.value); setLoginCode(""); }}
                                dir="ltr"
                                className="text-left pr-10"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">كلمة المرور</Label>
                            <div className="relative">
                                <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input
                                id="password"
                                type="password"
                                placeholder="ادخل كلمة المرور"
                                required
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); setLoginCode(""); }}
                                dir="ltr"
                                className="text-left pr-10"
                                />
                            </div>
                        </div>
                    </TabsContent>
                     <TabsContent value="code" className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <Label htmlFor="loginCode">الرمز السريع</Label>
                            <div className="relative">
                                <Hash className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input
                                id="loginCode"
                                type="text"
                                placeholder="أدخل رمز الدخول السريع"
                                required
                                value={loginCode}
                                onChange={(e) => { setLoginCode(e.target.value); setPhone(""); setPassword(""); }}
                                dir="ltr"
                                className="text-left pr-10"
                                />
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
                <div className="flex gap-2 w-full">
                    <Button type="submit" className="flex-1" disabled={loading}>
                        {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                        دخول
                    </Button>
                     <Button asChild variant="outline" className="flex-1">
                        <Link href="/signup">إنشاء حساب جديد</Link>
                    </Button>
                </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
