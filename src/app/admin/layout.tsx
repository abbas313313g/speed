
"use client";

import { useState, useEffect, useContext } from 'react';
import { AdminNav } from '@/components/AdminNav';
import { Shield, KeyRound, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { AppContext } from '@/contexts/AppContext';


export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = useContext(AppContext);

  // If AppContext is loading, show a full-screen loader
  if (context?.isLoading) {
    return (
       <div className="flex h-screen w-full flex-col items-center justify-center bg-muted/40 p-4">
         <Loader2 className="h-8 w-8 animate-spin text-primary" />
       </div>
    )
  }

  // If there's no user or the user is not an admin, show an access denied message.
  if (!context?.user?.isAdmin) {
     return (
       <div className="flex h-screen w-full flex-col items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-sm">
            <CardHeader className="text-center">
                <Shield className="h-12 w-12 mx-auto text-destructive" />
                <CardTitle className="mt-4">الوصول مرفوض</CardTitle>
                <CardDescription>أنت لا تملك الصلاحيات اللازمة للوصول لهذه الصفحة.</CardDescription>
            </CardHeader>
            <CardContent>
                 <Button onClick={() => window.location.href = '/home'} className="w-full">
                    العودة للتطبيق
                </Button>
            </CardContent>
        </Card>
      </div>
    );
  }
  
  // If the user is an admin, show the admin panel.
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
