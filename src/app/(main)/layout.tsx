"use client";

import { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { BottomNav } from '@/components/BottomNav';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useAddresses } from '@/hooks/useAddresses';
import { HardHat, Loader2, MapPin, AlertCircle, ShoppingBag, CheckCircle2, Navigation, Building2, Ghost } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { isLocationInAllowedZones, getZoneNameFromCoordinates } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { AppContext } from '@/contexts/AppContext';
import { useDeliveryZones } from '@/hooks/useDeliveryZones';
import { useBranches } from '@/hooks/useBranches';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';

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
  const { settings, isLoading: settingsLoading } = useAppSettings();
  const { addresses, addAddress } = useAddresses();
  const { deliveryZones } = useDeliveryZones();
  const { branches } = useBranches();
  const { toast } = useToast();
  
  const [showAddressPrompt, setShowAddressPrompt] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [newAddr, setNewAddr] = useState({ name: '', phone: '', details: '', lat: 0, lng: 0, selectedBranch: '', detectedZone: '' });
  const [islocLoading, setIslocLoading] = useState(false);
  const [forceHideLoading, setForceHideLoading] = useState(false);

  if (!context) return null;
  const { activeTab, setActiveTab } = context;

  // مؤقت أمان قسري: إخفاء شاشة التحميل الخضراء بعد 3 ثوانٍ مهما حدث لضمان عدم التعليق
  useEffect(() => {
    const timer = setTimeout(() => {
        setForceHideLoading(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    try {
        (window as any).updateLocationFromFlutter = (lat: number, lng: number) => {
            if (!isLocationInAllowedZones(lat, lng)) {
              setIsBlocked(true);
              setShowAddressPrompt(false);
            } else {
              setNewAddr(prev => ({ ...prev, lat: lat, lng: lng }));
              toast({ title: "تم تحديث موقعك بنجاح ✅" });
            }
            setIslocLoading(false);
        };
    } catch (e) {}
    return () => { try { delete (window as any).updateLocationFromFlutter; } catch(e) {} };
  }, [toast]);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      try {
          if (event.state && typeof event.state.tab === 'number') {
            setActiveTab(event.state.tab, false);
          } else {
            setActiveTab(0, false);
          }
      } catch (e) {}
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [setActiveTab]);

  useEffect(() => {
    if (!settingsLoading && !settings?.isMaintenanceMode && addresses.length === 0) {
      setShowAddressPrompt(true);
    }
  }, [settingsLoading, settings?.isMaintenanceMode, addresses]);

  const filteredZones = useMemo(() => {
      if (!newAddr.selectedBranch) return [];
      return deliveryZones.filter(z => z.branchId === newAddr.selectedBranch);
  }, [newAddr.selectedBranch, deliveryZones]);

  const handleGetLocation = useCallback(() => {
    setIslocLoading(true);
    
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                try {
                    const { latitude, longitude } = position.coords;
                    if (!isLocationInAllowedZones(latitude, longitude)) {
                        setIsBlocked(true);
                        setShowAddressPrompt(false);
                    } else {
                        setNewAddr(prev => ({ ...prev, lat: latitude, lng: longitude }));
                        toast({ title: "تم تحديد موقعك بدقة بنجاح 🛰️" });
                    }
                } catch(e) {}
                setIslocLoading(false);
            },
            (error) => {
                if (window.parent) {
                    try {
                        window.parent.postMessage('REQUEST_LOCATION', '*');
                    } catch(e) {}
                }
                toast({ 
                    title: "يرجى تفعيل الموقع", 
                    description: "فشل الوصول للموقع التلقائي، تأكد من تفعيل الـ GPS.", 
                    variant: "destructive" 
                });
                setIslocLoading(false);
            },
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
        );
    } else {
        toast({ title: "المتصفح لا يدعم تحديد الموقع", variant: "destructive" });
        setIslocLoading(false);
    }
  }, [toast]);

  const handleSaveAddress = () => {
    if (!newAddr.name || !newAddr.phone || !newAddr.selectedBranch || !newAddr.detectedZone) {
      toast({ title: "بيانات ناقصة", variant: "destructive" });
      return;
    }
    if (newAddr.lat === 0) {
        toast({ title: "الموقع مطلوب", description: "يرجى الضغط على زر تحديد الموقع أولاً.", variant: "destructive" });
        return;
    }
    addAddress({
      name: newAddr.name,
      phone: newAddr.phone,
      deliveryZone: newAddr.detectedZone,
      details: newAddr.details,
      latitude: newAddr.lat,
      longitude: newAddr.lng,
      branchId: newAddr.selectedBranch
    });
    setShowAddressPrompt(false);
    toast({ title: "أهلاً بك في سبيد شوب!" });
  };

  const isActuallyLoading = settingsLoading && !forceHideLoading;

  if (isActuallyLoading) {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-[#00b358] animate-in fade-in duration-300">
            <h1 className="text-6xl font-black text-white italic tracking-tighter drop-shadow-[0_4px_4px_rgba(0,0,0,0.25)] select-none">
              Speed Shop
            </h1>
            <div className="mt-16 flex gap-3">
                <div className="h-2.5 w-2.5 bg-white/90 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="h-2.5 w-2.5 bg-white/90 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="h-2.5 w-2.5 bg-white/90 rounded-full animate-bounce" />
            </div>
        </div>
    );
  }

  const content = (
    <div className="overflow-guard flex flex-col h-full w-full">
      <main className="flex-1 relative z-0">
        <div 
          className="spa-stack-container" 
          style={{ transform: `translateX(${activeTab * 100}%)` }} 
        >
          <div className="spa-page-view"><HomePage /></div>
          <div className="spa-page-view"><RestaurantsPage /></div>
          <div className="spa-page-view"><ProductsPage /></div>
          <div className="spa-page-view"><CartPage /></div>
          <div className="spa-page-view"><OrdersPage /></div>
          <div className="spa-page-view"><AccountPage /></div>
          <div className="spa-page-view"><AddAddressPage /></div>
          <div className="spa-page-view"><SupportPage /></div>
          <div className="spa-page-view"><PrivacyPolicyPage /></div>
          <div className="spa-page-view"><ProductDetailPage /></div>
          <div className="spa-page-view"><RestaurantProductsPage /></div>
        </div>
      </main>
      <BottomNav />
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-slate-100 flex justify-center items-center p-0 sm:p-4 overflow-hidden">
      <div className="w-full max-w-[480px] h-[100dvh] sm:h-[850px] sm:max-h-[95vh] flex flex-col bg-card shadow-2xl relative overflow-hidden sm:rounded-[3rem] sm:border-[8px] sm:border-white">
        {isBlocked ? (
            <div className="flex h-full w-full flex-col items-center justify-center bg-background p-8 text-center">
              <AlertCircle className="h-24 w-24 text-destructive mb-6" />
              <h1 className="text-3xl font-black mb-4 text-primary">نعتذر منك جداً</h1>
              <p className="text-muted-foreground text-xl leading-relaxed">
                تطبيق سبيد شوب مخصص حالياً لخدمة مناطق <br/><span className="text-foreground font-black underline">(المدحتية، الهاشمية، القاسم)</span> فقط.
              </p>
              <button onClick={() => setIsBlocked(false)} className="mt-8 px-6 py-3 border-2 border-primary text-primary font-black rounded-xl active:scale-95 transition-all">رجوع للمحاولة ثانية</button>
            </div>
        ) : settings?.isMaintenanceMode ? (
            <div className="flex h-full w-full flex-col items-center justify-center bg-background p-10 text-center animate-in zoom-in duration-500">
                <div className="p-8 bg-primary/5 rounded-full mb-8 relative">
                   <HardHat className="h-24 w-24 text-primary animate-bounce"/>
                   <Ghost className="h-8 w-8 text-primary/40 absolute top-4 right-4 animate-pulse" />
                </div>
                <h1 className="text-3xl font-black mb-4 text-primary leading-tight">عذراً، المتجر في استراحة قصيرة</h1>
                <div className="p-6 bg-muted/30 rounded-[2rem] border-2 border-dashed border-primary/20 w-full">
                    <p className="text-foreground font-bold text-lg leading-relaxed">
                        {settings.maintenanceMessage || "نعمل حالياً على تحسين بعض الخدمات لنقدم لكم تجربة أفضل. سنعود للعمل خلال وقت قصير جداً!"}
                    </p>
                </div>
                <p className="mt-10 text-xs font-black text-muted-foreground/60 uppercase tracking-widest">Speed Shop Operations</p>
            </div>
        ) : content}

        <Sheet open={showAddressPrompt} onOpenChange={() => {}}>
            <SheetContent side="bottom" className="h-[85vh] max-h-[90vh] w-full p-0 border-none shadow-none flex flex-col bg-background rounded-t-[3.5rem]">
            <div className="flex-1 overflow-y-auto px-6 pt-8 pb-4 space-y-6 scrollbar-hide">
                <SheetHeader className="text-right pb-2">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-2xl shadow-inner"><Navigation className="h-7 w-7 text-primary animate-pulse" /></div>
                        <div>
                            <SheetTitle className="text-2xl font-black text-primary leading-tight">معلومات التوصيل</SheetTitle>
                            <p className="text-muted-foreground text-xs font-bold mt-1">يرجى ملء بياناتك لضمان وصول طلباتك بدقة.</p>
                        </div>
                    </div>
                </SheetHeader>
                
                <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label className="text-[10px] font-black pr-1 uppercase text-muted-foreground">الاسم بالكامل</Label>
                            <Input value={newAddr.name} onChange={(e) => setNewAddr({...newAddr, name: e.target.value})} placeholder="اكتب اسمك..." className="h-12 rounded-xl text-sm font-bold shadow-sm" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px] font-black pr-1 uppercase text-muted-foreground">رقم الهاتف</Label>
                            <Input value={newAddr.phone} onChange={(e) => setNewAddr({...newAddr, phone: e.target.value})} placeholder="07XXXXXXXX" type="tel" dir="ltr" className="h-12 rounded-xl text-sm font-bold shadow-sm" />
                        </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                        <div className="space-y-1">
                            <Label className="text-[10px] font-black pr-1 text-primary">1. اختر المدينة (الفرع)</Label>
                            <Select value={newAddr.selectedBranch} onValueChange={(val) => setNewAddr({...newAddr, selectedBranch: val, detectedZone: ''})}>
                                <SelectTrigger className="h-14 rounded-2xl text-lg font-black border-2 border-primary/20 bg-primary/5">
                                    <SelectValue placeholder="اختر مدينتك..." />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl">
                                    <SelectItem value="main" className="font-bold">المركز الرئيسي (المدحتية - الهاشمية)</SelectItem>
                                    {branches.map(b => <SelectItem key={b.id} value={b.id} className="font-bold">{b.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        {newAddr.selectedBranch && (
                            <div className="space-y-1 animate-in slide-in-from-top-2 duration-300">
                                <Label className="text-[10px] font-black pr-1 text-primary">2. اختر منطقتك / الحي</Label>
                                <Select value={newAddr.detectedZone} onValueChange={(val) => setNewAddr({...newAddr, detectedZone: val})}>
                                    <SelectTrigger className="h-14 rounded-2xl text-lg font-black border-2 border-primary/20">
                                        <SelectValue placeholder="اختر الحي السكني..." />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl">
                                        {filteredZones.map(z => <SelectItem key={z.id} value={z.name} className="font-bold">{z.name}</SelectItem>)}
                                        {filteredZones.length === 0 && <div className="p-4 text-center text-xs font-bold italic">لا توجد مناطق مضافة لهذا الفرع.</div>}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>

                    <div className="pt-2">
                        <button 
                            onClick={handleGetLocation} 
                            type="button"
                            className={`w-full py-6 flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-[2.5rem] transition-all ${newAddr.lat !== 0 ? 'border-green-500 bg-green-50 shadow-inner' : 'border-primary/40 bg-card hover:bg-primary/5'}`}
                            disabled={islocLoading}
                        >
                            {islocLoading ? (
                                <><Loader2 className="animate-spin h-8 w-8 text-primary" /> <span className="font-black text-primary text-sm">جارِ تحديد موقعك...</span></>
                            ) : newAddr.lat !== 0 ? (
                                <><CheckCircle2 className="h-8 w-8 text-green-500" /> <span className="font-black text-green-600 text-sm">تم استلام الموقع بنجاح ✅</span></>
                            ) : (
                                <><MapPin className="h-8 w-8 text-primary" /> <span className="font-black text-primary text-sm">اضغط لتحديد موقعك المباشر</span></>
                            )}
                        </button>
                    </div>
                </div>
            </div>
            <div className="p-6 bg-background border-t">
                <Button 
                    onClick={handleSaveAddress} 
                    className="w-full py-8 text-2xl font-black rounded-3xl shadow-2xl shadow-primary/30" 
                    disabled={islocLoading || !newAddr.detectedZone || newAddr.lat === 0}
                >
                    تأكيد والبدء بالتسوق
                </Button>
            </div>
            </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
