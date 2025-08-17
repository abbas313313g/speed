
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShoppingCart } from "lucide-react";

// This page's only job is to redirect to the home page.
export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/home");
  }, [router]);

  // Render a loading indicator while the redirect is happening.
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
        <ShoppingCart className="h-16 w-16 animate-pulse text-primary" />
        <Loader2 className="mt-4 h-8 w-8 animate-spin text-primary" />
      </div>
  );
}
