
"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// This page is no longer needed with the new login system.
// We redirect users to the login page.
export default function SignupPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/login');
  }, [router]);

  return null;
}
