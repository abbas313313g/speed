
"use client";

import { useState, useEffect, useContext } from 'react';
import { BottomNav } from '@/components/BottomNav';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useAddresses } from '@/hooks/useAddresses';
import { HardHat, AlertCircle, Navigation, MapPin, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { isLocationInAllowedZones, safeStorage } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { AppContext } from '@/contexts/AppContext';

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
  
  const [showAddressPrompt, setShowAddressPrompt] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [newAddr, setNewAddr] = useState({ name: '', phone: '', details: '', lat: 0, lng: 0 });
  const [islocLoading, setIslocLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [visitedTabs, setVisitedTabs] = useState<Set<number>>(() => new Set([0]));

  if (!context) return null;
  const { activeTab, syncUserByPhone, isMainDataReady, addAddress } = context;

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
        const timer = setTimeout(() => setShowSplash(false), 500);
        return () => clearTimeout(timer);
    }
    const fallbackTimer = setTimeout(() => setShowSplash(false), 3000);
    return () => clearTimeout(fallbackTimer);
  }, [isMainDataReady]);

  useEffect(() => {
    if (!showSplash && !settings?.isMaintenanceMode) {
      const userId = safeStorage.get('speedShopUserId');
      const setupDone = safeStorage.get('speedShopSetupDone');
      
      if (!userId || (!setupDone && addresses.length === 0)) {
          setShowAddressPrompt(true);
      }
    }
  }, [showSplash, settings?.isMaintenanceMode, addresses.length]);

  const handleGetLocation = () => {
    setIslocLoading(true);
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                if (!isLocationInAllowedZones(latitude, longitude)) {
                    setIsBlocked(true);
                    setShowAddressPrompt(false);
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
    const phoneRegex = /^07[78]\d{8}$/;
    if (!phoneRegex.test(newAddr.phone)) {
        toast({ 
            title: "رقم هاتف غير مدعوم", 
            description: "نحن ندعم حالياً فقط الأرقام التي تبدأ بـ 077 أو 078 (آسيا سيل أو زين).", 
            variant: "destructive" 
        });
        return;
    }

    if (!newAddr.name || !newAddr.phone || newAddr.lat === 0) {
        toast({ title: "يرجى إكمال البيانات وتحديد الموقع", variant: "destructive" });
        return;
    }
    setIsSaving(true);
    try {
        const syncedUserId = await syncUserByPhone(newAddr.phone);
        
        await addAddress({ 
            name: newAddr.name,
            phone: newAddr.phone,
            details: newAddr.details,
            latitude: newAddr.lat, 
            longitude: newAddr.lng, 
            deliveryZone: "عام", 
            branchId: "main" 
        } as any);

        safeStorage.set('speedShopSetupDone', 'true');
        setShowAddressPrompt(false);
        toast({ title: "مرحباً بك في سبيد شوب! 🎉" });
    } catch (e) { 
        console.error("Layout Save Address Error:", e);
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
                    <p className="text-primary font-black text-[10px] tracking-widest uppercase">أسرع خدمة توصيل</p>
                    <Loader2 className="h-4 w-4 animate-spin text-primary/40 mt-2" />
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
              <div className="mt-10 p-4 border-2 border-dashed rounded-2xl">
                <p className="text-xs font-black text-primary uppercase tracking-widest">تغطيتنا الحالية: جنوب بابل حصراً</p>
              </div>
            </div>
        ) : settings?.isMaintenanceMode ? (
            <div className="flex h-full w-full flex-col items-center justify-center p-10 text-center bg-background">
                <HardHat className="h-20 w-20 text-primary mb-6 animate-bounce"/>
                <h1 className="text-2xl font-black mb-4">التطبيق في صيانة مؤقتة</h1>
                <p className="text-muted-foreground font-bold">{settings.maintenanceMessage || 'سنعود لخدمتكم قريباً جداً!'}</p>
            </div>
        ) : content}

        <Sheet open={showAddressPrompt} onOpenChange={() => {}}>
            <SheetContent side="bottom" className="h-[85vh] p-0 bg-background rounded-t-[3.5rem] overflow-hidden border-none shadow-2xl">
                <div className="p-8 space-y-8 h-full overflow-y-auto pb-20">
                    <div className="flex items-center gap-4 py-4">
                        <div className="p-4 bg-primary/10 rounded-[1.5rem]"><Navigation className="h-8 w-8 text-primary animate-pulse" /></div>
                        <div>
                            <SheetTitle className="text-3xl font-black">أهلاً بك!</SheetTitle>
                            <p className="text-muted-foreground font-bold text-sm">لنبدأ بتجهيز حسابك للتسوق</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black pr-1 uppercase text-slate-400">اسمك الكامل</label>
                                <Input value={newAddr.name} onChange={(e)=>setNewAddr({...newAddr, name: e.target.value})} placeholder="اكتب اسمك هنا..." className="h-14 rounded-2xl bg-muted/30 border-none text-lg font-bold" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black pr-1 uppercase text-slate-400">رقم الهاتف</label>
                                <Input value={newAddr.phone} onChange={(e)=>setNewAddr({...newAddr, phone: e.target.value})} placeholder="07XXXXXXXX" type="tel" className="h-14 rounded-2xl bg-muted/30 border-none text-center text-xl font-black tracking-widest" dir="ltr" />
                                <p className="text-[8px] font-bold text-primary mt-1 text-center italic">* الرقم يجب أن يبدأ بـ 077 أو 078 حصراً</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                             <label className="text-[10px] font-black pr-1 uppercase text-slate-400">موقع التوصيل (GPS عالي الدقة)</label>
                             <button 
                                onClick={handleGetLocation} 
                                className={`w-full py-10 flex flex-col items-center gap-3 border-4 border-dashed rounded-[3rem] transition-all active:scale-95 ${newAddr.lat !== 0 ? 'border-green-500 bg-green-50' : 'border-primary/20 bg-card hover:bg-primary/5'}`}
                             >
                                {islocLoading ? (
                                    <><Loader2 className="animate-spin h-10 w-10 text-primary" /><span className="font-black text-primary">جاري تحديد الإحداثيات بدقة...</span></>
                                ) : newAddr.lat !== 0 ? (
                                    <><CheckCircle2 className="h-10 w-10 text-green-500 animate-in zoom-in" /><span className="font-black text-green-600">تم تثبيت الموقع بنجاح ✅</span></>
                                ) : (
                                    <><MapPin className="h-10 w-10 text-primary" /><span className="font-black text-slate-700">اضغط لتحديد موقعك بدقة</span></>
                                )}
                             </button>
                        </div>

                        <Button 
                            onClick={handleSaveAddress} 
                            className="w-full h-20 rounded-[2.5rem] text-2xl font-black shadow-2xl shadow-primary/30 transition-all active:scale-95" 
                            disabled={isSaving || newAddr.lat === 0 || !newAddr.name || !newAddr.phone}
                        >
                            {isSaving ? "جاري الحفظ..." : "ابدأ التسوق الآن"}
                        </Button>
                        <p className="text-center text-[9px] text-muted-foreground font-bold italic">ملاحظة: نستخدم موقعك فقط لحساب المسافة وضمان وصول الطلب لباب بيتك.</p>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    </div>
  );
}
