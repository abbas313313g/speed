
"use client";

import { useContext, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Loader2, ShoppingCart } from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  const context = useContext(AppContext);
  const router = useRouter();

  useEffect(() => {
    if (!context?.isLoading && context?.user) {
      router.replace("/home");
    }
  }, [context?.isLoading, context?.user, router]);

  if (context?.isLoading || context?.user) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
        <ShoppingCart className="h-16 w-16 animate-pulse text-primary" />
        <Loader2 className="mt-4 h-8 w-8 animate-spin text-primary" />
        <p className="mt-2 text-lg text-primary">جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background p-4 text-center">
      <div className="flex items-center gap-4 mb-8">
        <ShoppingCart className="h-16 w-16 text-primary" />
        <h1 className="text-5xl font-bold text-primary font-headline">Speed Shop</h1>
      </div>
      <p className="mb-12 max-w-md text-xl text-foreground/80">
        أسرع طريقة لتوصيل طلباتك من أفضل المطاعم والمتاجر في مدينتك.
      </p>
      <div className="flex w-full max-w-xs flex-col gap-4 sm:flex-row">
        <Button asChild size="lg" className="flex-1 text-lg">
          <Link href="/login">تسجيل الدخول</Link>
        </Button>
         <Button asChild size="lg" variant="outline" className="flex-1 text-lg">
          <Link href="/signup">إنشاء حساب جديد</Link>
        </Button>
      </div>
    </div>
  );
}
