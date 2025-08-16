
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
  
  useEffect(() => {
    if (context?.isAuthLoading) {
      return; // انتظر حتى ينتهي تحميل المصادقة
    }

    if (!context?.firebaseUser) {
      // إذا انتهى التحميل ولا يوجد مستخدم، وجهه لصفحة تسجيل الدخول
      router.replace('/login');
    }
    
  }, [context?.isAuthLoading, context?.firebaseUser, router]);

  // أظهر شاشة التحميل طالما أن المصادقة قيد التحميل، أو إذا كان المستخدم موجودًا ولكن بياناته لم تحمل بعد
  if (context?.isAuthLoading || !context?.user) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
        <ShoppingCart className="h-16 w-16 animate-pulse text-primary" />
        <Loader2 className="mt-4 h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // إذا انتهى التحميل وكان المستخدم موجودًا، أظهر المحتوى
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-card shadow-lg">
      <main className="flex-1 pb-20">{children}</main>
      <BottomNav />
    </div>
  );
}
