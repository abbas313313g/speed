
"use client";

import { useState, useEffect, useMemo } from 'react';
import { AdminNav } from '@/components/AdminNav';
import { Shield, KeyRound, PanelLeft, Loader2, AlertCircle, Laptop, Building2, ChevronRight } from 'lucide-react';
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
import AdminTelegramPage from './telegram/page';
import AdminSettingsPage from './settings/page';
import AdminApprovalsPage from './approvals/page';
import AdminAccessPage from './access-requests/page';
import AdminBranchesPage from './branches/page';

const ADMIN_PIN = "31344313";

export default function AdminLayout() {
  const [pin, setPin] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [requestStatus, setRequestStatus] = useState<'none' | 'sent'>('none');
  const [selectedBranchId, setSelectedBranchId] = useState<'main' | string>('main');
  
  const { accessList, isLoading: accessLoading, requestAccess, autoApproveFirst, getDeviceId } = useAdminAccess();
  const { branches, isLoading: branchesLoading } = useBranches();
  const { toast } = useToast();

  const currentBranch = useMemo(() => {
      if (selectedBranchId === 'main') return { name: 'الإدارة الرئيسية', id: 'main' };
      return branches.find(b => b.id === selectedBranchId) || { name: 'فرع غير معروف', id: selectedBranchId };
  }, [selectedBranchId, branches]);

  useEffect(() => {
    if (!accessLoading) {
        const deviceId = getDeviceId();
        const myAccess = accessList.find(a => a.deviceId === deviceId && a.branchId === selectedBranchId);
        if (myAccess && myAccess.status === 'approved') {
            setIsAuthenticated(true);
        } else {
            setIsAuthenticated(false);
        }
    }
  }, [accessList, selectedBranchId, accessLoading, getDeviceId]);

  const handleLogin = async () => {
    if (pin === ADMIN_PIN) {
        const deviceName = navigator.userAgent.substring(0, 50);
        const wasFirst = await autoApproveFirst(selectedBranchId, deviceName);
        
        if (wasFirst) {
            setIsAuthenticated(true);
            toast({ title: "مرحباً بك!", description: `تم اعتماد جهازك تلقائياً لـ ${currentBranch.name}` });
        } else {
            const deviceId = getDeviceId();
            const myAccess = accessList.find(a => a.deviceId === deviceId && a.branchId === selectedBranchId);
            if (myAccess?.status === 'approved') {
                setIsAuthenticated(true);
            } else {
                setRequestStatus('sent');
                await requestAccess(selectedBranchId, deviceName);
            }
        }
    } else {
        toast({ title: "الرمز السري غير صحيح", variant: "destructive" });
    }
  };

  if (accessLoading || branchesLoading) {
      return (
          <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
              <Loader2 className="h-10 w-10 animate-spin text-primary"/>
              <p className="mt-4 font-bold text-muted-foreground">يتم التحقق من هوية الجهاز والفرع...</p>
          </div>
      )
  }

  if (!isAuthenticated) {
     return (
       <div className="flex h-screen w-full flex-col items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-sm rounded-[2rem] shadow-2xl border-none overflow-hidden animate-in fade-in zoom-in duration-300">
            <CardHeader className="text-center bg-primary text-white pb-8">
                <Shield className="h-16 w-16 mx-auto mb-2" />
                <CardTitle className="text-2xl font-black italic">أمان الأجهزة الموثوقة</CardTitle>
                <CardDescription className="text-white/80 font-bold">الدخول إلى: {currentBranch.name}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-8">
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-muted-foreground pr-1">اختر الفرع المطلوب</label>
                    <div className="grid grid-cols-2 gap-2">
                        <Button 
                            variant={selectedBranchId === 'main' ? 'default' : 'outline'} 
                            className="h-12 rounded-xl text-xs font-black"
                            onClick={() => {setSelectedBranchId('main'); setRequestStatus('none');}}
                        >الرئيسية</Button>
                        {branches.map(b => (
                            <Button 
                                key={b.id}
                                variant={selectedBranchId === b.id ? 'default' : 'outline'} 
                                className="h-12 rounded-xl text-xs font-black"
                                onClick={() => {setSelectedBranchId(b.id); setRequestStatus('none');}}
                            >{b.name}</Button>
                        ))}
                    </div>
                </div>

                {requestStatus === 'sent' ? (
                    <div className="text-center space-y-4 animate-in zoom-in">
                        <AlertCircle className="h-16 w-16 mx-auto text-orange-500 animate-pulse" />
                        <h2 className="text-xl font-black">طلبك قيد المراجعة</h2>
                        <p className="text-sm font-bold text-muted-foreground">لقد تم إرسال هوية جهازك. يرجى الانتظار حتى يتم تفعيل حسابك من قبل الأدمن الرئيسي.</p>
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
                            فتح لوحة التحكم
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
         <AdminNav onTabChange={setActiveTab} activeTab={activeTab} isBranch={selectedBranchId !== 'main'} />
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
                 <SheetTitle>لوحة التحكم - {currentBranch.name}</SheetTitle>
               </SheetHeader>
               <div className="flex-1 overflow-hidden">
                  <AdminNav isSheet={true} onTabChange={setActiveTab} activeTab={activeTab} isBranch={selectedBranchId !== 'main'} />
               </div>
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-xl"><Building2 className="h-5 w-5 text-primary"/></div>
            <div className="text-xl font-black text-primary">{currentBranch.name}</div>
          </div>
          
          <Button variant="ghost" className="mr-auto text-xs font-bold gap-1" onClick={() => setIsAuthenticated(false)}>
              تغيير الفرع <ChevronRight className="h-3 w-3"/>
          </Button>
        </header>

        <main className="flex-1 relative overflow-hidden bg-muted/5">
          <div 
            className="spa-stack-container" 
            style={{ 
                transform: `translateX(${activeTab * 100}%)`,
                transition: 'transform 0.1s cubic-bezier(0.16, 1, 0.3, 1)' 
            }}
          >
            <div className="spa-page-view flex-shrink-0"><ScrollArea className="h-full w-full px-4 py-6 sm:px-8"><AdminDashboard branchId={selectedBranchId} /></ScrollArea></div>
            <div className="spa-page-view flex-shrink-0"><ScrollArea className="h-full w-full px-4 py-6 sm:px-8"><AdminOrdersPage branchId={selectedBranchId} /></ScrollArea></div>
            <div className="spa-page-view flex-shrink-0"><ScrollArea className="h-full w-full px-4 py-6 sm:px-8"><AdminProductsPage branchId={selectedBranchId} /></ScrollArea></div>
            <div className="spa-page-view flex-shrink-0"><ScrollArea className="h-full w-full px-4 py-6 sm:px-8"><AdminCategoriesPage /></ScrollArea></div>
            <div className="spa-page-view flex-shrink-0"><ScrollArea className="h-full w-full px-4 py-6 sm:px-8"><AdminStoresPage branchId={selectedBranchId} /></ScrollArea></div>
            <div className="spa-page-view flex-shrink-0"><ScrollArea className="h-full w-full px-4 py-6 sm:px-8"><AdminBannersPage /></ScrollArea></div>
            <div className="spa-page-view flex-shrink-0"><ScrollArea className="h-full w-full px-4 py-6 sm:px-8"><AdminDeliveryZonesPage /></ScrollArea></div>
            <div className="spa-page-view flex-shrink-0"><ScrollArea className="h-full w-full px-4 py-6 sm:px-8"><AdminCouponsPage /></ScrollArea></div>
            <div className="spa-page-view flex-shrink-0"><ScrollArea className="h-full w-full px-4 py-6 sm:px-8"><AdminUsersPage branchId={selectedBranchId} /></ScrollArea></div>
            <div className="spa-page-view flex-shrink-0"><ScrollArea className="h-full w-full px-4 py-6 sm:px-8"><AdminDeliveryWorkersPage branchId={selectedBranchId} /></ScrollArea></div>
            <div className="spa-page-view flex-shrink-0"><ScrollArea className="h-full w-full px-4 py-6 sm:px-8"><AdminReportsPage branchId={selectedBranchId} /></ScrollArea></div>
            <div className="spa-page-view flex-shrink-0"><ScrollArea className="h-full w-full px-4 py-6 sm:px-8"><AdminSupportTicketsPage /></ScrollArea></div>
            <div className="spa-page-view flex-shrink-0"><ScrollArea className="h-full w-full px-4 py-6 sm:px-8"><AdminTelegramPage branchId={selectedBranchId} /></ScrollArea></div>
            <div className="spa-page-view flex-shrink-0"><ScrollArea className="h-full w-full px-4 py-6 sm:px-8"><AdminSettingsPage /></ScrollArea></div>
            <div className="spa-page-view flex-shrink-0"><ScrollArea className="h-full w-full px-4 py-6 sm:px-8"><AdminApprovalsPage branchId={selectedBranchId} /></ScrollArea></div>
            <div className="spa-page-view flex-shrink-0"><ScrollArea className="h-full w-full px-4 py-6 sm:px-8"><AdminAccessPage branchId={selectedBranchId} /></ScrollArea></div>
            <div className="spa-page-view flex-shrink-0"><ScrollArea className="h-full w-full px-4 py-6 sm:px-8"><AdminBranchesPage /></ScrollArea></div>
          </div>
        </main>
      </div>
    </div>
  );
}
