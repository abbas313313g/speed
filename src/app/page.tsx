
"use client";

import { useContext, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppContext } from "@/contexts/AppContext";
import { Loader2, ShoppingCart } from "lucide-react";

export default function LandingPage() {
  const context = useContext(AppContext);
  const router = useRouter();

  useEffect(() => {
    // This page now only shows a loader and then redirects to login.
    // The login page itself will handle redirecting to /home if the user is already authenticated.
    if (context && !context.isAuthLoading) {
      router.replace("/login");
    }
  }, [context, context?.isAuthLoading, router]);

  return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
        <ShoppingCart className="h-16 w-16 animate-pulse text-primary" />
        <Loader2 className="mt-4 h-8 w-8 animate-spin text-primary" />
        <p className="mt-2 text-lg text-primary">جاري التحميل...</p>
      </div>
  );
}
