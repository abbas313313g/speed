
"use client";

import { useState, useEffect } from 'react';
import { AdminNav } from '@/components/AdminNav';
import { Shield, KeyRound, PanelLeft, Loader2, AlertCircle, Laptop } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAdminAccess } from '@/hooks/useAdminAccess';

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
import AdminApprovalsPage from './approvals/page';
import AdminAccessPage from './access-requests/page';

const ADMIN_PIN = "31344313";

export default function AdminLayout() {
  const [pin, setPin] = useState("");
  const [userIp, setUserIp] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [isIpLoading, setIsIpLoading] = useState(true);
  const [requestStatus, setRequestStatus] = useState<'none' | 'sent'>('none');
  
  const { accessList, isLoading: accessLoading, requestAccess, autoApproveFirst } = useAdminAccess();
  const { toast } = useToast();

  useEffect(() => {
    fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => {
          setUserIp(data.ip);
          setIsIpLoading(false);
      })
      .catch(() => setIsIpLoading(false));
  }, []);

  useEffect(() => {
    if (!accessLoading && userIp) {
        const myAccess = accessList.find(a => a.ip === userIp);
        if (myAccess && myAccess.status === 'approved') {
            setIsAuthenticated(true);
        }
    }
  }, [accessList, userIp, accessLoading]);

  const handleLogin = async () => {
    if (pin === ADMIN_PIN) {
        // التحقق من أنه أول أدمن
        const deviceName = navigator.userAgent.substring(0, 50);
        const wasFirst = await autoApproveFirst(userIp, deviceName);
        
        if (wasFirst) {
            setIsAuthenticated(true);
            toast({ title: "مرحباً بك الأدمن الأول!", description: "تم اعتماد جهازك تلقائياً." });
        } else {
            // إذا لم يكن الأول، نتحقق من التراخيص
            const myAccess = accessList.find(a => a.ip === userIp);
            if (myAccess?.status === 'approved') {
                setIsAuthenticated(true);
                toast({ title: "تم الدخول بنجاح" });
            } else {
                setRequestStatus('sent');
                await requestAccess(userIp, deviceName);
            }
        }
    } else {
        toast({ title: "الرمز السري غير صحيح", variant: "destructive" });
    }
  };

  if (isIpLoading || accessLoading) {
      return (
          <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
              <Loader2 className="h-10 w-10 animate-spin text-primary"/>
              <p className="mt-4 font-bold text-muted-foreground">يتم التحقق من هوية الجهاز...</p>
          </div>
      )
  }

  if (!isAuthenticated) {
     return (
       <div className="flex h-screen w-full flex-col items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-sm rounded-[2rem] shadow-2xl border-none overflow-hidden">
            <CardHeader className="text-center bg-primary text-white pb-8">
                <Shield className="h-16 w-16 mx-auto mb-2" />
                <CardTitle className="text-2xl font-black italic">نظام الوصول الموثوق</CardTitle>
                <CardDescription className="text-white/80 font-bold">IP: {userIp || 'تحقق...'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-8">
                {requestStatus === 'sent' ? (
                    <div className="text-center space-y-4 animate-in zoom-in">
                        <AlertCircle className="h-16 w-16 mx-auto text-orange-500 animate-pulse" />
                        <h2 className="text-xl font-black">طلبك قيد المراجعة</h2>
                        <p className="text-sm font-bold text-muted-foreground">لقد تم إرسال عنوان جهازك للأدمن. يرجى الانتظار حتى يتم تفعيل حسابك.</p>
                        <Button variant="outline" className="w-full" onClick={() => setRequestStatus('none')}>محاولة مرة أخرى</Button>
                    </div>
                ) : (
                    <>
                        <div className="space-y-1">
                            <label className="text-xs font-black pr-1">أدخل الرمز السري للمسؤول</label>
                            <div className="relative">
                                <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input 
                                    type="password" 
                                    placeholder="••••••••" 
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value)}
                                    className="pr-10 h-14 rounded-2xl text-center text-2xl font-black"
                                    dir="ltr"
                                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                                />
                            </div>
                        </div>
                        <Button onClick={handleLogin} className="w-full h-14 rounded-2xl text-xl font-bold shadow-lg shadow-primary/20">
                            طلب دخول للنظام
                        </Button>
                    </>
                )}
            </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="flex h-screen w-full bg-background overflow-hidden" dir="rtl">
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

        <main className="flex-1 relative overflow-hidden bg-muted/5">
          <div className="spa-stack-container" style={{ transform: `translateX(${activeTab * 100}%)` }}>
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
            <div className="spa-page-view flex-shrink-0"><ScrollArea className="h-full w-full px-4 py-6 sm:px-8"><AdminApprovalsPage /></ScrollArea></div>
            <div className="spa-page-view flex-shrink-0"><ScrollArea className="h-full w-full px-4 py-6 sm:px-8"><AdminAccessPage /></ScrollArea></div>
          </div>
        </main>
      </div>
    </div>
  );
}
