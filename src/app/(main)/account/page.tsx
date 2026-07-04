"use client";

import { useContext } from 'react';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Home, PlusCircle, Trash2, MessageSquareHeart, Shield } from "lucide-react";
import { useAddresses } from "@/hooks/useAddresses";
import { AppContext } from '@/contexts/AppContext';

export default function AccountPage() {
  const context = useContext(AppContext);
  const { addresses, deleteAddress, isLoading } = useAddresses();

  if (!context) return null;
  const { setActiveTab } = context;

  if (isLoading) {
    return <div className="p-8 text-center animate-pulse">جار التحميل...</div>;
  }

  return (
    <div className="p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-4xl font-black text-primary">حسابي</h1>
        <p className="text-muted-foreground text-lg">إدارة معلوماتك وعناوينك</p>
      </header>

      <div className="grid grid-cols-1 gap-3">
         <button 
            onClick={() => setActiveTab(6)}
            className="flex items-center gap-4 p-4 bg-primary text-white rounded-[1.5rem] font-bold text-lg shadow-lg shadow-primary/20"
         >
            <PlusCircle className="h-6 w-6" />
            إضافة عنوان جديد
        </button>
        <div className="grid grid-cols-2 gap-3">
            <button 
                onClick={() => setActiveTab(7)}
                className="flex flex-col items-center justify-center gap-2 p-4 bg-card border-2 rounded-[1.5rem] font-bold text-primary transition-all active:bg-primary active:text-white"
            >
                <MessageSquareHeart className="h-8 w-8" />
                الدعم الفني
            </button>
            <button 
                onClick={() => setActiveTab(8)}
                className="flex flex-col items-center justify-center gap-2 p-4 bg-card border-2 rounded-[1.5rem] font-bold text-muted-foreground transition-all active:bg-muted"
            >
                <Shield className="h-8 w-8" />
                الخصوصية
            </button>
        </div>
      </div>
      

      <div className="space-y-4">
        <h2 className="text-2xl font-black">عناويني المسجلة</h2>
        {addresses.length === 0 ? (
          <div className="text-center p-12 bg-muted/20 rounded-[2rem] border-2 border-dashed">
            <p className="text-muted-foreground font-bold">لم تقم بإضافة أي عناوين حتى الآن.</p>
          </div>
        ) : (
          addresses.map((address) => (
            <Card key={address.id} className="rounded-[1.5rem] border-none shadow-md">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-secondary rounded-2xl">
                             <Home className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-xl font-bold">{address.name}</CardTitle>
                            <CardDescription className="text-lg font-medium">{address.phone}</CardDescription>
                        </div>
                    </div>
                    <button 
                        onClick={() => deleteAddress(address.id)}
                        className="p-2 text-destructive bg-destructive/10 rounded-xl"
                    >
                        <Trash2 className="h-5 w-5" />
                    </button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="p-3 bg-muted/30 rounded-xl">
                    <p className="font-bold text-primary">المنطقة: {address.deliveryZone}</p>
                    {address.details && <p className="text-muted-foreground mt-1">{address.details}</p>}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}