
"use client";

import { useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppContext } from '@/contexts/AppContext';
import { Loader2, ShoppingCart } from 'lucide-react';

// This layout is for the auth pages (like /login, /signup)
// It redirects authenticated users to the home page.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = useContext(AppContext);
  const router = useRouter();

  useEffect(() => {
    // If auth is not loading and a user exists, redirect them away from auth pages.
    if (!context?.isAuthLoading && context?.firebaseUser) {
      router.replace('/home');
    }
  }, [context?.isAuthLoading, context?.firebaseUser, router]);

  // While checking auth OR if user is logged in and we are about to redirect, show a loader.
  if (context?.isAuthLoading || context?.firebaseUser) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
        <ShoppingCart className="h-16 w-16 animate-pulse text-primary" />
        <Loader2 className="mt-4 h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If user is not authenticated (and not loading), show the auth page (login/signup form).
  return <>{children}</>;
}
