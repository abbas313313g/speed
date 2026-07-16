"use client";

import { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { BottomNav } from '@/components/BottomNav';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useAddresses } from '@/hooks/useAddresses';
import { HardHat, Loader2, MapPin, AlertCircle, ShoppingBag, CheckCircle2, Navigation, Building2 } from 'lucide-react';
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

  if (!context) return null;
  const { activeTab } = context;

  useEffect(() => {
    if (!settingsLoading && addresses.length === 0) {
      setShowAddressPrompt(true);
    }
  }, [settingsLoading, addresses]);

  const filteredZones = useMemo(() => {
      if (!newAddr.selectedBranch) return [];
      return deliveryZones.filter(z => z.branchId === newAddr.selectedBranch);
  }, [newAddr.selectedBranch, deliveryZones]);

  const handleGetLocation = useCallback(() => {
    setIslocLoading(true);
    setNewAddr(prev => ({ ...prev, lat: 0, lng: 0 }));

    if (!navigator.geolocation) {
      toast({ title: "عذراً، متصفحك لا يدعم تحديد الموقع", variant: "destructive" });
      setIslocLoading(false);
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (!isLocationInAllowedZones(latitude, longitude)) {
          setIsBlocked(true);
          setShowAddressPrompt(false);
        } else {
          toast({ title: "تم تحديد موقعك بدقة 🛰️" });
          setNewAddr(prev => ({ ...prev, lat: latitude, lng: longitude }));
        }
        setIslocLoading(false);
      },
      (err) => {
        toast({ title: "فشل تحديد الموقع", description: "يرجى تفعيل الـ GPS وإعطاء الإذن للمتصفح.", variant: "destructive" });
        setIslocLoading(false);
      },
      options
    );
  }, [toast]);

  const handleSaveAddress = () => {
    if (!newAddr.name || !newAddr.phone || !newAddr.selectedBranch || !newAddr.detectedZone) {
      toast({ title: "بيانات ناقصة", description: "يرجى إكمال جميع الحقول المطلوبة.", variant: "destructive" });
      return;
    }
    if (newAddr.lat === 0) {
        toast({ title: "الموقع مطلوب", description: "يجب الضغط على زر تحديد الموقع للمتابعة.", variant: "destructive" });
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

  if (settingsLoading) {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
            <Loader2 className="h-10 w-10 animate-spin text-primary"/>
            <p className="mt-4 text-muted-foreground animate-pulse font-bold">جارِ التشغيل...</p>
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
      <div className="h-20 shrink-0"><BottomNav /></div>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-slate-100 flex justify-center items-center p-0 sm:p-4 overflow-hidden">
      <div className="w-full max-w-[480px] h-[100dvh] sm:h-[850px] sm:max-h-[95vh] flex flex-col bg-card shadow-2xl relative overflow-hidden sm:rounded-[3rem] sm:border-[8px] sm:border-white">
        {isBlocked ? (
            <div className="flex h-full w-full flex-col items-center justify-center bg-background p-8 text-center animate-in fade-in zoom-in duration-500">
              <AlertCircle className="h-24 w-24 text-destructive mb-6" />
              <h1 className="text-3xl font-black mb-4 text-primary">نعتذر منك جداً</h1>
              <p className="text-muted-foreground text-xl leading-relaxed">
                تطبيق سبيد شوب مخصص حالياً لخدمة مناطق <br/><span className="text-foreground font-black underline">(المدحتية، الهاشمية، القاسم)</span> فقط.
                <br/> سنصل إليك قريباً!
              </p>
              <Button onClick={() => setIsBlocked(false)} variant="outline" className="mt-8 rounded-xl">رجوع للمحاولة ثانية</Button>
            </div>
        ) : settings?.isMaintenanceMode ? (
            <div className="flex h-full w-full flex-col items-center justify-center bg-muted/40 p-4 text-center">
                <HardHat className="h-20 w-20 text-primary mb-6 animate-bounce"/>
                <h1 className="text-3xl font-bold mb-2 text-primary">نحن في صيانة قصيرة</h1>
                <p className="text-muted-foreground text-lg">نعمل على تحسين الخدمة. سنعود خلال دقائق!</p>
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
                                <><Loader2 className="animate-spin h-8 w-8 text-primary" /> <span className="font-black text-primary text-sm">جارِ الاتصال بالأقمار الصناعية...</span></>
                            ) : newAddr.lat !== 0 ? (
                                <><CheckCircle2 className="h-8 w-8 text-green-500" /> <span className="font-black text-green-600 text-sm">تم تحديد إحداثياتك بنجاح ✅</span></>
                            ) : (
                                <><MapPin className="h-8 w-8 text-primary" /> <span className="font-black text-primary text-sm">اضغط لتأكيد موقعك على الخريطة</span></>
                            )}
                        </button>
                    </div>
                </div>
            </div>
            <div className="p-6 bg-background border-t">
                <Button 
                    onClick={handleSaveAddress} 
                    className="w-full py-8 text-2xl font-black rounded-3xl shadow-2xl shadow-primary/30 transition-all hover:scale-[1.02] active:scale-95" 
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
