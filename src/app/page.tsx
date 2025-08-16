
"use client";

import { useContext, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppContext } from "@/contexts/AppContext";
import { Loader2, ShoppingCart } from "lucide-react";

export default function LandingPage() {
  const context = useContext(AppContext);
  const router = useRouter();

  useEffect(() => {
    // This page's only job is to wait for the initial auth state to be determined,
    // then redirect to the correct part of the app.
    if (context && !context.isAuthLoading) {
      if (context.firebaseUser) {
        // If user is logged in, go to the main app page.
        router.replace("/home");
      } else {
        // If no user, go to the login page.
        router.replace("/login");
      }
    }
  }, [context, context?.isAuthLoading, context?.firebaseUser, router]);

  // Always show a loading screen while we determine the auth state.
  return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
        <ShoppingCart className="h-16 w-16 animate-pulse text-primary" />
        <Loader2 className="mt-4 h-8 w-8 animate-spin text-primary" />
        <p className="mt-2 text-lg text-primary">جاري التحميل...</p>
      </div>
  );
}
