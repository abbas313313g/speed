
"use client";

import { useContext, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppContext } from "@/contexts/AppContext";
import { Loader2, ShoppingCart } from "lucide-react";

export default function LandingPage() {
  const context = useContext(AppContext);
  const router = useRouter();

  useEffect(() => {
    if (context && !context.isAuthLoading) {
      if (context.user) {
        if (context.user.isProfileComplete) {
            router.replace("/home");
        } else {
            router.replace("/complete-profile");
        }
      } else {
        router.replace("/login");
      }
    }
  }, [context, router]);

  return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
        <ShoppingCart className="h-16 w-16 animate-pulse text-primary" />
        <Loader2 className="mt-4 h-8 w-8 animate-spin text-primary" />
        <p className="mt-2 text-lg text-primary">جاري التحميل...</p>
      </div>
  );
}
