
"use client";

import { useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppContext } from '@/contexts/AppContext';
import { BottomNav } from '@/components/BottomNav';
import { Loader2, ShoppingCart } from 'lucide-react';

export default function MainAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = useContext(AppContext);
  const router = useRouter();
  
  // This is the gatekeeper for the main part of the app.
  useEffect(() => {
    // Wait until loading is finished, then check for user.
    if (context && !context.isAuthLoading && !context.firebaseUser) {
      // If no user, redirect to login.
      router.replace('/login');
    }
  }, [context?.isAuthLoading, context?.firebaseUser, router, context]);

  // Show a loading screen while checking auth state.
  // This screen will show until the useEffect above decides where to redirect.
  if (context?.isAuthLoading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
        <ShoppingCart className="h-16 w-16 animate-pulse text-primary" />
        <Loader2 className="mt-4 h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If auth is loaded AND a user exists, show the main app content.
  // If no user exists, the useEffect will have already triggered a redirect, 
  // so we can render null here to avoid content flash.
  if (context?.firebaseUser) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col bg-card shadow-lg">
        <main className="flex-1 pb-20">{children}</main>
        <BottomNav />
      </div>
    );
  }

  // While redirecting, show nothing.
  return null;
}
