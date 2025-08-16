
"use client";

import { useContext, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppContext } from "@/contexts/AppContext";
import { Loader2, ShoppingCart } from "lucide-react";

export default function LandingPage() {
  const context = useContext(AppContext);
  const router = useRouter();

  useEffect(() => {
    // هذه الصفحة وظيفتها فقط الانتظار ثم التوجيه لصفحة تسجيل الدخول
    // صفحة تسجيل الدخول هي التي ستقرر توجيه المستخدم إلى الرئيسية أم لا
    if (context && !context.isAuthLoading) {
      router.replace("/login");
    }
  }, [context, context?.isAuthLoading, router]);

  // أظهر دائمًا شاشة التحميل
  return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
        <ShoppingCart className="h-16 w-16 animate-pulse text-primary" />
        <Loader2 className="mt-4 h-8 w-8 animate-spin text-primary" />
        <p className="mt-2 text-lg text-primary">جاري التحميل...</p>
      </div>
  );
}
