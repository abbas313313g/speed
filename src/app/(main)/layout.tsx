
"use client";

import { useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
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
  const pathname = usePathname();
  
  useEffect(() => {
    if (!context || context.isLoading) {
      return; // Wait for context to load
    }

    if (!context.user) {
      // If no user, redirect to login
      router.replace('/login');
    } else if (!context.user.isProfileComplete && pathname !== '/complete-profile') {
      // If user exists but profile is incomplete, redirect to complete-profile
      router.replace('/complete-profile');
    }

  }, [context, router, pathname]);

  // Show a loading screen while the context is loading OR if there is no user yet
  // OR if the profile is not complete. This prevents a flash of content before redirect.
  if (!context || context.isLoading || !context.user || (!context.user.isProfileComplete && pathname !== '/complete-profile')) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
        <ShoppingCart className="h-16 w-16 animate-pulse text-primary" />
        <Loader2 className="mt-4 h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-card shadow-lg">
      <main className="flex-1 pb-20">{children}</main>
      <BottomNav />
    </div>
  );
}

    