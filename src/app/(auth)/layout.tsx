
"use client";

import { useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppContext } from '@/contexts/AppContext';
import { Loader2 } from 'lucide-react';

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
    if (!context?.isAuthLoading && context?.firebaseUser) {
      router.replace('/home');
    }
  }, [context?.isAuthLoading, context?.firebaseUser, router]);

  // While checking auth state, show a loader.
  if (context?.isAuthLoading || context?.firebaseUser) {
     return (
       <div className="flex h-screen w-full flex-col items-center justify-center bg-background p-4">
         <Loader2 className="h-8 w-8 animate-spin text-primary" />
       </div>
    );
  }
  
  // If user is not authenticated (and not loading), show the auth page (login/signup form).
  return <>{children}</>;
}
