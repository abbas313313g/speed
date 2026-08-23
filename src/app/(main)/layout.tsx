
"use client";

import { useState, useEffect, useContext, useCallback } from 'react';
import { BottomNav } from '@/components/BottomNav';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useAddresses } from '@/hooks/useAddresses';
import { HardHat, Loader2, MapPin, AlertCircle, CheckCircle2, Navigation, Ghost, User, Phone, Map } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { isLocationInAllowedZones, safeStorage } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { AppContext } from '@/contexts/AppContext';
import { Separator } from '@/components/ui/separator';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { v4 as uuidv4 } from 'uuid';

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
  const { toast } = useToast();
  
  const [showAddressPrompt, setShowAddressPrompt] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [newAddr, setNewAddr] = useState({ name: '', phone: '', details: '', lat: 0, lng: 0 });
  const [islocLoading, setIslocLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [forceHideLoading, setForceHideLoading] = useState(false);

  if (!context) return null;
  const { activeTab, setActiveTab, syncUserByPhone } = context;

  useEffect(() => {
    const timer = setTimeout(() => {
        setForceHideLoading(true);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!settingsLoading && !settings?.isMaintenanceMode && addresses.length === 0) {
      setShowAddressPrompt(true);
    }
  }, [settingsLoading, settings?.isMaintenanceMode, addresses]);

  const handleGetLocation = useCallback(() => {
    setIslocLoading(true);
    
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
        // إعدادات محسنة للأمان والدقة خاصة لأجهزة iPhone/Safari
        const options = {
            enableHighAccuracy: true, 
            timeout: 10000, 
            maximumAge: 0 
        };

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
                toast({ 
                    title: "يرجى السماح بالوصول للموقع", 
                    description: "تأكد من تفعيل الموقع في إعدادات الخصوصية بجهازك لضمان دقة التوصيل.", 
                    variant: "destructive" 
                });
                setIslocLoading(false);
            },
            options
        );
    } else {
        toast({ title: "المتصفح لا يدعم تحديد الموقع", variant: "destructive" });
        setIslocLoading(false);
    }
  }, [toast]);

  const handleSaveAddress = async () => {
    if (!newAddr.name || !newAddr.phone) {
      toast({ title: "يرجى إكمال البيانات", variant: "destructive" });
      return;
    }
    if (newAddr.lat === 0) {
        toast({ title: "تحديد الموقع مطلوب", variant: "destructive" });
        return;
    }

    setIsSaving(true);
    try {
        let currentDeviceId = safeStorage.get('speedShopDeviceId');
        if (!currentDeviceId) {
            currentDeviceId = uuidv4();
            safeStorage.set('speedShopDeviceId', currentDeviceId);
        }

        const phoneQuery = query(collection(db, "addresses"), where("phone", "==", newAddr.phone), limit(1));
        const phoneSnap = await getDocs(phoneQuery);
        
        if (!phoneSnap.empty) {
            const existingData = phoneSnap.docs[0].data();
            if (existingData.deviceId && existingData.deviceId !== currentDeviceId) {
                toast({ 
                    title: "عذراً، هذا الرقم مسجل مسبقاً", 
                    description: "لا يمكنك استخدام نفس الرقم على أكثر من جهاز واحد.", 
                    variant: "destructive" 
                });
                setIsSaving(false);
                return;
            }
        }

        const existingUserId = await syncUserByPhone(newAddr.phone);
        
        await addAddress({
            name: newAddr.name,
            phone: newAddr.phone,
            deliveryZone: "عام",
            details: newAddr.details,
            latitude: newAddr.lat,
            longitude: newAddr.lng,
            branchId: "main",
            deviceId: currentDeviceId
        } as any);

        setShowAddressPrompt(false);
        if (existingUserId) {
            toast({ title: "أهلاً بك مجدداً! تم استعادة بياناتك سحابياً ☁️" });
        } else {
            toast({ title: "أهلاً بك في سبيد شوب!" });
        }
    } catch (e) {
        toast({ title: "حدث خطأ أثناء الحفظ", variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
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
            <SheetContent side="bottom" className="h-[75vh] w-full p-0 border-none shadow-none flex flex-col bg-background rounded-t-[3.5rem] overflow-hidden">
                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-muted rounded-full" />
                
                <div className="flex-1 overflow-y-auto px-6 pt-10 pb-4 space-y-8 scrollbar-hide">
                    <SheetHeader className="text-right pb-2">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-primary/10 rounded-[1.5rem] shadow-inner">
                                <Navigation className="h-8 w-8 text-primary animate-pulse" />
                            </div>
                            <div>
                                <SheetTitle className="text-3xl font-black text-slate-800 leading-tight">مرحباً بك!</SheetTitle>
                                <p className="text-muted-foreground text-sm font-bold mt-1">لنبدأ بتجهيز معلومات التوصيل الخاصة بك.</p>
                            </div>
                        </div>
                    </SheetHeader>
                    
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2">
                                <User className="h-4 w-4" /> 1. معلوماتك الشخصية
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black pr-1 text-muted-foreground">الاسم الكامل</Label>
                                    <Input 
                                        value={newAddr.name} 
                                        onChange={(e) => setNewAddr({...newAddr, name: e.target.value})} 
                                        placeholder="اكتب اسمك..." 
                                        className="h-14 rounded-2xl text-base font-bold bg-muted/30 border-none shadow-inner focus-visible:ring-primary/50" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black pr-1 text-muted-foreground">رقم الهاتف</Label>
                                    <Input 
                                        value={newAddr.phone} 
                                        onChange={(e) => setNewAddr({...newAddr, phone: e.target.value})} 
                                        placeholder="07XXXXXXXX" 
                                        type="tel" 
                                        dir="ltr" 
                                        className="h-14 rounded-2xl text-base font-bold bg-muted/30 border-none shadow-inner focus-visible:ring-primary/50" 
                                    />
                                </div>
                            </div>
                        </div>

                        <Separator className="opacity-40" />

                        <div className="pt-2">
                            <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2 mb-4">
                                <Map className="h-4 w-4" /> 2. الموقع الجغرافي
                            </h3>
                            <button 
                                onClick={handleGetLocation} 
                                type="button"
                                className={`w-full py-8 flex flex-col items-center justify-center gap-2 border-4 border-dashed rounded-[3rem] transition-all active:scale-95 ${newAddr.lat !== 0 ? 'border-green-500 bg-green-50 shadow-inner' : 'border-primary/20 bg-card hover:bg-primary/5 shadow-sm'}`}
                                disabled={islocLoading}
                            >
                                {islocLoading ? (
                                    <><Loader2 className="animate-spin h-10 w-10 text-primary" /> <span className="font-black text-primary text-base">جارِ تحديد إحداثياتك...</span></>
                                ) : newAddr.lat !== 0 ? (
                                    <><CheckCircle2 className="h-10 w-10 text-green-500 animate-in zoom-in" /> <span className="font-black text-green-600 text-base">تم استلام الموقع بدقة ✅</span></>
                                ) : (
                                    <><MapPin className="h-10 w-10 text-primary" /> <span className="font-black text-slate-700 text-base">اضغط لتحديد موقعك المباشر (GPS)</span></>
                                )}
                            </button>
                            <p className="text-[10px] text-center text-muted-foreground font-bold mt-3 px-4">ملاحظة: استرجاع البيانات سحابياً يتم تلقائياً عبر رقم هاتفك.</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-background border-t shadow-2xl rounded-t-[2.5rem]">
                    <Button 
                        onClick={handleSaveAddress} 
                        className="w-full py-9 text-2xl font-black rounded-[2rem] shadow-xl shadow-primary/30 transition-all active:scale-95" 
                        disabled={islocLoading || isSaving || newAddr.lat === 0}
                    >
                        {isSaving ? <Loader2 className="animate-spin h-6 w-6 mr-2" /> : null}
                        {isSaving ? "جارِ المزامنة السحابية..." : "حفظ وبدء التسوق"}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
