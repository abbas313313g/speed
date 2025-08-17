
"use client";

import { useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppContext } from '@/contexts/AppContext';
import { BottomNav } from '@/components/BottomNav';
import { Loader2, ShoppingCart } from 'lucide-react';

// This is the primary guard for all protected routes.
// It waits until auth is resolved, then checks for a user.
// If no user, it redirects to the login page.
export default function MainAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = useContext(AppContext);
  const router = useRouter();
  
  useEffect(() => {
    // Only redirect when auth is no longer loading and there is definitely no user.
    if (context && !context.isAuthLoading && !context.firebaseUser) {
      router.replace('/login');
    }
  }, [context?.isAuthLoading, context?.firebaseUser, router, context]);

  // Show a loading screen while auth state is being determined.
  if (context?.isAuthLoading || !context?.firebaseUser) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
        <ShoppingCart className="h-16 w-16 animate-pulse text-primary" />
        <Loader2 className="mt-4 h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If we have a user, render the main app layout.
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-card shadow-lg">
      <main className="flex-1 pb-20">{children}</main>
      <BottomNav />
    </div>
  );
}
