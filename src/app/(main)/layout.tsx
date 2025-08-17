
"use client";

import { useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppContext } from '@/contexts/AppContext';
import { BottomNav } from '@/components/BottomNav';
import { Loader2, ShoppingCart } from 'lucide-react';

// This layout is for the main application pages.
// It protects routes and ensures only authenticated users can access them.
export default function MainAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = useContext(AppContext);
  const router = useRouter();
  
  useEffect(() => {
    // If auth check is complete and there's no user, redirect to login.
    if (!context?.isAuthLoading && !context?.firebaseUser) {
      router.replace('/login');
    }
  }, [context?.isAuthLoading, context?.firebaseUser, router]);

  // While checking auth status OR if there is no user yet (and we are about to redirect), show a loader.
  if (context?.isAuthLoading || !context?.firebaseUser) {
    return (
       <div className="flex h-screen w-full flex-col items-center justify-center bg-muted/40 p-4">
         <ShoppingCart className="h-16 w-16 animate-pulse text-primary" />
         <Loader2 className="mt-4 h-8 w-8 animate-spin text-primary" />
       </div>
    );
  }
  
  // If an authenticated user exists, show the main app content.
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-card shadow-lg">
      <main className="flex-1 pb-20">{children}</main>
      <BottomNav />
    </div>
  );
}
