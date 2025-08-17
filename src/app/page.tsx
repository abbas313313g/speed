
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// This page's only job is to redirect to the home page.
export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/home");
  }, [router]);

  // Render nothing, or a minimal loader, as the redirect is very fast.
  return null;
}
