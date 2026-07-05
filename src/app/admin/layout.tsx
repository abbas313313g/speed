
"use client";

import { useState } from 'react';
import { AdminNav } from '@/components/AdminNav';
import { Shield, KeyRound, PanelLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';

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
    <div className="flex h-screen w-full bg-background overflow-hidden" dir="rtl">
      {/* القائمة الجانبية الثابتة والمعزولة */}
      <aside className="sticky inset-y-0 right-0 z-50 hidden w-16 flex-col border-l bg-card sm:flex shadow-xl shrink-0 overflow-hidden">
         <AdminNav onTabChange={setActiveTab} activeTab={activeTab} />
      </aside>
      
      <div className="flex flex-1 flex-col relative overflow-hidden">
         <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-4 border-b bg-background px-4 sm:h-16 sm:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button size="icon" variant="outline" className="sm:hidden">
                <PanelLeft className="h-5 w-5" />
                <span className="sr-only">القائمة</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="sm:max-w-xs p-0 overflow-hidden flex flex-col">
               <SheetHeader className="p-4 border-b text-right shrink-0">
                 <SheetTitle>لوحة التحكم</SheetTitle>
               </SheetHeader>
               <div className="flex-1 overflow-hidden">
                  <AdminNav isSheet={true} onTabChange={setActiveTab} activeTab={activeTab} />
               </div>
            </SheetContent>
          </Sheet>
          <div className="text-xl font-black text-primary sm:hidden">سبيد شوب - إشراف</div>
          <div className="hidden sm:block text-2xl font-black text-primary">لوحة التحكم الإدارية</div>
        </header>

        {/* مكدس الصفحات - يملأ المساحة بدقة 100% مع دعم التمرير */}
        <main className="flex-1 relative overflow-hidden bg-muted/5">
          <div 
            className="spa-stack-container" 
            style={{ 
              transform: `translateX(${activeTab * 100}%)` 
            }} 
          >
            <div className="spa-page-view flex-shrink-0"><ScrollArea className="h-full w-full px-4 py-6 sm:px-8"><AdminDashboard /></ScrollArea></div>
            <div className="spa-page-view flex-shrink-0"><ScrollArea className="h-full w-full px-4 py-6 sm:px-8"><AdminOrdersPage /></ScrollArea></div>
            <div className="spa-page-view flex-shrink-0"><ScrollArea className="h-full w-full px-4 py-6 sm:px-8"><AdminProductsPage /></ScrollArea></div>
            <div className="spa-page-view flex-shrink-0"><ScrollArea className="h-full w-full px-4 py-6 sm:px-8"><AdminCategoriesPage /></ScrollArea></div>
            <div className="spa-page-view flex-shrink-0"><ScrollArea className="h-full w-full px-4 py-6 sm:px-8"><AdminStoresPage /></ScrollArea></div>
            <div className="spa-page-view flex-shrink-0"><ScrollArea className="h-full w-full px-4 py-6 sm:px-8"><AdminBannersPage /></ScrollArea></div>
            <div className="spa-page-view flex-shrink-0"><ScrollArea className="h-full w-full px-4 py-6 sm:px-8"><AdminDeliveryZonesPage /></ScrollArea></div>
            <div className="spa-page-view flex-shrink-0"><ScrollArea className="h-full w-full px-4 py-6 sm:px-8"><AdminCouponsPage /></ScrollArea></div>
            <div className="spa-page-view flex-shrink-0"><ScrollArea className="h-full w-full px-4 py-6 sm:px-8"><AdminUsersPage /></ScrollArea></div>
            <div className="spa-page-view flex-shrink-0"><ScrollArea className="h-full w-full px-4 py-6 sm:px-8"><AdminDeliveryWorkersPage /></ScrollArea></div>
            <div className="spa-page-view flex-shrink-0"><ScrollArea className="h-full w-full px-4 py-6 sm:px-8"><AdminReportsPage /></ScrollArea></div>
            <div className="spa-page-view flex-shrink-0"><ScrollArea className="h-full w-full px-4 py-6 sm:px-8"><AdminSupportTicketsPage /></ScrollArea></div>
            <div className="spa-page-view flex-shrink-0"><ScrollArea className="h-full w-full px-4 py-6 sm:px-8"><AdminTelegramPage /></ScrollArea></div>
            <div className="spa-page-view flex-shrink-0"><ScrollArea className="h-full w-full px-4 py-6 sm:px-8"><AdminSettingsPage /></ScrollArea></div>
          </div>
        </main>
      </div>
    </div>
  );
}
