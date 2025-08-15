
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
import { Loader2, ShoppingCart, KeyRound } from "lucide-react";

const ACCESS_CODE = "31344313";

export default function LoginPage() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const context = useContext(AppContext);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    // Redirect if user is already logged in
    if (context && !context.isLoading && context.user) {
      router.replace('/home');
    }
  }, [context, router]);


  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!context) return;
    setLoading(true);

    setTimeout(() => {
      if (context.login(code)) {
        router.push('/home');
      } else {
        toast({
          title: "فشل تسجيل الدخول",
          description: "رمز الدخول غير صحيح.",
          variant: "destructive",
        });
        setLoading(false);
      }
    }, 500);
  };
  
  if (context?.isLoading || (context && context.user)) {
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
              أدخل رمز الدخول للمتابعة.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
               <div className="space-y-2">
                <Label htmlFor="access-code">رمز الدخول</Label>
                 <div className="relative">
                    <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="access-code"
                      type="password"
                      placeholder="ادخل الرمز"
                      required
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      dir="ltr"
                      className="text-left pr-10"
                    />
                 </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                دخول
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
