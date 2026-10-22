
"use client";

import { useState, useEffect, useContext } from 'react';
import { BottomNav } from '@/components/BottomNav';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useAddresses } from '@/hooks/useAddresses';
import { HardHat, AlertCircle, Navigation, MapPin, Loader2, CheckCircle2, User, KeyRound, Smartphone, LogIn, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { isLocationInAllowedZones, safeStorage } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { AppContext } from '@/contexts/AppContext';
import { db } from '@/lib/firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';

import HomePage from './home/page';
import RestaurantsPage from './restaurants/page';
import ProductsPage from './products/page';
import CartPage from './cart/page';
import OrdersPage from './orders/page';
import AccountPage from './account/page';
import AddAddressPage from './account/add-address/page';
import SupportPage from './support/page';
import PrivacyPolicyPage from './privacy-policy/page';
import ProductDetailPage from './products/[id]/page';
import RestaurantProductsPage from './restaurants/[id]/page';

export default function MainAppLayout() {
  const context = useContext(AppContext);
  const { settings } = useAppSettings();
  const { addresses } = useAddresses();
  const { toast } = useToast();
  
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'start'>('login');
  const [isBlocked, setIsBlocked] = useState(false);
  const [newAddr, setNewAddr] = useState({ name: '', phone: '', details: '', lat: 0, lng: 0 });
  const [islocLoading, setIslocLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  
  const [authData, setAuthData] = useState({ name: '', phone: '', password: '' });
  const [isAuthProcessing, setIsAuthProcessing] = useState(false);

  const [visitedTabs, setVisitedTabs] = useState<Set<number>>(() => new Set([0]));

  if (!context) return null;
  const { activeTab, register, login, guestLogin, isMainDataReady, addAddress, userId, showAddressSheet, setShowAddressSheet } = context;

  useEffect(() => {
    setVisitedTabs(prev => {
        if (prev.has(activeTab)) return prev;
        const next = new Set(prev);
        next.add(activeTab);
        return next;
    });
  }, [activeTab]);

  useEffect(() => {
    if (isMainDataReady) {
        setShowSplash(false);
    }
  }, [isMainDataReady]);

  useEffect(() => {
    const trackVisit = async () => {
        const lastVisit = sessionStorage.getItem('ss_v');
        if (!lastVisit) {
            try {
                const settingsRef = doc(db, 'settings', 'main_settings');
                await updateDoc(settingsRef, { totalVisits: increment(1) });
                sessionStorage.setItem('ss_v', '1');
            } catch (e) {}
        }
    };
    trackVisit();
  }, []);

  useEffect(() => {
    if (!showSplash && !settings?.isMaintenanceMode) {
      if (!userId) {
          setShowAuthPrompt(true);
          setAuthMode('start');
      }
    }
  }, [showSplash, settings?.isMaintenanceMode, userId]);

  const handleRegister = async () => {
    if (!authData.name || !authData.phone || !authData.password) {
        toast({ title: "يرجى ملء جميع الحقول", variant: "destructive" });
        return;
    }
    setIsAuthProcessing(true);
    const success = await register(authData.name, authData.phone, authData.password);
    if (success) setShowAuthPrompt(false);
    setIsAuthProcessing(false);
  };

  const handleLogin = async () => {
    if (!authData.phone || !authData.password) {
        toast({ title: "يرجى ملء جميع الحقول", variant: "destructive" });
        return;
    }
    setIsAuthProcessing(true);
    const success = await login(authData.phone, authData.password);
    if (success) setShowAuthPrompt(false);
    setIsAuthProcessing(false);
  };

  const handleGuest = () => {
      guestLogin();
      setShowAuthPrompt(false);
  };

  const handleGetLocation = () => {
    setIslocLoading(true);
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                if (!isLocationInAllowedZones(latitude, longitude)) {
                    setIsBlocked(true);
                    setShowAddressSheet(false);
                } else {
                    setNewAddr(prev => ({ ...prev, lat: latitude, lng: longitude }));
                    toast({ title: "تم تثبيت موقعك بدقة عالية 🛰️" });
                }
                setIslocLoading(false);
            },
            () => { 
                toast({ title: "يرجى تفعيل GPS عالي الدقة", variant: "destructive" }); 
                setIslocLoading(false); 
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    }
  };

  const handleSaveAddress = async () => {
    if (!newAddr.name || !newAddr.phone || newAddr.lat === 0) {
        toast({ title: "يرجى إكمال البيانات وتحديد الموقع", variant: "destructive" });
        return;
    }
    setIsSaving(true);
    try {
        await addAddress({ 
            name: newAddr.name,
            phone: newAddr.phone,
            details: newAddr.details,
            latitude: newAddr.lat, 
            longitude: newAddr.lng, 
            deliveryZone: "عام", 
            branchId: "main" 
        } as any);

        setShowAddressSheet(false);
        toast({ title: "تم تثبيت عنوانك بنجاح! 🎉" });
    } catch (e) { 
        toast({ title: "خطأ في المزامنة سحابياً", variant: "destructive" }); 
    } finally { 
        setIsSaving(false); 
    }
  };

  const content = (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <main className="flex-1 relative z-0 overflow-hidden">
        <div className="spa-stack-container" style={{ transform: `translateX(${activeTab * 100}%)` }}>
          <div className="spa-page-view"><HomePage /></div>
          <div className="spa-page-view">{visitedTabs.has(1) ? <RestaurantsPage /> : null}</div>
          <div className="spa-page-view">{visitedTabs.has(2) ? <ProductsPage /> : null}</div>
          <div className="spa-page-view">{visitedTabs.has(3) ? <CartPage /> : null}</div>
          <div className="spa-page-view">{visitedTabs.has(4) ? <OrdersPage /> : null}</div>
          <div className="spa-page-view">{visitedTabs.has(5) ? <AccountPage /> : null}</div>
          <div className="spa-page-view">{visitedTabs.has(6) ? <AddAddressPage /> : null}</div>
          <div className="spa-page-view">{visitedTabs.has(7) ? <SupportPage /> : null}</div>
          <div className="spa-page-view">{visitedTabs.has(8) ? <PrivacyPolicyPage /> : null}</div>
          <div className="spa-page-view">{visitedTabs.has(9) ? <ProductDetailPage /> : null}</div>
          <div className="spa-page-view">{visitedTabs.has(10) ? <RestaurantProductsPage /> : null}</div>
        </div>
      </main>
      <BottomNav />
    </div>
  );

  return (
    <div className="h-[100dvh] w-full bg-background flex flex-col relative overflow-hidden">
        {showSplash && (
            <div className="fixed inset-0 flex flex-col items-center justify-center bg-white z-[100] animate-out fade-out duration-300">
                <div className="p-8 rounded-[2.5rem] stamp-effect flex flex-col items-center justify-center">
                    <h1 className="text-4xl font-black text-white italic tracking-tighter">SPEED</h1>
                    <h1 className="text-4xl font-black text-white italic tracking-tighter leading-none">SHOP</h1>
                </div>
                <div className="mt-8 flex flex-col items-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-primary mt-2" />
                </div>
            </div>
        )}

        {isBlocked ? (
            <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center bg-white animate-in zoom-in duration-500">
              <div className="p-10 bg-destructive/10 rounded-full mb-6">
                <AlertCircle className="h-20 w-20 text-destructive" />
              </div>
              <h1 className="text-3xl font-black mb-4 text-slate-800">نعتذر منك جداً</h1>
              <p className="text-muted-foreground font-bold text-lg leading-relaxed px-6">
                خدمتنا حالياً غير متوفرة في منطقتك. نحن نعمل على التوسع لنصل إليك قريباً!
              </p>
            </div>
        ) : settings?.isMaintenanceMode ? (
            <div className="flex h-full w-full flex-col items-center justify-center p-10 text-center bg-background">
                <HardHat className="h-20 w-20 text-primary mb-6 animate-bounce"/>
                <h1 className="text-2xl font-black mb-4">التطبيق في صيانة مؤقتة</h1>
                <p className="text-muted-foreground font-bold">{settings.maintenanceMessage || 'سنعود لخدمتكم قريباً جداً!'}</p>
            </div>
        ) : content}

        {/* واجهة تسجيل الدخول والإنشاء */}
        <Sheet open={showAuthPrompt} onOpenChange={() => {}}>
            <SheetContent side="bottom" className="h-[85vh] p-0 bg-background rounded-t-[3.5rem] overflow-hidden border-none shadow-2xl">
                <div className="p-8 space-y-8 h-full overflow-y-auto pb-20 text-right">
                    <div className="flex items-center gap-4 py-4 flex-row-reverse">
                        <div className="p-4 bg-primary/10 rounded-[1.5rem]"><LogIn className="h-8 w-8 text-primary animate-pulse" /></div>
                        <div>
                            <SheetTitle className="text-3xl font-black">مرحباً بك في سبيد!</SheetTitle>
                            <p className="text-muted-foreground font-bold text-sm">أسرع خدمة توصيل في بابل بانتظارك</p>
                        </div>
                    </div>

                    {authMode === 'start' && (
                        <div className="space-y-6 pt-10">
                            <Button onClick={() => setAuthMode('register')} className="w-full h-20 rounded-[2rem] text-2xl font-black gap-3 shadow-xl"><UserPlus className="h-7 w-7"/> إنشاء حساب جديد</Button>
                            <Button onClick={() => setAuthMode('login')} variant="outline" className="w-full h-20 rounded-[2rem] text-2xl font-black gap-3 border-2"><LogIn className="h-7 w-7"/> تسجيل الدخول</Button>
                            <Button onClick={handleGuest} variant="ghost" className="w-full h-14 rounded-2xl text-lg font-bold text-muted-foreground">تصفح كضيف فقط</Button>
                        </div>
                    )}

                    {authMode === 'register' && (
                        <div className="space-y-5 animate-in slide-in-from-left-4 duration-300">
                             <div className="space-y-1">
                                <label className="text-[10px] font-black pr-1 uppercase text-slate-400">الاسم الكامل</label>
                                <div className="relative"><User className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"/><Input value={authData.name} onChange={(e)=>setAuthData({...authData, name: e.target.value})} placeholder="اكتب اسمك..." className="h-14 rounded-2xl bg-muted/30 border-none pr-12 text-lg font-bold" /></div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black pr-1 uppercase text-slate-400">رقم الهاتف</label>
                                <div className="relative"><Smartphone className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"/><Input value={authData.phone} onChange={(e)=>setAuthData({...authData, phone: e.target.value})} placeholder="07XXXXXXXX" type="tel" className="h-14 rounded-2xl bg-muted/30 border-none pr-12 text-center text-xl font-black tracking-widest" dir="ltr" /></div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black pr-1 uppercase text-slate-400">كلمة المرور</label>
                                <div className="relative"><KeyRound className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"/><Input value={authData.password} onChange={(e)=>setAuthData({...authData, password: e.target.value})} placeholder="••••••••" type="password" className="h-14 rounded-2xl bg-muted/30 border-none pr-12 text-center text-xl font-black" dir="ltr" /></div>
                            </div>
                            <Button onClick={handleRegister} className="w-full h-20 rounded-[2.5rem] text-2xl font-black mt-4" disabled={isAuthProcessing}>
                                {isAuthProcessing ? <Loader2 className="animate-spin h-7 w-7"/> : "تأكيد وإنشاء الحساب"}
                            </Button>
                            <Button onClick={() => setAuthMode('start')} variant="ghost" className="w-full text-muted-foreground">رجوع</Button>
                        </div>
                    )}

                    {authMode === 'login' && (
                        <div className="space-y-5 animate-in slide-in-from-right-4 duration-300">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black pr-1 uppercase text-slate-400">رقم الهاتف</label>
                                <div className="relative"><Smartphone className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"/><Input value={authData.phone} onChange={(e)=>setAuthData({...authData, phone: e.target.value})} placeholder="07XXXXXXXX" type="tel" className="h-14 rounded-2xl bg-muted/30 border-none pr-12 text-center text-xl font-black tracking-widest" dir="ltr" /></div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black pr-1 uppercase text-slate-400">كلمة المرور</label>
                                <div className="relative"><KeyRound className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"/><Input value={authData.password} onChange={(e)=>setAuthData({...authData, password: e.target.value})} placeholder="••••••••" type="password" className="h-14 rounded-2xl bg-muted/30 border-none pr-12 text-center text-xl font-black" dir="ltr" /></div>
                            </div>
                            <Button onClick={handleLogin} className="w-full h-20 rounded-[2.5rem] text-2xl font-black mt-4" disabled={isAuthProcessing}>
                                {isAuthProcessing ? <Loader2 className="animate-spin h-7 w-7"/> : "تسجيل الدخول"}
                            </Button>
                            <Button onClick={() => setAuthMode('start')} variant="ghost" className="w-full text-muted-foreground">رجوع</Button>
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>

        {/* واجهة العنوان الإلزامية فقط عند الطلب */}
        <Sheet open={showAddressSheet} onOpenChange={setShowAddressSheet}>
            <SheetContent side="bottom" className="h-[85vh] p-0 bg-background rounded-t-[3.5rem] overflow-hidden border-none shadow-2xl">
                <div className="p-8 space-y-8 h-full overflow-y-auto pb-20 text-right">
                    <div className="flex items-center gap-4 py-4 flex-row-reverse">
                        <div className="p-4 bg-primary/10 rounded-[1.5rem]"><MapPin className="h-8 w-8 text-primary animate-pulse" /></div>
                        <div>
                            <SheetTitle className="text-3xl font-black">أين أنت الآن؟</SheetTitle>
                            <p className="text-muted-foreground font-bold text-sm">نحتاج لموقعك لضمان سرعة التوصيل</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black pr-1 uppercase text-slate-400">تسمية الموقع (مثلاً: منزلي)</label>
                                <Input value={newAddr.name} onChange={(e)=>setNewAddr({...newAddr, name: e.target.value})} placeholder="المنزل، العمل..." className="h-14 rounded-2xl bg-muted/30 border-none text-lg font-bold" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black pr-1 uppercase text-slate-400">رقم الهاتف للتوصيل</label>
                                <Input value={newAddr.phone} onChange={(e)=>setNewAddr({...newAddr, phone: e.target.value})} placeholder="07XXXXXXXX" type="tel" className="h-14 rounded-2xl bg-muted/30 border-none text-center text-xl font-black tracking-widest" dir="ltr" />
                            </div>
                        </div>

                        <div className="space-y-2">
                             <label className="text-[10px] font-black pr-1 uppercase text-slate-400">موقع التوصيل (GPS)</label>
                             <button onClick={handleGetLocation} className={`w-full py-10 flex flex-col items-center gap-3 border-4 border-dashed rounded-[3rem] transition-all active:scale-95 ${newAddr.lat !== 0 ? 'border-green-500 bg-green-50' : 'border-primary/20 bg-card hover:bg-primary/5'}`}>
                                {islocLoading ? <Loader2 className="animate-spin h-10 w-10 text-primary" /> : newAddr.lat !== 0 ? <CheckCircle2 className="h-10 w-10 text-green-500" /> : <MapPin className="h-10 w-10 text-primary" />}
                                <span className="font-black">{newAddr.lat !== 0 ? "تم تحديد الموقع ✅" : "اضغط لتحديد موقعك بدقة"}</span>
                             </button>
                        </div>

                        <Button onClick={handleSaveAddress} className="w-full h-20 rounded-[2.5rem] text-2xl font-black shadow-2xl" disabled={isSaving || newAddr.lat === 0 || !newAddr.name || !newAddr.phone}>
                            {isSaving ? "جاري الحفظ..." : "تأكيد العنوان والمتابعة"}
                        </Button>
                        <p className="text-center text-[10px] text-muted-foreground font-bold px-10">مجرد حفظ العنوان، فأنت توافق على <button type="button" onClick={()=>setActiveTab(8)} className="text-primary border-b border-primary/20">سياسة الخصوصية</button>.</p>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    </div>
  );
}
