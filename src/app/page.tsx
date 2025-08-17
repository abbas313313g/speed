"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// This page's only job is to redirect to a protected route.
// The actual logic of whether to show the page or redirect to login
// is handled by the protector layout.
export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/home");
  }, [router]);

  // Nothing is rendered here, as the layout will handle the redirect.
  return null;
}
