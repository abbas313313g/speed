
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
    if (!context?.isLoading && (!context?.user || !context.user.isAdmin)) {
      router.replace('/login');
    }
  }, [context?.isLoading, context?.user, router]);

  if (context?.isLoading || !context?.user || !context.user.isAdmin) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
        <Shield className="h-16 w-16 animate-pulse text-primary" />
        <Loader2 className="mt-4 h-8 w-8 animate-spin text-primary" />
        <p className="mt-2">جاري التحقق من صلاحيات المدير...</p>
      </div>
    );
  }
  
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
