
"use client";

import { useState, useEffect, useContext } from 'react';
import { BottomNav } from '@/components/BottomNav';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useAddresses } from '@/hooks/useAddresses';
import { HardHat, AlertCircle, Navigation, MapPin, Loader2, CheckCircle2, User, KeyRound, Smartphone, LogIn, UserPlus, Languages } from 'lucide-react';
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
  const [lang, setLang] = useState<'ar' | 'en'>('ar');

  const [visitedTabs, setVisitedTabs] = useState<Set<number>>(() => new Set([0]));

  if (!context) return null;
  const { activeTab, register, login, guestLogin, isMainDataReady, addAddress, userId, showAddressSheet, setShowAddressSheet, setActiveTab } = context;

  const t = {
    ar: {
      welcome: "مرحباً بك في سبيد!",
      sub: "أسرع خدمة توصيل في بابل بانتظارك",
      create: "إنشاء حساب جديد",
      login: "تسجيل الدخول",
      guest: "تصفح كضيف فقط",
      fullName: "الاسم الكامل",
      phone: "رقم الهاتف",
      password: "كلمة المرور",
      confirm: "تأكيد وإنشاء الحساب",
      confirmLogin: "تسجيل الدخول",
      back: "رجوع",
      placeholderName: "اكتب اسمك...",
      placeholderPhone: "07XXXXXXXX",
      placeholderPass: "••••••••",
      wait: "جاري المعالجة...",
      locationTitle: "أين أنت الآن؟",
      locationSub: "نحتاج لموقعك لضمان سرعة التوصيل",
      locationLabel: "تسمية الموقع (مثلاً: منزلي)",
      locationPhone: "رقم الهاتف للتوصيل",
      locationGPS: "موقع التوصيل (GPS)",
      locationBtn: "اضغط لتحديد موقعك بدقة",
      locationConfirm: "تأكيد العنوان والمتابعة",
      locationSuccess: "تم تحديد الموقع ✅",
      privacyNotice: "بمجرد حفظ العنوان، فأنت توافق على",
      privacyLink: "سياسة الخصوصية"
    },
    en: {
      welcome: "Welcome to SPEED!",
      sub: "Fastest delivery in Babylon awaits you",
      create: "Create New Account",
      login: "Log In",
      guest: "Browse as Guest",
      fullName: "Full Name",
      phone: "Phone Number",
      password: "Password",
      confirm: "Confirm & Register",
      confirmLogin: "Log In Now",
      back: "Back",
      placeholderName: "Enter your name...",
      placeholderPhone: "07XXXXXXXX",
      placeholderPass: "••••••••",
      wait: "Processing...",
      locationTitle: "Where are you?",
      locationSub: "We need your location for fast delivery",
      locationLabel: "Location Label (e.g. Home)",
      locationPhone: "Contact Phone Number",
      locationGPS: "Delivery Location (GPS)",
      locationBtn: "Click to pinpoint location",
      locationConfirm: "Confirm Address & Continue",
      locationSuccess: "Location pinned ✅",
      privacyNotice: "By saving, you agree to our",
      privacyLink: "Privacy Policy"
    }
  }[lang];

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
      } else {
          setShowAuthPrompt(false);
      }
    }
  }, [showSplash, settings?.isMaintenanceMode, userId]);

  const handleRegister = async () => {
    if (!authData.name || !authData.phone || !authData.password) {
        toast({ title: lang === 'ar' ? "يرجى ملء جميع الحقول" : "Please fill all fields", variant: "destructive" });
        return;
    }
    const phoneRegex = /^07[789]\d{8}$/;
    if (!phoneRegex.test(authData.phone)) {
        toast({ title: lang === 'ar' ? "رقم الهاتف غير صحيح" : "Invalid phone number", variant: "destructive" });
        return;
    }

    setIsAuthProcessing(true);
    const success = await register(authData.name, authData.phone, authData.password);
    if (success) setShowAuthPrompt(false);
    setIsAuthProcessing(false);
  };

  const handleLogin = async () => {
    if (!authData.phone || !authData.password) {
        toast({ title: lang === 'ar' ? "يرجى ملء جميع الحقول" : "Please fill all fields", variant: "destructive" });
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
    <div className="h-[100dvh] w-full bg-background flex flex-col relative overflow-hidden" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
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
            <SheetContent side="bottom" className="h-full sm:h-[85vh] p-0 bg-background rounded-t-[3.5rem] overflow-hidden border-none shadow-2xl">
                <div className="p-8 space-y-8 h-full overflow-y-auto pb-20">
                    <div className={lang === 'ar' ? 'text-right' : 'text-left'}>
                        <div className="flex items-center justify-between mb-2">
                             <div className={`p-4 bg-primary/10 rounded-[1.5rem] ${lang === 'ar' ? 'order-2' : 'order-1'}`}><LogIn className="h-8 w-8 text-primary animate-pulse" /></div>
                             <button 
                                onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
                                className="h-10 px-4 bg-muted/40 rounded-xl font-black text-xs gap-2 flex items-center border shadow-sm active:scale-90 transition-all"
                             >
                                <Languages className="h-4 w-4" />
                                {lang === 'ar' ? 'EN' : 'العربية'}
                             </button>
                        </div>
                        <div className="mt-4">
                            <SheetTitle className="text-3xl font-black">{t.welcome}</SheetTitle>
                            <p className="text-muted-foreground font-bold text-sm">{t.sub}</p>
                        </div>
                    </div>

                    {authMode === 'start' && (
                        <div className="space-y-6 pt-10">
                            <Button onClick={() => setAuthMode('register')} className="w-full h-20 rounded-[2rem] text-2xl font-black gap-3 shadow-xl"><UserPlus className="h-7 w-7"/> {t.create}</Button>
                            <Button onClick={() => setAuthMode('login')} variant="outline" className="w-full h-20 rounded-[2rem] text-2xl font-black gap-3 border-2"><LogIn className="h-7 w-7"/> {t.login}</Button>
                            <Button onClick={handleGuest} variant="ghost" className="w-full h-14 rounded-2xl text-lg font-bold text-muted-foreground">{t.guest}</Button>
                        </div>
                    )}

                    {authMode === 'register' && (
                        <div className={`space-y-5 animate-in slide-in-from-left-4 duration-300 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                             <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-400 px-1">{t.fullName}</label>
                                <div className="relative">
                                    <User className={`absolute top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground ${lang === 'ar' ? 'right-4' : 'left-4'}`}/>
                                    <Input 
                                        value={authData.name} 
                                        onChange={(e)=>setAuthData({...authData, name: e.target.value})} 
                                        placeholder={t.placeholderName} 
                                        className={`h-14 rounded-2xl bg-muted/30 border-none text-lg font-bold ${lang === 'ar' ? 'pr-12' : 'pl-12'}`} 
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-400 px-1">{t.phone}</label>
                                <div className="relative">
                                    <Smartphone className={`absolute top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground ${lang === 'ar' ? 'right-4' : 'left-4'}`}/>
                                    <Input 
                                        value={authData.phone} 
                                        onChange={(e)=>setAuthData({...authData, phone: e.target.value})} 
                                        placeholder={t.placeholderPhone} 
                                        type="tel" 
                                        className={`h-14 rounded-2xl bg-muted/30 border-none text-center text-xl font-black tracking-widest ${lang === 'ar' ? 'pr-12' : 'pl-12'}`} 
                                        dir="ltr" 
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-400 px-1">{t.password}</label>
                                <div className="relative">
                                    <KeyRound className={`absolute top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground ${lang === 'ar' ? 'right-4' : 'left-4'}`}/>
                                    <Input 
                                        value={authData.password} 
                                        onChange={(e)=>setAuthData({...authData, password: e.target.value})} 
                                        placeholder={t.placeholderPass} 
                                        type="password" 
                                        className={`h-14 rounded-2xl bg-muted/30 border-none text-center text-xl font-black ${lang === 'ar' ? 'pr-12' : 'pl-12'}`} 
                                        dir="ltr" 
                                    />
                                </div>
                            </div>
                            <Button onClick={handleRegister} className="w-full h-20 rounded-[2.5rem] text-2xl font-black mt-4 shadow-xl" disabled={isAuthProcessing}>
                                {isAuthProcessing ? <Loader2 className="animate-spin h-7 w-7"/> : t.confirm}
                            </Button>
                            <Button onClick={() => setAuthMode('start')} variant="ghost" className="w-full text-muted-foreground font-bold">{t.back}</Button>
                        </div>
                    )}

                    {authMode === 'login' && (
                        <div className={`space-y-5 animate-in slide-in-from-right-4 duration-300 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-400 px-1">{t.phone}</label>
                                <div className="relative">
                                    <Smartphone className={`absolute top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground ${lang === 'ar' ? 'right-4' : 'left-4'}`}/>
                                    <Input 
                                        value={authData.phone} 
                                        onChange={(e)=>setAuthData({...authData, phone: e.target.value})} 
                                        placeholder={t.placeholderPhone} 
                                        type="tel" 
                                        className={`h-14 rounded-2xl bg-muted/30 border-none text-center text-xl font-black tracking-widest ${lang === 'ar' ? 'pr-12' : 'pl-12'}`} 
                                        dir="ltr" 
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-400 px-1">{t.password}</label>
                                <div className="relative">
                                    <KeyRound className={`absolute top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground ${lang === 'ar' ? 'right-4' : 'left-4'}`}/>
                                    <Input 
                                        value={authData.password} 
                                        onChange={(e)=>setAuthData({...authData, password: e.target.value})} 
                                        placeholder={t.placeholderPass} 
                                        type="password" 
                                        className={`h-14 rounded-2xl bg-muted/30 border-none text-center text-xl font-black ${lang === 'ar' ? 'pr-12' : 'pl-12'}`} 
                                        dir="ltr" 
                                    />
                                </div>
                            </div>
                            <Button onClick={handleLogin} className="w-full h-20 rounded-[2.5rem] text-2xl font-black mt-4 shadow-xl" disabled={isAuthProcessing}>
                                {isAuthProcessing ? <Loader2 className="animate-spin h-7 w-7"/> : t.confirmLogin}
                            </Button>
                            <Button onClick={() => setAuthMode('start')} variant="ghost" className="w-full text-muted-foreground font-bold">{t.back}</Button>
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>

        {/* واجهة العنوان الإلزامية فقط عند الطلب */}
        <Sheet open={showAddressSheet} onOpenChange={setShowAddressSheet}>
            <SheetContent side="bottom" className="h-full sm:h-[85vh] p-0 bg-background rounded-t-[3.5rem] overflow-hidden border-none shadow-2xl">
                <div className={`p-8 space-y-8 h-full overflow-y-auto pb-20 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                    <div className="flex items-center gap-4 py-4 flex-row-reverse">
                        <div className="p-4 bg-primary/10 rounded-[1.5rem]"><MapPin className="h-8 w-8 text-primary animate-pulse" /></div>
                        <div className={lang === 'ar' ? 'text-right' : 'text-left'}>
                            <SheetTitle className="text-3xl font-black">{t.locationTitle}</SheetTitle>
                            <p className="text-muted-foreground font-bold text-sm">{t.locationSub}</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-400 px-1">{t.locationLabel}</label>
                                <Input 
                                    value={newAddr.name} 
                                    onChange={(e)=>setNewAddr({...newAddr, name: e.target.value})} 
                                    placeholder={lang === 'ar' ? "المنزل، العمل..." : "Home, Work..."} 
                                    className={`h-14 rounded-2xl bg-muted/30 border-none text-lg font-bold ${lang === 'ar' ? 'text-right' : 'text-left'}`} 
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-400 px-1">{t.locationPhone}</label>
                                <Input 
                                    value={newAddr.phone} 
                                    onChange={(e)=>setNewAddr({...newAddr, phone: e.target.value})} 
                                    placeholder={t.placeholderPhone} 
                                    type="tel" 
                                    className="h-14 rounded-2xl bg-muted/30 border-none text-center text-xl font-black tracking-widest" 
                                    dir="ltr" 
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                             <label className="text-[10px] font-black uppercase text-slate-400 px-1">{t.locationGPS}</label>
                             <button onClick={handleGetLocation} className={`w-full py-10 flex flex-col items-center gap-3 border-4 border-dashed rounded-[3rem] transition-all active:scale-95 ${newAddr.lat !== 0 ? 'border-green-500 bg-green-50' : 'border-primary/20 bg-card hover:bg-primary/5'}`}>
                                {islocLoading ? <Loader2 className="animate-spin h-10 w-10 text-primary" /> : newAddr.lat !== 0 ? <CheckCircle2 className="h-10 w-10 text-green-500" /> : <MapPin className="h-10 w-10 text-primary" />}
                                <span className="font-black">{newAddr.lat !== 0 ? t.locationSuccess : t.locationBtn}</span>
                             </button>
                        </div>

                        <Button onClick={handleSaveAddress} className="w-full h-20 rounded-[2.5rem] text-2xl font-black shadow-2xl" disabled={isSaving || newAddr.lat === 0 || !newAddr.name || !newAddr.phone}>
                            {isSaving ? t.wait : t.locationConfirm}
                        </Button>
                        <p className="text-center text-[10px] text-muted-foreground font-bold px-10">
                            {t.privacyNotice} <button type="button" onClick={()=>setActiveTab(8)} className="text-primary border-b border-primary/20">{t.privacyLink}</button>.
                        </p>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    </div>
  );
}
