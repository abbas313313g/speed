
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
    if (context && !context.isAuthLoading && !context.firebaseUser) {
      router.replace('/login');
    }
  }, [context?.isAuthLoading, context?.firebaseUser, router, context]);

  // Show a loading screen while checking auth state, or if auth is checked but user data hasn't loaded yet.
  if (context?.isAuthLoading || !context?.user) {
    // If auth loading is done but there is no firebaseUser, the useEffect above will trigger a redirect.
    // We show a loader to prevent a flicker of content.
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
        <ShoppingCart className="h-16 w-16 animate-pulse text-primary" />
        <Loader2 className="mt-4 h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If auth is loaded and a user exists, show the main app content.
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-card shadow-lg">
      <main className="flex-1 pb-20">{children}</main>
      <BottomNav />
    </div>
  );
}
