
"use client";

import { useContext, useEffect } from 'react';
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

  useEffect(() => {
    // Only check and redirect if context is loaded and user is not an admin
    if (context && !context.isLoading && (!context.user || !context.user.isAdmin)) {
      router.replace('/login');
    }
  }, [context, router]);
  
  // While loading, or if context is not yet available, show a spinner.
  if (!context || context.isLoading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
        <Shield className="h-16 w-16 animate-pulse text-primary" />
        <Loader2 className="mt-4 h-8 w-8 animate-spin text-primary" />
        <p className="mt-2">جاري التحقق من صلاحيات المدير...</p>
      </div>
    );
  }

  // If after loading, the user is still not an admin, they will be redirected. 
  // We can render null or a loader while the redirection is in progress.
  if (!context.user || !context.user.isAdmin) {
    return null; // or the loader component, returning null avoids a flash of content
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
