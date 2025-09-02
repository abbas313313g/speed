
"use client";

import { AppContextProvider } from '@/contexts/AppContext';
import { Toaster } from "@/components/ui/toaster";

export function AppProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppContextProvider>
      {children}
      <Toaster />
    </AppContextProvider>
  );
}
