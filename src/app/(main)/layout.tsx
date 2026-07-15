
"use client";

import { useState, useEffect, useContext } from 'react';
import { BottomNav } from '@/components/BottomNav';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useAddresses } from '@/hooks/useAddresses';
import { HardHat, Loader2, MapPin, AlertCircle, ShoppingBag, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { isLocationInAllowedZones, getZoneNameFromCoordinates } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { AppContext } from '@/contexts/AppContext';
import { useDeliveryZones } from '@/hooks/useDeliveryZones';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  const { toast } = useToast();
  
  const [showAddressPrompt, setShowAddressPrompt] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [newAddr, setNewAddr] = useState({ name: '', phone: '', details: '', lat: 0, lng: 0, detectedZone: '' });
  const [islocLoading, setIslocLoading] = useState(false);

  if (!context) return null;
  const { activeTab } = context;

  useEffect(() => {
    if (!settingsLoading && addresses.length === 0) {
      setShowAddressPrompt(true);
    }
  }, [settingsLoading, addresses]);

  const handleGetLocation = () => {
    setIslocLoading(true);
    if (!navigator.geolocation) {
      toast({ title: "الموقع غير مدعوم", variant: "destructive" });
      setIslocLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (!isLocationInAllowedZones(latitude, longitude)) {
          setIsBlocked(true);
          setShowAddressPrompt(false);
        } else {
          const zoneName = getZoneNameFromCoordinates(latitude, longitude);
          toast({ title: "تم التحديد بنجاح", description: `منطقتك: ${zoneName}` });
          setNewAddr(prev => ({ ...prev, lat: latitude, lng: longitude, detectedZone: zoneName }));
        }
        setIslocLoading(false);
      },
      () => {
        toast({ title: "فشل تحديد الموقع", description: "يرجى تفعيل GPS وإعطاء الإذن للمتصفح.", variant: "destructive" });
        setIslocLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const handleSaveAddress = () => {
    if (!newAddr.name || !newAddr.phone || !newAddr.detectedZone) {
      toast({ title: "بيانات ناقصة", description: "يرجى اختيار منطقتك وكتابة اسمك ورقمك.", variant: "destructive" });
      return;
    }
    if (newAddr.lat === 0) {
        toast({ title: "الموقع مطلوب", description: "يجب تحديد الموقع الجغرافي GPS للمتابعة.", variant: "destructive" });
        return;
    }
    addAddress({
      name: newAddr.name,
      phone: newAddr.phone,
      deliveryZone: newAddr.detectedZone,
      details: newAddr.details,
      latitude: newAddr.lat,
      longitude: newAddr.lng
    });
    setShowAddressPrompt(false);
    toast({ title: "أهلاً بك في سبيد!" });
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
    <>
      <main className="flex-1 relative z-0 overflow-hidden">
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
    </>
  );

  return (
    <div className="min-h-screen w-full bg-slate-100 flex justify-center items-center p-0 sm:p-4">
      <div className="w-full max-w-[480px] h-full sm:h-[850px] sm:max-h-[95vh] flex flex-col bg-card shadow-2xl relative overflow-hidden sm:rounded-[3rem] border-[8px] border-white">
        {isBlocked ? (
            <div className="flex h-full w-full flex-col items-center justify-center bg-background p-8 text-center animate-in fade-in zoom-in duration-500">
              <AlertCircle className="h-24 w-24 text-destructive mb-6" />
              <h1 className="text-3xl font-black mb-4 text-primary">نعتذر منك جداً</h1>
              <p className="text-muted-foreground text-xl leading-relaxed">
                تطبيق سبيد شوب مخصص حالياً لخدمة مناطق <br/><span className="text-foreground font-black underline">(المدحتية، الهاشمية، القاسم)</span> فقط.
                <br/> سنصل إليك قريباً!
              </p>
            </div>
        ) : settings?.isMaintenanceMode ? (
            <div className="flex h-full w-full flex-col items-center justify-center bg-muted/40 p-4 text-center">
                <HardHat className="h-20 w-20 text-primary mb-6 animate-bounce"/>
                <h1 className="text-3xl font-bold mb-2 text-primary">نحن في صيانة قصيرة</h1>
                <p className="text-muted-foreground text-lg">نعمل على تحسين الخدمة. سنعود خلال دقائق!</p>
            </div>
        ) : content}

        <Sheet open={showAddressPrompt} onOpenChange={() => {}}>
            <SheetContent side="bottom" className="h-auto max-h-[90vh] w-full p-0 border-none shadow-none flex flex-col bg-background rounded-t-[3rem]">
            <div className="flex-1 overflow-y-auto px-6 pt-6 pb-4 space-y-4">
                <SheetHeader className="text-right pb-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-xl"><ShoppingBag className="h-5 w-5 text-primary" /></div>
                        <div>
                            <SheetTitle className="text-lg font-black text-primary leading-none">أهلاً بك في سبيد!</SheetTitle>
                            <p className="text-muted-foreground text-[10px] mt-1">حدد موقعك لمرة واحدة فقط للبدء بالطلب.</p>
                        </div>
                    </div>
                </SheetHeader>
                
                <div className="space-y-3">
                    <div className="space-y-1">
                        <Label className="text-[11px] font-bold pr-1">الاسم الثلاثي</Label>
                        <Input value={newAddr.name} onChange={(e) => setNewAddr({...newAddr, name: e.target.value})} placeholder="اكتب اسمك..." className="h-11 rounded-xl" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[11px] font-bold pr-1">رقم الهاتف</Label>
                        <Input value={newAddr.phone} onChange={(e) => setNewAddr({...newAddr, phone: e.target.value})} placeholder="07XXXXXXXX" type="tel" dir="ltr" className="h-11 rounded-xl" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[11px] font-bold pr-1">اختر منطقتك</Label>
                        <Select value={newAddr.detectedZone} onValueChange={(val) => setNewAddr({...newAddr, detectedZone: val})}>
                            <SelectTrigger className="h-11 rounded-xl">
                                <SelectValue placeholder="اختر المنطقة السكنية..." />
                            </SelectTrigger>
                            <SelectContent>
                                {deliveryZones.map(z => <SelectItem key={z.id} value={z.name}>{z.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[11px] font-bold pr-1">نقطة دالة (اختياري)</Label>
                        <Input value={newAddr.details} onChange={(e) => setNewAddr({...newAddr, details: e.target.value})} placeholder="مثال: قرب مسجد التقوى" className="h-11 rounded-xl" />
                    </div>
                    <div className="pt-2">
                        <button 
                            onClick={handleGetLocation} 
                            className={`w-full py-4 flex flex-row items-center justify-center gap-3 border-2 border-dashed rounded-2xl transition-all ${newAddr.lat !== 0 ? 'border-green-500 bg-green-50' : 'border-primary/40 bg-card'}`}
                            disabled={islocLoading}
                        >
                        {islocLoading ? <><Loader2 className="animate-spin h-5 w-5 text-primary" /> <span className="font-bold">جارِ التحقق...</span></> : 
                        newAddr.lat !== 0 ? <><CheckCircle2 className="h-5 w-5 text-green-500" /> <span className="font-bold text-green-600">تم تحديد الموقع بنجاح</span></> : 
                        <><MapPin className="h-5 w-5 text-primary" /> <span className="font-bold text-primary">تحديد الموقع الجغرافي (GPS)</span></>}
                        </button>
                    </div>
                </div>
            </div>
            <div className="p-4 bg-background border-t">
                <Button onClick={handleSaveAddress} className="w-full py-7 text-xl font-black rounded-2xl shadow-xl shadow-primary/20" disabled={islocLoading}>حفظ وابدأ التسوق</Button>
            </div>
            </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
