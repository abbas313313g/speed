
"use client";

import { useContext } from "react";
import Link from "next/link";
import { AppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, Phone, MapPin, LogOut, Shield, KeyRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AccountPage() {
  const context = useContext(AppContext);
  const { toast } = useToast();

  if (!context || !context.user) {
    return null; 
  }

  const { user, logout } = context;
  const userInitial = user.name ? user.name.charAt(0).toUpperCase() : '?';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
        title: "تم النسخ!",
        description: "تم نسخ الرمز السريع إلى الحافظة.",
    });
  };

  return (
    <div className="p-4 space-y-8">
      <header className="flex flex-col items-center space-y-4">
        <Avatar className="h-24 w-24 text-3xl">
            <AvatarFallback className="bg-primary text-primary-foreground">{userInitial}</AvatarFallback>
        </Avatar>
        <h1 className="text-2xl font-bold">{user.name}</h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>معلومات الحساب</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-lg">
           <div className="flex items-center gap-4">
                <User className="h-6 w-6 text-primary" />
                <span>{user.name}</span>
           </div>
           <div className="flex items-center gap-4">
                <Phone className="h-6 w-6 text-primary" />
                <span dir="ltr" className="text-left w-full">{user.phone}</span>
           </div>
           <div className="flex items-center gap-4">
                <MapPin className="h-6 w-6 text-primary" />
                <span>{user.deliveryZone.name}</span>
           </div>
           {user.loginCode && (
            <div className="flex items-center gap-4">
                  <KeyRound className="h-6 w-6 text-primary" />
                  <span 
                    className="font-bold text-lg cursor-pointer" 
                    onClick={() => copyToClipboard(user.loginCode!)}
                  >
                    {user.loginCode}
                  </span>
            </div>
           )}
        </CardContent>
      </Card>
      
      <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4 sm:space-x-reverse w-full">
        {user.isAdmin && (
            <Button asChild size="lg" className="flex-1 text-lg bg-accent hover:bg-accent/90">
                <Link href="/admin">
                    <Shield className="ml-2 h-5 w-5" />
                    لوحة التحكم
                </Link>
            </Button>
        )}
        <Button variant="destructive" size="lg" className="flex-1 text-lg" onClick={logout}>
            <LogOut className="ml-2 h-5 w-5" />
            تسجيل الخروج
        </Button>
      </div>
    </div>
  );
}
