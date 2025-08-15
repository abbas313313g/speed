
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
import { Loader2, ShoppingCart, KeyRound, Phone } from "lucide-react";

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const context = useContext(AppContext);
  const router = useRouter();

  useEffect(() => {
    // Redirect only if user is already logged in
    if (context && !context.isLoading && context.user) {
      router.replace('/home');
    }
  }, [context?.isLoading, context?.user, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!context || !phone || !password) return;
    setLoading(true);

    const success = await context.login(phone, password);
    setLoading(false);

    if (success) {
      router.push('/home');
    }
  };
  
  // This screen should not be accessible if the user is already logged in,
  // but we show a loader while the context is loading to prevent flicker.
  if (context?.isLoading || context?.user) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
        <ShoppingCart className="h-16 w-16 animate-pulse text-primary" />
        <Loader2 className="mt-4 h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show the form if there is no user logged in
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
                        onChange={(e) => setPhone(e.target.value)}
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
                        onChange={(e) => setPassword(e.target.value)}
                        dir="ltr"
                        className="text-left pr-10"
                        />
                    </div>
                </div>
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
