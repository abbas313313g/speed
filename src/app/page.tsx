
"use client";

import { useEffect, useContext } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShoppingCart } from "lucide-react";
import { AppContext } from "@/contexts/AppContext";

export default function LandingPage() {
  const router = useRouter();
  const context = useContext(AppContext);

  useEffect(() => {
    // This page only waits for the initial auth state to be known.
    // The actual route protection is handled by the layout.
    // We just redirect to a protected route and let the layout decide.
    if (context && !context.isAuthLoading) {
      router.replace("/home");
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
