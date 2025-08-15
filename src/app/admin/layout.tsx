
"use client";

import { useState, useEffect } from 'react';
import { AdminNav } from '@/components/AdminNav';
import { Shield, KeyRound, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

const ADMIN_SECRET_CODE = '31344313';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isVerified, setIsVerified] = useState(false);
  const [inputCode, setInputCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const verified = sessionStorage.getItem('admin_verified') === 'true';
    setIsVerified(verified);
  }, []);

  const handleVerify = () => {
      setIsLoading(true);
      setTimeout(() => {
        if (inputCode === ADMIN_SECRET_CODE) {
            sessionStorage.setItem('admin_verified', 'true');
            setIsVerified(true);
        } else {
            toast({
                title: "رمز غير صحيح",
                description: "الرمز الذي أدخلته غير صحيح. الرجاء المحاولة مرة أخرى.",
                variant: "destructive"
            })
        }
        setIsLoading(false);
      }, 500);
  }
  
  if (!isVerified) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-sm">
            <CardHeader className="text-center">
                <Shield className="h-12 w-12 mx-auto text-primary" />
                <CardTitle className="mt-4">دخول لوحة التحكم</CardTitle>
                <CardDescription>الرجاء إدخال الرمز السري للوصول.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="relative">
                    <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input 
                        type="password"
                        placeholder="الرمز السري"
                        value={inputCode}
                        onChange={(e) => setInputCode(e.target.value)}
                        className="pr-10 text-center"
                        onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                    />
                </div>
                <Button onClick={handleVerify} className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                    تحقق
                </Button>
            </CardContent>
        </Card>
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
