
"use client";

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AdminNav } from '@/components/AdminNav';
import { Shield, KeyRound, PanelLeft, Loader2, Building2, Fingerprint } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useBranches } from '@/hooks/useBranches';

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
import AdminSettingsPage from './settings/page';
import AdminApprovalsPage from './approvals/page';
import AdminAccessPage from './access-requests/page';
import AdminBranchesPage from './branches/page';
import HomeSettingsPage from './home-settings/page';
import AdminWithdrawalsPage from './withdrawals/page';

const ADMIN_PIN = "31344313";

function AdminLayoutContent() {
  const searchParams = useSearchParams();
  const branchParam = searchParams.get('branch') || 'main';

  const [pin, setPin] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [requestStatus, setRequestStatus] = useState<'none' | 'sent'>('none');
  
  const { accessList, isLoading: accessLoading, requestAccess, autoApproveFirst, getDeviceId } = useAdminAccess(branchParam);
  const { branches } = useBranches();
  const { toast } = useToast();

  const currentBranch = useMemo(() => {
      if (branchParam === 'main') return { name: 'المركز الرئيسي', id: 'main' };
      return branches.find(b => b.id === branchParam) || { name: 'فرع مستقل', id: branchParam };
  }, [branchParam, branches]);

  useEffect(() => {
    const deviceId = getDeviceId();
    const storedAuth = localStorage.getItem(`admin_auth_${branchParam}`);
    if (storedAuth === 'true') {
        setIsAuthenticated(true);
        return;
    }
    const myAccess = accessList.find(a => a.deviceId === deviceId && a.branchId === branchParam);
    if (myAccess && myAccess.status === 'approved') {
        setIsAuthenticated(true);
        localStorage.setItem(`admin_auth_${branchParam}`, 'true');
    }
  }, [accessList, branchParam, getDeviceId]);

  const handleLogin = async () => {
    if (pin === ADMIN_PIN) {
        const deviceName = navigator.userAgent.substring(0, 50);
        const wasFirst = await autoApproveFirst(branchParam, deviceName);
        if (wasFirst) {
            setIsAuthenticated(true);
            localStorage.setItem(`admin_auth_${branchParam}`, 'true');
        } else {
            const deviceId = getDeviceId();
            const myAccess = accessList.find(a => a.deviceId === deviceId && a.branchId === branchParam);
            if (myAccess?.status === 'approved') {
                setIsAuthenticated(true);
                localStorage.setItem(`admin_auth_${branchParam}`, 'true');
            } else {
                setRequestStatus('sent');
                await requestAccess(branchParam, deviceName);
            }
        }
    } else {
        toast({ title: "الرمز السري غير صحيح", variant: "destructive" });
    }
  };

  if (accessLoading && !isAuthenticated) {
      return <div className="flex h-screen w-full items-center justify-center bg-background"><Loader2 className="h-10 w-10 animate-spin text-primary"/></div>;
  }

  if (!isAuthenticated) {
     return (
       <div className="flex h-screen w-full flex-col items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-sm rounded-[2.5rem] shadow-2xl border-none overflow-hidden">
            <CardHeader className="text-center bg-primary text-white pb-8">
                <Shield className="h-16 w-16 mx-auto mb-2" />
                <CardTitle className="text-2xl font-black italic">بوابة فرع: {currentBranch.name}</CardTitle>
                <CardDescription className="text-white/80 font-bold">يرجى تسجيل الدخول</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-8 text-right">
                {requestStatus === 'sent' ? (
                    <div className="text-center space-y-4">
                        <Fingerprint className="h-16 w-16 mx-auto text-orange-500 animate-pulse" />
                        <h2 className="text-xl font-black">جهاز غير مرخص</h2>
                        <p className="text-sm font-bold text-muted-foreground">بانتظار موافقة أدمن الفرع الرئيسي.</p>
                        <Button variant="outline" className="w-full rounded-xl" onClick={() => setRequestStatus('none')}>محاولة مرة أخرى</Button>
                    </div>
                ) : (
                    <>
                        <div className="space-y-2">
                            <label className="text-xs font-black pr-1">الرمز السري للمسؤول</label>
                            <div className="relative">
                                <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input type="password" placeholder="••••••••" value={pin} onChange={(e)=>setPin(e.target.value)} className="pr-10 h-14 rounded-2xl text-center text-2xl font-black" dir="ltr" onKeyDown={(e)=>e.key === 'Enter' && handleLogin()} />
                            </div>
                        </div>
                        <Button onClick={handleLogin} className="w-full h-14 rounded-2xl text-xl font-bold shadow-lg">دخول فوري</Button>
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
         <AdminNav onTabChange={setActiveTab} activeTab={activeTab} isBranch={branchParam !== 'main'} />
      </aside>
      <div className="flex flex-1 flex-col relative overflow-hidden">
         <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-4 border-b bg-background px-4 sm:h-16 sm:px-6">
          <Sheet>
            <SheetTrigger asChild><Button size="icon" variant="outline" className="sm:hidden"><PanelLeft className="h-5 w-5" /></Button></SheetTrigger>
            <SheetContent side="right" className="sm:max-w-xs p-0 overflow-hidden flex flex-col">
               <SheetHeader className="p-4 border-b text-right shrink-0"><SheetTitle>لوحة التحكم - {currentBranch.name}</SheetTitle></SheetHeader>
               <div className="flex-1 overflow-hidden"><AdminNav isSheet={true} onTabChange={setActiveTab} activeTab={activeTab} isBranch={branchParam !== 'main'} /></div>
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-xl"><Building2 className="h-5 w-5 text-primary"/></div>
            <div className="text-xl font-black text-primary truncate max-w-[200px]">{currentBranch.name}</div>
          </div>
        </header>
        <main className="flex-1 relative overflow-hidden bg-muted/5">
          <div className="spa-stack-container" style={{ transform: `translateX(${activeTab * 100}%)`, transition: 'none' }}>
            <div className="spa-page-view flex-shrink-0">
                {activeTab === 0 && <ScrollArea className="h-full w-full px-4 py-6 sm:px-8"><AdminDashboard branchId={branchParam} /></ScrollArea>}
            </div>
            <div className="spa-page-view flex-shrink-0">
                {activeTab === 1 && <ScrollArea className="h-full w-full px-4 py-6 sm:px-8"><AdminOrdersPage branchId={branchParam} /></ScrollArea>}
            </div>
            <div className="spa-page-view flex-shrink-0">
                {activeTab === 2 && <ScrollArea className="h-full w-full px-4 py-6 sm:px-8"><AdminProductsPage branchId={branchParam} /></ScrollArea>}
            </div>
            <div className="spa-page-view flex-shrink-0">
                {activeTab === 3 && <ScrollArea className="h-full w-full px-4 py-6 sm:px-8"><AdminCategoriesPage /></ScrollArea>}
            </div>
            <div className="spa-page-view flex-shrink-0">
                {activeTab === 4 && <ScrollArea className="h-full w-full px-4 py-6 sm:px-8"><AdminStoresPage branchId={branchParam} /></ScrollArea>}
            </div>
            <div className="spa-page-view flex-shrink-0">
                {activeTab === 5 && <ScrollArea className="h-full w-full px-4 py-6 sm:px-8"><AdminBannersPage /></ScrollArea>}
            </div>
            <div className="spa-page-view flex-shrink-0">
                {activeTab === 6 && <ScrollArea className="h-full w-full px-4 py-6 sm:px-8"><AdminDeliveryZonesPage /></ScrollArea>}
            </div>
            <div className="spa-page-view flex-shrink-0">
                {activeTab === 7 && <ScrollArea className="h-full w-full px-4 py-6 sm:px-8"><AdminCouponsPage /></ScrollArea>}
            </div>
            <div className="spa-page-view flex-shrink-0">
                {activeTab === 8 && <ScrollArea className="h-full w-full px-4 py-6 sm:px-8"><AdminUsersPage branchId={branchParam} /></ScrollArea>}
            </div>
            <div className="spa-page-view flex-shrink-0">
                {activeTab === 9 && <ScrollArea className="h-full w-full px-4 py-6 sm:px-8"><AdminDeliveryWorkersPage branchId={branchParam} /></ScrollArea>}
            </div>
            <div className="spa-page-view flex-shrink-0">
                {activeTab === 10 && <ScrollArea className="h-full w-full px-4 py-6 sm:px-8"><AdminReportsPage /></ScrollArea>}
            </div>
            <div className="spa-page-view flex-shrink-0">
                {activeTab === 11 && <ScrollArea className="h-full w-full px-4 py-6 sm:px-8"><AdminSupportTicketsPage branchId={branchParam} /></ScrollArea>}
            </div>
            <div className="spa-page-view flex-shrink-0"><div className="p-20 text-center font-black">تم إلغاء نظام الإشعارات</div></div>
            <div className="spa-page-view flex-shrink-0">
                {activeTab === 13 && <ScrollArea className="h-full w-full px-4 py-6 sm:px-8"><AdminSettingsPage /></ScrollArea>}
            </div>
            <div className="spa-page-view flex-shrink-0">
                {activeTab === 14 && <ScrollArea className="h-full w-full px-4 py-6 sm:px-8"><AdminApprovalsPage branchId={branchParam} /></ScrollArea>}
            </div>
            <div className="spa-page-view flex-shrink-0">
                {activeTab === 15 && <ScrollArea className="h-full w-full px-4 py-6 sm:px-8"><AdminAccessPage branchId={branchParam} /></ScrollArea>}
            </div>
            <div className="spa-page-view flex-shrink-0">
                {activeTab === 16 && <ScrollArea className="h-full w-full px-4 py-6 sm:px-8"><AdminBranchesPage /></ScrollArea>}
            </div>
            <div className="spa-page-view flex-shrink-0">
                {activeTab === 17 && <ScrollArea className="h-full w-full px-4 py-6 sm:px-8"><HomeSettingsPage /></ScrollArea>}
            </div>
            <div className="spa-page-view flex-shrink-0">
                {activeTab === 18 && <ScrollArea className="h-full w-full px-4 py-6 sm:px-8"><AdminWithdrawalsPage branchId={branchParam} /></ScrollArea>}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  return (
    <Suspense fallback={null}>
      <AdminLayoutContent />
    </Suspense>
  );
}
