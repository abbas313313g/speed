
"use client";

import { useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppContext } from '@/contexts/AppContext';
import { Loader2, ShoppingCart } from 'lucide-react';

// This layout protects the auth pages (like /login, /signup)
// If the user is ALREADY logged in, it redirects them to the main app.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = useContext(AppContext);
  const router = useRouter();

  useEffect(() => {
    // If auth is done loading AND we have a user, redirect away from login page
    if (context && !context.isAuthLoading && context.firebaseUser) {
      router.replace('/home');
    }
  }, [context?.isAuthLoading, context?.firebaseUser, router, context]);

  // While checking auth state, or if the user is already logged in (and redirecting), show a loader.
  // This prevents a flash of the login form for an already authenticated user.
  if (context?.isAuthLoading || context?.firebaseUser) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
        <ShoppingCart className="h-16 w-16 animate-pulse text-primary" />
        <Loader2 className="mt-4 h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // If not loading and no user, show the auth page content (e.g., the login form).
  return <>{children}</>;
}
