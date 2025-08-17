
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShoppingCart } from "lucide-react";

export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    // This page's only job is to redirect to a protected route.
    // The actual logic of whether to show the page or redirect to login
    // is handled by the protector layout.
    router.replace("/home");
  }, [router]);

  // Show a loading screen while the redirect is happening.
  return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
        <ShoppingCart className="h-16 w-16 animate-pulse text-primary" />
        <Loader2 className="mt-4 h-8 w-8 animate-spin text-primary" />
        <p className="mt-2 text-lg text-primary">جاري التحميل...</p>
      </div>
  );
}
