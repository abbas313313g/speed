
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
import { Loader2, ShoppingCart } from "lucide-react";

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const context = useContext(AppContext);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    // Redirect if user is already logged in
    if (context?.user) {
      router.replace(context.user.isAdmin ? '/admin' : '/home');
    }
  }, [context?.user, router]);


  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!context) return;
    setLoading(true);

    // Simulate API call
    setTimeout(() => {
      const success = context.login(phone);
      if (!success) {
        toast({
          title: "فشل تسجيل الدخول",
          description: "رقم الهاتف غير مسجل. الرجاء إنشاء حساب جديد.",
          variant: "destructive",
        });
      }
      // Redirection is handled by the login function via context state change
      setLoading(false);
    }, 1000);
  };

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
              أدخل رقم هاتفك للمتابعة
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">رقم الهاتف</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="07..."
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  dir="ltr"
                  className="text-left"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                تسجيل الدخول
              </Button>
              <p className="text-sm text-muted-foreground">
                ليس لديك حساب؟{" "}
                <Link href="/signup" className="font-semibold text-primary hover:underline">
                  إنشاء حساب
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
