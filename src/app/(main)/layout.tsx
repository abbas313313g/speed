
"use client";

import { useContext, useEffect, useState } from 'react';
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
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!context) return;
    
    // Give context a moment to load user data from localStorage
    if (context.isLoading) {
      return;
    }
    
    // If loading is finished, perform the check
    if (!context.user) {
      router.replace('/');
    } else {
      setIsChecking(false);
    }

  }, [context, router]);

  if (isChecking || context?.isLoading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
        <ShoppingCart className="h-16 w-16 animate-pulse text-primary" />
        <Loader2 className="mt-4 h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Final check after loading is complete
  if (!context?.user) {
    // This will show the loader while redirecting
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
