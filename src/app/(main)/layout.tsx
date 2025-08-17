
"use client";

import { useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppContext } from '@/contexts/AppContext';
import { BottomNav } from '@/components/BottomNav';
import { Loader2 } from 'lucide-react';

// This layout protects all the main application pages.
export default function MainAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = useContext(AppContext);
  const router = useRouter();

  useEffect(() => {
    // If auth is done loading and there's no user, redirect to login.
    if (!context?.isAuthLoading && !context?.firebaseUser) {
      router.replace('/login');
    }
  }, [context?.isAuthLoading, context?.firebaseUser, router]);

  // While checking for user, show a loading screen.
  if (context?.isAuthLoading || !context?.firebaseUser) {
    return (
       <div className="flex h-screen w-full flex-col items-center justify-center bg-background p-4">
         <Loader2 className="h-8 w-8 animate-spin text-primary" />
         <p className="mt-2 text-muted-foreground">جارِ التحقق...</p>
       </div>
    );
  }

  // If user is authenticated, show the main app.
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-card shadow-lg">
      <main className="flex-1 pb-20">{children}</main>
      <BottomNav />
    </div>
  );
}
