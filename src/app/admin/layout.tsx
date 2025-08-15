
"use client";

import { useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppContext } from '@/contexts/AppContext';
import { AdminNav } from '@/components/AdminNav';
import { Loader2, Shield } from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = useContext(AppContext);
  const router = useRouter();

  // No separate state needed, we can rely on context.isLoading
  useEffect(() => {
    if (context && !context.isLoading) {
        if (!context.user || !context.user.isAdmin) {
            router.replace('/login');
        }
    }
  }, [context, router]);
  
  // While loading, show a spinner. This covers the initial hydration and user data loading.
  if (!context || context.isLoading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
        <Shield className="h-16 w-16 animate-pulse text-primary" />
        <Loader2 className="mt-4 h-8 w-8 animate-spin text-primary" />
        <p className="mt-2">جاري التحقق من صلاحيات المدير...</p>
      </div>
    );
  }

  // After loading, if user is not an admin, they will be redirected by the useEffect.
  // We can show a loader in the meantime, or just return null as the redirect is fast.
  // Rendering the layout only when we are sure the user is an admin is cleaner.
  if (!context.user || !context.user.isAdmin) {
    // This loader will be shown briefly while the router.replace() in useEffect is kicking in.
     return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
            <Shield className="h-16 w-16 animate-pulse text-primary" />
            <Loader2 className="mt-4 h-8 w-8 animate-spin text-primary" />
            <p className="mt-2">جاري التحقق من صلاحيات المدير...</p>
        </div>
    );
  }
  
  // If we reach here, user is loaded and is an admin.
  return (
    <div className="flex min-h-screen w-full bg-muted/40">
      <AdminNav />
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14 flex-grow">
        <main className="flex-1 p-4 sm:px-6 sm:py-0 md:gap-8 bg-background overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
