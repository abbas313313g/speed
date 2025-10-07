
"use client";

import { BottomNav } from '@/components/BottomNav';
import { useAppSettings } from '@/hooks/useAppSettings';
import { HardHat, Loader2 } from 'lucide-react';

export default function MainAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { settings, isLoading } = useAppSettings();

  if (isLoading) {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
            <Loader2 className="h-8 w-8 animate-spin text-primary"/>
        </div>
    );
  }

  if (settings?.isMaintenanceMode) {
    return (
         <div className="flex h-screen w-full flex-col items-center justify-center bg-muted/40 p-4 text-center">
            <HardHat className="h-20 w-20 text-primary mb-6"/>
            <h1 className="text-3xl font-bold mb-2">التطبيق في وضع الصيانة</h1>
            <p className="text-muted-foreground text-lg">نحن نعمل على تحسين تجربتك. سنعود قريبًا!</p>
        </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-card shadow-lg">
      <main className="flex-1 pb-20">{children}</main>
      <BottomNav />
    </div>
  );
}
