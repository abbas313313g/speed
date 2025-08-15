
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
    if (context && !context.isLoading) {
      if (!context.user) {
        router.replace('/login');
      } else if (!context.user.isAdmin) {
         router.replace('/home'); // Redirect to home if not admin
      }
    }
  }, [context, context?.isLoading, context?.user, router]);
  
  if (context?.isLoading || !context?.user) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
        <Shield className="h-16 w-16 animate-pulse text-primary" />
        <Loader2 className="mt-4 h-8 w-8 animate-spin text-primary" />
        <p className="mt-2">جاري التحقق من صلاحيات المدير...</p>
      </div>
    );
  }
  
  if (!context.user.isAdmin) {
     return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
        <p className="mt-2 text-xl text-destructive">غير مصرح لك بالدخول.</p>
        <p className="text-muted-foreground">سيتم تحويلك للصفحة الرئيسية.</p>
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
