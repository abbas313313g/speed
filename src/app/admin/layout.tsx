
"use client";

import { useState } from 'react';
import { AdminNav } from '@/components/AdminNav';
import { Shield, KeyRound, PanelLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

const ADMIN_PIN = "31344313";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [pin, setPin] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { toast } = useToast();

  const handleLogin = () => {
    if (pin === ADMIN_PIN) {
        setIsAuthenticated(true);
        toast({ title: "تم تسجيل الدخول بنجاح" });
    } else {
        toast({ title: "الرمز السري غير صحيح", variant: "destructive" });
    }
  };

  if (!isAuthenticated) {
     return (
       <div className="flex h-screen w-full flex-col items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-sm">
            <CardHeader className="text-center">
                <Shield className="h-12 w-12 mx-auto text-primary" />
                <CardTitle className="mt-4">الوصول للوحة التحكم</CardTitle>
                <CardDescription>الرجاء إدخال الرمز السري للوصول.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="relative">
                    <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input 
                        type="password" 
                        placeholder="الرمز السري" 
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        className="pr-10"
                        dir="ltr"
                        onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    />
                </div>
                 <Button onClick={handleLogin} className="w-full">
                    دخول
                </Button>
            </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="flex min-h-screen w-full justify-center bg-muted/40">
      <AdminNav />
      <div className="flex w-full max-w-screen-xl flex-col sm:gap-4 sm:py-4 sm:pl-14">
         <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button size="icon" variant="outline" className="sm:hidden">
                <PanelLeft className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="sm:max-w-xs p-0">
               <SheetHeader className="p-4 border-b">
                 <SheetTitle>القائمة</SheetTitle>
               </SheetHeader>
               <AdminNav isSheet={true} />
            </SheetContent>
          </Sheet>
        </header>
        <main className="flex-1 p-4 sm:px-6 sm:py-0 md:gap-8 bg-background sm:bg-transparent overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
