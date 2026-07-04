"use client";

import { useState } from 'react';
import { AdminNav } from '@/components/AdminNav';
import { Shield, KeyRound, PanelLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

// استيراد كافة أقسام الأدمن
import AdminDashboard from './page';
import AdminOrdersPage from './orders/page';
import AdminProductsPage from './products/page';
import AdminCategoriesPage from './categories/page';
import AdminStoresPage from './stores/page';
import AdminBannersPage from './banners/page';
import AdminDeliveryZonesPage from './delivery-zones/page';
import AdminCouponsPage from './coupons/page';
import AdminUsersPage from './users/page';
import AdminDeliveryWorkersPage from './delivery-workers/page';
import AdminReportsPage from './reports/page';
import AdminSupportTicketsPage from './support-tickets/page';
import AdminTelegramPage from './telegram/page';
import AdminSettingsPage from './settings/page';

const ADMIN_PIN = "31344313";

export default function AdminLayout() {
  const [pin, setPin] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const { toast } = useToast();

  const handleLogin = () => {
    if (pin === ADMIN_PIN) {
        setIsAuthenticated(true);
        toast({ title: "تم الدخول بنجاح" });
    } else {
        toast({ title: "الرمز السري غير صحيح", variant: "destructive" });
    }
  };

  if (!isAuthenticated) {
     return (
       <div className="flex h-screen w-full flex-col items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-sm rounded-[2rem] shadow-2xl border-none">
            <CardHeader className="text-center">
                <Shield className="h-16 w-16 mx-auto text-primary" />
                <CardTitle className="mt-4 text-2xl font-black">لوحة التحكم</CardTitle>
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
                        className="pr-10 h-14 rounded-2xl text-center text-2xl font-black"
                        dir="ltr"
                        onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    />
                </div>
                 <Button onClick={handleLogin} className="w-full h-14 rounded-2xl text-xl font-bold">
                    دخول
                </Button>
            </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="flex min-h-screen w-full justify-center bg-muted/20">
      <AdminNav onTabChange={setActiveTab} activeTab={activeTab} />
      <div className="flex w-full max-w-screen-xl flex-col sm:gap-4 sm:py-4 sm:pl-14">
         <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button size="icon" variant="outline" className="sm:hidden">
                <PanelLeft className="h-5 w-5" />
                <span className="sr-only">القائمة</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="sm:max-w-xs p-0">
               <SheetHeader className="p-4 border-b">
                 <SheetTitle>القائمة الرئيسية</SheetTitle>
               </SheetHeader>
               <AdminNav isSheet={true} onTabChange={setActiveTab} activeTab={activeTab} />
            </SheetContent>
          </Sheet>
          <div className="text-xl font-black text-primary sm:hidden">سبيد شوب - إشراف</div>
        </header>
        <main className="flex-1 relative overflow-hidden">
          <div 
            className="spa-stack-container" 
            style={{ 
              width: '1400%',
              transform: `translateX(${activeTab * (100 / 14)}%)` 
            }} 
          >
            <div className="spa-page-view px-4"><AdminDashboard /></div>
            <div className="spa-page-view px-4"><AdminOrdersPage /></div>
            <div className="spa-page-view px-4"><AdminProductsPage /></div>
            <div className="spa-page-view px-4"><AdminCategoriesPage /></div>
            <div className="spa-page-view px-4"><AdminStoresPage /></div>
            <div className="spa-page-view px-4"><AdminBannersPage /></div>
            <div className="spa-page-view px-4"><AdminDeliveryZonesPage /></div>
            <div className="spa-page-view px-4"><AdminCouponsPage /></div>
            <div className="spa-page-view px-4"><AdminUsersPage /></div>
            <div className="spa-page-view px-4"><AdminDeliveryWorkersPage /></div>
            <div className="spa-page-view px-4"><AdminReportsPage /></div>
            <div className="spa-page-view px-4"><AdminSupportTicketsPage /></div>
            <div className="spa-page-view px-4"><AdminTelegramPage /></div>
            <div className="spa-page-view px-4"><AdminSettingsPage /></div>
          </div>
        </main>
      </div>
    </div>
  );
}